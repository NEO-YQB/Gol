import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { subject } from '@casl/ability';
import { PrismaService } from '../../prisma/prisma.service';
import { AbilityFactory } from '../auth/ability.factory';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  private getEffectiveProductPrice(product: {
    price: number;
    discountPrice?: number | null;
  }) {
    return product.discountPrice ?? product.price;
  }

  async create(user: { id: number; roles: string[] }, dto: CreateOrderDto) {
    const productIds = [...new Set(dto.items.map((item) => item.productId))];

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        discountPrice: true,
        price: true,
        quantity: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('یک یا چند محصول سفارش وجود ندارند');
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const requestedQuantities = new Map<number, number>();

    for (const item of dto.items) {
      requestedQuantities.set(
        item.productId,
        (requestedQuantities.get(item.productId) ?? 0) + item.quantity,
      );
    }

    for (const [productId, requestedQuantity] of requestedQuantities) {
      const product = productMap.get(productId)!;
      if (product.quantity < requestedQuantity) {
        throw new BadRequestException(
          `موجودی محصول ${productId} کافی نیست`,
        );
      }
    }

    const totalAmount = dto.items.reduce((sum, item) => {
      const product = productMap.get(item.productId)!;
      return sum + this.getEffectiveProductPrice(product) * item.quantity;
    }, 0);

    const createOrder = this.prisma.order.create({
      data: {
        userId: user.id,
        totalAmount: new Prisma.Decimal(totalAmount),
        status: OrderStatus.PENDING,
        orderItems: {
          create: dto.items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: item.productId,
              quantity: item.quantity,
              price: this.getEffectiveProductPrice(product),
            };
          }),
        },
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    const updateProducts = [...requestedQuantities.entries()].map(
      ([productId, requestedQuantity]) =>
        this.prisma.product.update({
          where: { id: productId },
          data: {
            quantity: {
              decrement: requestedQuantity,
            },
          },
        }),
    );

    const [order] = await this.prisma.$transaction([createOrder, ...updateProducts]);

    return order;
  }

  async findAll(user: { id: number; roles: string[] }) {
    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can('read', subject('Order', { userId: user.id }))) {
      throw new ForbiddenException('شما اجازه مشاهده سفارش های خود را ندارید');
    }

    return this.prisma.order.findMany({
      where: { userId: user.id },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: { id: number; roles: string[] }, id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('سفارش یافت نشد');
    }

    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can('read', subject('Order', { userId: order.userId }))) {
      throw new ForbiddenException('شما اجازه مشاهده این سفارش را ندارید');
    }

    return order;
  }

  async cancel(user: { id: number; roles: string[] }, id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      throw new NotFoundException('سفارش یافت نشد');
    }

    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can('update', subject('Order', { userId: order.userId }))) {
      throw new ForbiddenException('شما اجازه لغو این سفارش را ندارید');
    }

    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.PAID,
    ];

    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('این سفارش در وضعیت قابل لغو نیست');
    }

    const restoredQuantities = new Map<number, number>();

    for (const item of order.orderItems) {
      restoredQuantities.set(
        item.productId,
        (restoredQuantities.get(item.productId) ?? 0) + item.quantity,
      );
    }

    const updateOrder = this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
      },
    });

    const restoreProducts = [...restoredQuantities.entries()].map(
      ([productId, quantity]) =>
        this.prisma.product.update({
          where: { id: productId },
          data: {
            quantity: {
              increment: quantity,
            },
          },
        }),
    );

    const [updatedOrder] = await this.prisma.$transaction([
      updateOrder,
      ...restoreProducts,
    ]);

    return updatedOrder;
  }
}

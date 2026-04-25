import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { subject } from '@casl/ability';
import { PrismaService } from '../../prisma/prisma.service';
import { AbilityFactory } from '../auth/ability.factory';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  async getMyCart(user: { id: number; roles: string[] }) {
    await this.assertCartAbility(user, 'read', user.id);

    const cart = await this.ensureCart(user.id);
    return this.getCartSummary(cart.id, user.id);
  }

  async addItem(user: { id: number; roles: string[] }, dto: AddCartItemDto) {
    await this.assertCartAbility(user, 'create', user.id);

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: {
        id: true,
        quantity: true,
      },
    });

    if (!product) {
      throw new NotFoundException('محصول مورد نظر برای افزودن به سبد یافت نشد');
    }

    if (product.quantity < dto.quantity) {
      throw new BadRequestException('موجودی محصول برای افزودن به سبد کافی نیست');
    }

    const cart = await this.ensureCart(user.id);
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    const nextQuantity = (existingItem?.quantity ?? 0) + dto.quantity;
    if (product.quantity < nextQuantity) {
      throw new BadRequestException('مجموع تعداد درخواستی از موجودی محصول بیشتر است');
    }

    await this.prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
      update: {
        quantity: nextQuantity,
      },
      create: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
      },
    });

    return this.getCartSummary(cart.id, user.id);
  }

  async updateItem(
    user: { id: number; roles: string[] },
    itemId: number,
    dto: UpdateCartItemDto,
  ) {
    await this.assertCartAbility(user, 'update', user.id);

    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
      },
    });

    if (!cartItem || cartItem.cart.userId !== user.id) {
      throw new NotFoundException('آیتم سبد خرید یافت نشد');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: cartItem.productId },
      select: { id: true, quantity: true },
    });

    if (!product) {
      throw new NotFoundException('محصول این آیتم دیگر وجود ندارد');
    }

    if (product.quantity < dto.quantity) {
      throw new BadRequestException('موجودی محصول برای این تعداد کافی نیست');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getCartSummary(cartItem.cartId, user.id);
  }

  async removeItem(user: { id: number; roles: string[] }, itemId: number) {
    await this.assertCartAbility(user, 'delete', user.id);

    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
      },
    });

    if (!cartItem || cartItem.cart.userId !== user.id) {
      throw new NotFoundException('آیتم سبد خرید یافت نشد');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getCartSummary(cartItem.cartId, user.id);
  }

  async clear(user: { id: number; roles: string[] }) {
    await this.assertCartAbility(user, 'delete', user.id);

    const cart = await this.ensureCart(user.id);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.getCartSummary(cart.id, user.id);
  }

  private async ensureCart(userId: number) {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  private async getCartSummary(cartId: number, userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              include: {
                store: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('سبد خرید یافت نشد');
    }

    const items = cart.items.map((item) => {
      const unitPrice = item.product.discountPrice ?? item.product.price;
      const lineTotal = unitPrice * item.quantity;

      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        product: item.product,
      };
    });

    const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);

    return {
      id: cart.id,
      userId,
      items,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  private async assertCartAbility(
    user: { id: number; roles: string[] },
    action: 'create' | 'read' | 'update' | 'delete',
    ownerUserId: number,
  ) {
    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can(action, subject('Cart', { userId: ownerUserId }))) {
      throw new ForbiddenException('شما اجازه دسترسی به سبد خرید را ندارید');
    }
  }
}

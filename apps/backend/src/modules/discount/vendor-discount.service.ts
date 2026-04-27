import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Product, Store, VendorDiscount } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AbilityFactory } from '../auth/ability.factory';
import { CreateVendorDiscountDto } from './dto/create-vendor-discount.dto';
import { UpdateVendorDiscountDto } from './dto/update-vendor-discount.dto';
import { GetVendorDiscountsQueryDto } from './dto/get-vendor-discounts-query.dto';
import { subject } from '@casl/ability';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

type VendorDiscountWithRelations = VendorDiscount & {
  product: Pick<Product, 'id' | 'name' | 'price' | 'storeId'>;
  store: Pick<Store, 'id' | 'name' | 'ownerId' | 'slug'>;
};

@Injectable()
export class VendorDiscountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateVendorDiscountDto) {
    this.assertVendorOrAdmin(user);

    const product = await this.getOwnedProductOrThrow(dto.productId);
    await this.assertCanManageDiscount(user, 'create', product.store.ownerId);

    this.validateDiscountPayload({
      productPrice: Number(product.price),
      valueType: dto.valueType,
      value: dto.value,
      startAt: dto.startAt,
      endAt: dto.endAt,
    });

    await this.ensureNoConflictingActiveDiscount({
      productId: product.id,
      startAt: dto.startAt,
      endAt: dto.endAt,
      isActive: dto.isActive ?? true,
    });

    return this.prisma.vendorDiscount.create({
      data: {
        productId: product.id,
        storeId: product.storeId,
        title: dto.title,
        description: dto.description,
        valueType: dto.valueType,
        value: dto.value,
        priority: dto.priority ?? 100,
        isActive: dto.isActive ?? true,
        isExclusive: dto.isExclusive ?? false,
        allowCouponStacking: dto.allowCouponStacking ?? false,
        startAt: dto.startAt,
        endAt: dto.endAt,
        metadata: this.toInputJson(dto.metadata),
      },
      include: {
        product: {
          select: { id: true, name: true, price: true, storeId: true },
        },
        store: {
          select: { id: true, name: true, ownerId: true, slug: true },
        },
      },
    });
  }

  async findMine(user: AuthenticatedUser, query: GetVendorDiscountsQueryDto) {
    this.assertVendorOrAdmin(user);

    const { page = 1, limit = 10, productId, storeId, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.VendorDiscountWhereInput = {
      ...(productId ? { productId } : {}),
      ...(storeId ? { storeId } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(!user.roles.includes('ADMIN')
        ? {
            store: {
              ownerId: user.id,
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.vendorDiscount.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isActive: 'desc' }, { priority: 'asc' }, { id: 'desc' }],
        include: {
          product: {
            select: { id: true, name: true, price: true, storeId: true },
          },
          store: {
            select: { id: true, name: true, ownerId: true, slug: true },
          },
        },
      }),
      this.prisma.vendorDiscount.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(user: AuthenticatedUser, id: number) {
    this.assertVendorOrAdmin(user);

    const discount = await this.getDiscountOrThrow(id);
    await this.assertCanManageDiscount(user, 'read', discount.store.ownerId);

    return discount;
  }

  async update(user: AuthenticatedUser, id: number, dto: UpdateVendorDiscountDto) {
    this.assertVendorOrAdmin(user);

    const discount = await this.getDiscountOrThrow(id);
    await this.assertCanManageDiscount(user, 'update', discount.store.ownerId);

    if (dto.productId && dto.productId !== discount.productId) {
      throw new BadRequestException('در فاز فعلی تغییر product برای vendor discount مجاز نیست');
    }

    const nextValueType = dto.valueType ?? discount.valueType;
    const nextValue = dto.value ?? Number(discount.value);
    const nextStartAt = dto.startAt ?? discount.startAt ?? undefined;
    const nextEndAt = dto.endAt ?? discount.endAt ?? undefined;
    const nextIsActive = dto.isActive ?? discount.isActive;

    this.validateDiscountPayload({
      productPrice: Number(discount.product.price),
      valueType: nextValueType,
      value: nextValue,
      startAt: nextStartAt,
      endAt: nextEndAt,
    });

    await this.ensureNoConflictingActiveDiscount({
      productId: discount.productId,
      startAt: nextStartAt,
      endAt: nextEndAt,
      isActive: nextIsActive,
      excludeId: discount.id,
    });

    return this.prisma.vendorDiscount.update({
      where: { id },
      data: {
        title: dto.title ?? discount.title,
        description: dto.description ?? discount.description,
        valueType: nextValueType,
        value: nextValue,
        priority: dto.priority ?? discount.priority,
        isActive: nextIsActive,
        isExclusive: dto.isExclusive ?? discount.isExclusive,
        allowCouponStacking:
          dto.allowCouponStacking ?? discount.allowCouponStacking,
        startAt: dto.startAt !== undefined ? dto.startAt : discount.startAt,
        endAt: dto.endAt !== undefined ? dto.endAt : discount.endAt,
        metadata:
          dto.metadata !== undefined
            ? this.toInputJson(dto.metadata)
            : this.toNullableInputJson(discount.metadata),
      },
      include: {
        product: {
          select: { id: true, name: true, price: true, storeId: true },
        },
        store: {
          select: { id: true, name: true, ownerId: true, slug: true },
        },
      },
    });
  }

  async remove(user: AuthenticatedUser, id: number) {
    this.assertVendorOrAdmin(user);

    const discount = await this.getDiscountOrThrow(id);
    await this.assertCanManageDiscount(user, 'delete', discount.store.ownerId);

    await this.prisma.vendorDiscount.delete({
      where: { id },
    });
  }

  private async getOwnedProductOrThrow(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: {
          select: { id: true, ownerId: true, name: true, slug: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('محصول مورد نظر یافت نشد');
    }

    return product;
  }

  private async getDiscountOrThrow(id: number): Promise<VendorDiscountWithRelations> {
    const discount = await this.prisma.vendorDiscount.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, name: true, price: true, storeId: true },
        },
        store: {
          select: { id: true, name: true, ownerId: true, slug: true },
        },
      },
    });

    if (!discount) {
      throw new NotFoundException('vendor discount مورد نظر یافت نشد');
    }

    return discount;
  }

  private async assertCanManageDiscount(
    user: AuthenticatedUser,
    action: 'create' | 'read' | 'update' | 'delete',
    ownerId: number,
  ) {
    if (user.roles.includes('ADMIN') || user.id === ownerId) {
      return;
    }

    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can(action, subject('VendorDiscount', { ownerId }))) {
      throw new ForbiddenException('شما اجازه مدیریت این تخفیف را ندارید');
    }
  }

  private assertVendorOrAdmin(user: AuthenticatedUser) {
    if (!user.roles.some((role) => role === 'ADMIN' || role === 'VENDOR')) {
      throw new ForbiddenException('این بخش فقط برای فروشنده یا ادمین مجاز است');
    }
  }

  private validateDiscountPayload(input: {
    productPrice: number;
    valueType: VendorDiscount['valueType'];
    value: number;
    startAt?: Date;
    endAt?: Date;
  }) {
    if (input.startAt && input.endAt && input.startAt > input.endAt) {
      throw new BadRequestException('startAt نمی‌تواند بعد از endAt باشد');
    }

    if (input.valueType === 'PERCENTAGE' && input.value > 100) {
      throw new BadRequestException('درصد تخفیف باید بین 0.01 تا 100 باشد');
    }

    if (
      input.valueType === 'FIXED_AMOUNT' &&
      input.value >= input.productPrice
    ) {
      throw new BadRequestException(
        'مبلغ تخفیف ثابت باید از قیمت خود محصول کمتر باشد',
      );
    }
  }

  private async ensureNoConflictingActiveDiscount(input: {
    productId: number;
    startAt?: Date;
    endAt?: Date;
    isActive: boolean;
    excludeId?: number;
  }) {
    if (!input.isActive) {
      return;
    }

    const candidates = await this.prisma.vendorDiscount.findMany({
      where: {
        productId: input.productId,
        isActive: true,
        ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
      },
    });

    const hasOverlap = candidates.some((candidate) =>
      this.windowsOverlap(
        input.startAt ?? null,
        input.endAt ?? null,
        candidate.startAt,
        candidate.endAt,
      ),
    );

    if (hasOverlap) {
      throw new ConflictException(
        'برای این محصول یک vendor discount فعال در همین بازه زمانی وجود دارد',
      );
    }
  }

  private windowsOverlap(
    startA: Date | null,
    endA: Date | null,
    startB: Date | null,
    endB: Date | null,
  ) {
    const normalizedStartA = startA?.getTime() ?? Number.NEGATIVE_INFINITY;
    const normalizedEndA = endA?.getTime() ?? Number.POSITIVE_INFINITY;
    const normalizedStartB = startB?.getTime() ?? Number.NEGATIVE_INFINITY;
    const normalizedEndB = endB?.getTime() ?? Number.POSITIVE_INFINITY;

    return normalizedStartA <= normalizedEndB && normalizedStartB <= normalizedEndA;
  }

  private toInputJson(value: Record<string, unknown> | undefined) {
    if (value === undefined) {
      return undefined;
    }

    return value as Prisma.InputJsonValue;
  }

  private toNullableInputJson(value: Prisma.JsonValue | null) {
    if (value === null) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }
}

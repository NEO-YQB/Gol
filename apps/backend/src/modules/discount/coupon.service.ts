import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { GetCouponsQueryDto } from './dto/get-coupons-query.dto';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

@Injectable()
export class CouponService {
  constructor(private readonly prisma: PrismaService) {}

  async adminCreate(user: AuthenticatedUser, dto: CreateCouponDto) {
    this.assertAdmin(user);

    const normalizedCode = this.normalizeCode(dto.code);
    const scopes = this.normalizeScopes(dto);
    this.validateCouponPayload({
      ...dto,
      code: normalizedCode,
      ...scopes,
    });
    await this.ensureCodeAvailable(normalizedCode);
    await this.assertScopesExist(scopes);

    return this.prisma.coupon.create({
      data: {
        code: normalizedCode,
        title: dto.title,
        description: dto.description,
        valueType: dto.valueType,
        value: dto.value,
        priority: dto.priority ?? 100,
        isActive: dto.isActive ?? true,
        isExclusive: dto.isExclusive ?? true,
        applyOn: dto.applyOn ?? 'DISCOUNTED_SUBTOTAL',
        firstOrderOnly: dto.firstOrderOnly ?? false,
        minOrderAmount: dto.minOrderAmount,
        usageLimit: dto.usageLimit,
        perUserUsageLimit: dto.perUserUsageLimit,
        allowVendorDiscountStacking: dto.allowVendorDiscountStacking ?? false,
        allowPlatformPromotionStacking:
          dto.allowPlatformPromotionStacking ?? false,
        startAt: dto.startAt,
        endAt: dto.endAt,
        createdByUserId: user.id,
        metadata: this.toInputJson(dto.metadata),
        products: scopes.productIds.length
          ? {
              createMany: {
                data: scopes.productIds.map((productId) => ({ productId })),
              },
            }
          : undefined,
        stores: scopes.storeIds.length
          ? {
              createMany: {
                data: scopes.storeIds.map((storeId) => ({ storeId })),
              },
            }
          : undefined,
        categories: scopes.categoryIds.length
          ? {
              createMany: {
                data: scopes.categoryIds.map((categoryId) => ({ categoryId })),
              },
            }
          : undefined,
      },
      include: this.couponInclude(),
    });
  }

  async adminList(user: AuthenticatedUser, query: GetCouponsQueryDto) {
    this.assertAdmin(user);

    const { page = 1, limit = 10, isActive, code } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CouponWhereInput = {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(code
        ? {
            code: {
              contains: this.normalizeCode(code),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isActive: 'desc' }, { priority: 'asc' }, { id: 'desc' }],
        include: this.couponInclude(),
      }),
      this.prisma.coupon.count({ where }),
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

  async adminFindOne(user: AuthenticatedUser, id: number) {
    this.assertAdmin(user);
    return this.getCouponOrThrow(id);
  }

  async adminUpdate(user: AuthenticatedUser, id: number, dto: UpdateCouponDto) {
    this.assertAdmin(user);

    const coupon = await this.getCouponOrThrow(id);
    const nextCode = dto.code ? this.normalizeCode(dto.code) : coupon.code;

    const next = {
      code: nextCode,
      title: dto.title ?? coupon.title,
      description: dto.description ?? coupon.description ?? undefined,
      valueType: dto.valueType ?? coupon.valueType,
      value: dto.value ?? Number(coupon.value),
      priority: dto.priority ?? coupon.priority,
      isActive: dto.isActive ?? coupon.isActive,
      isExclusive: dto.isExclusive ?? coupon.isExclusive,
      applyOn: dto.applyOn ?? coupon.applyOn,
      firstOrderOnly: dto.firstOrderOnly ?? coupon.firstOrderOnly,
      minOrderAmount:
        dto.minOrderAmount !== undefined
          ? dto.minOrderAmount
          : coupon.minOrderAmount !== null
            ? Number(coupon.minOrderAmount)
            : undefined,
      usageLimit: dto.usageLimit ?? coupon.usageLimit ?? undefined,
      perUserUsageLimit:
        dto.perUserUsageLimit ?? coupon.perUserUsageLimit ?? undefined,
      allowVendorDiscountStacking:
        dto.allowVendorDiscountStacking ?? coupon.allowVendorDiscountStacking,
      allowPlatformPromotionStacking:
        dto.allowPlatformPromotionStacking ??
        coupon.allowPlatformPromotionStacking,
      startAt: dto.startAt !== undefined ? dto.startAt : coupon.startAt ?? undefined,
      endAt: dto.endAt !== undefined ? dto.endAt : coupon.endAt ?? undefined,
    };

    const scopes = this.normalizeScopes({
      productIds:
        dto.productIds !== undefined
          ? dto.productIds
          : coupon.products.map((item) => item.productId),
      storeIds:
        dto.storeIds !== undefined
          ? dto.storeIds
          : coupon.stores.map((item) => item.storeId),
      categoryIds:
        dto.categoryIds !== undefined
          ? dto.categoryIds
          : coupon.categories.map((item) => item.categoryId),
    });

    this.validateCouponPayload({
      ...next,
      ...scopes,
    });

    if (nextCode !== coupon.code) {
      await this.ensureCodeAvailable(nextCode, id);
    }
    await this.assertScopesExist(scopes);

    return this.prisma.$transaction(async (tx) => {
      if (dto.productIds !== undefined) {
        await tx.couponOnProducts.deleteMany({ where: { couponId: id } });
      }

      if (dto.storeIds !== undefined) {
        await tx.couponOnStores.deleteMany({ where: { couponId: id } });
      }

      if (dto.categoryIds !== undefined) {
        await tx.couponOnCategories.deleteMany({ where: { couponId: id } });
      }

      return tx.coupon.update({
        where: { id },
        data: {
          code: next.code,
          title: next.title,
          description: next.description,
          valueType: next.valueType,
          value: next.value,
          priority: next.priority,
          isActive: next.isActive,
          isExclusive: next.isExclusive,
          applyOn: next.applyOn,
          firstOrderOnly: next.firstOrderOnly,
          minOrderAmount:
            next.minOrderAmount !== undefined ? next.minOrderAmount : coupon.minOrderAmount,
          usageLimit: next.usageLimit,
          perUserUsageLimit: next.perUserUsageLimit,
          allowVendorDiscountStacking: next.allowVendorDiscountStacking,
          allowPlatformPromotionStacking: next.allowPlatformPromotionStacking,
          startAt: dto.startAt !== undefined ? dto.startAt : coupon.startAt,
          endAt: dto.endAt !== undefined ? dto.endAt : coupon.endAt,
          metadata:
            dto.metadata !== undefined
              ? this.toInputJson(dto.metadata)
              : this.toNullableInputJson(coupon.metadata),
          products:
            dto.productIds !== undefined && scopes.productIds.length
              ? {
                  createMany: {
                    data: scopes.productIds.map((productId) => ({ productId })),
                  },
                }
              : undefined,
          stores:
            dto.storeIds !== undefined && scopes.storeIds.length
              ? {
                  createMany: {
                    data: scopes.storeIds.map((storeId) => ({ storeId })),
                  },
                }
              : undefined,
          categories:
            dto.categoryIds !== undefined && scopes.categoryIds.length
              ? {
                  createMany: {
                    data: scopes.categoryIds.map((categoryId) => ({ categoryId })),
                  },
                }
              : undefined,
        },
        include: this.couponInclude(),
      });
    });
  }

  async adminRemove(user: AuthenticatedUser, id: number) {
    this.assertAdmin(user);
    await this.getCouponOrThrow(id);

    await this.prisma.coupon.delete({
      where: { id },
    });
  }

  private async getCouponOrThrow(id: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: this.couponInclude(),
    });

    if (!coupon) {
      throw new NotFoundException('coupon مورد نظر یافت نشد');
    }

    return coupon;
  }

  private validateCouponPayload(input: {
    code: string;
    valueType: Coupon['valueType'];
    value: number;
    startAt?: Date;
    endAt?: Date;
    minOrderAmount?: number;
    usageLimit?: number;
    perUserUsageLimit?: number;
  }) {
    if (input.startAt && input.endAt && input.startAt > input.endAt) {
      throw new BadRequestException('startAt نمی‌تواند بعد از endAt باشد');
    }

    if (input.valueType === 'PERCENTAGE' && input.value > 100) {
      throw new BadRequestException('درصد کوپن باید بین 0.01 تا 100 باشد');
    }

    if (input.minOrderAmount !== undefined && input.minOrderAmount < 0) {
      throw new BadRequestException('حداقل مبلغ سفارش نمی‌تواند منفی باشد');
    }

    if (
      input.usageLimit !== undefined &&
      input.perUserUsageLimit !== undefined &&
      input.perUserUsageLimit > input.usageLimit
    ) {
      throw new BadRequestException(
        'perUserUsageLimit نمی‌تواند بیشتر از usageLimit باشد',
      );
    }

    if (!input.code.trim()) {
      throw new BadRequestException('کد کوپن نمی‌تواند خالی باشد');
    }
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }

  private normalizeScopes(input: {
    productIds?: number[];
    storeIds?: number[];
    categoryIds?: number[];
  }) {
    return {
      productIds: [...new Set(input.productIds ?? [])],
      storeIds: [...new Set(input.storeIds ?? [])],
      categoryIds: [...new Set(input.categoryIds ?? [])],
    };
  }

  private async ensureCodeAvailable(code: string, currentId?: number) {
    const existing = await this.prisma.coupon.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('این کد کوپن قبلا ثبت شده است');
    }
  }

  private async assertScopesExist(scopes: {
    productIds: number[];
    storeIds: number[];
    categoryIds: number[];
  }) {
    const [productCount, storeCount, categoryCount] = await Promise.all([
      scopes.productIds.length
        ? this.prisma.product.count({ where: { id: { in: scopes.productIds } } })
        : Promise.resolve(0),
      scopes.storeIds.length
        ? this.prisma.store.count({ where: { id: { in: scopes.storeIds } } })
        : Promise.resolve(0),
      scopes.categoryIds.length
        ? this.prisma.category.count({ where: { id: { in: scopes.categoryIds } } })
        : Promise.resolve(0),
    ]);

    if (scopes.productIds.length && productCount !== scopes.productIds.length) {
      throw new NotFoundException('یک یا چند productId برای coupon معتبر نیست');
    }

    if (scopes.storeIds.length && storeCount !== scopes.storeIds.length) {
      throw new NotFoundException('یک یا چند storeId برای coupon معتبر نیست');
    }

    if (scopes.categoryIds.length && categoryCount !== scopes.categoryIds.length) {
      throw new NotFoundException('یک یا چند categoryId برای coupon معتبر نیست');
    }
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!user.roles.includes('ADMIN')) {
      throw new ForbiddenException('این endpoint فقط برای ادمین مجاز است');
    }
  }

  private couponInclude() {
    return {
      products: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, price: true, storeId: true },
          },
        },
      },
      stores: {
        include: {
          store: {
            select: { id: true, name: true, slug: true, ownerId: true },
          },
        },
      },
      categories: {
        include: {
          category: {
            select: { id: true, name: true, slug: true, parentId: true },
          },
        },
      },
      _count: {
        select: { redemptions: true },
      },
    } satisfies Prisma.CouponInclude;
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

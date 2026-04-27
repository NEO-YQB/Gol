import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformPromotion, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlatformPromotionDto } from './dto/create-platform-promotion.dto';
import { UpdatePlatformPromotionDto } from './dto/update-platform-promotion.dto';
import { GetPlatformPromotionsQueryDto } from './dto/get-platform-promotions-query.dto';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

@Injectable()
export class PlatformPromotionService {
  constructor(private readonly prisma: PrismaService) {}

  async adminCreate(user: AuthenticatedUser, dto: CreatePlatformPromotionDto) {
    this.assertAdmin(user);
    const scopes = this.normalizeScopes(dto);
    this.validatePromotionPayload({
      ...dto,
      ...scopes,
    });
    await this.assertScopesExist(scopes);

    return this.prisma.platformPromotion.create({
      data: {
        title: dto.title,
        description: dto.description,
        valueType: dto.valueType,
        value: dto.value,
        priority: dto.priority ?? 100,
        isActive: dto.isActive ?? true,
        isExclusive: dto.isExclusive ?? false,
        allowVendorDiscountStacking: dto.allowVendorDiscountStacking ?? false,
        allowCouponStacking: dto.allowCouponStacking ?? false,
        promotedVisibility: dto.promotedVisibility ?? false,
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
      include: this.promotionInclude(),
    });
  }

  async adminList(user: AuthenticatedUser, query: GetPlatformPromotionsQueryDto) {
    this.assertAdmin(user);

    const { page = 1, limit = 10, isActive, promotedVisibility } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PlatformPromotionWhereInput = {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(promotedVisibility !== undefined ? { promotedVisibility } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.platformPromotion.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isActive: 'desc' }, { priority: 'asc' }, { id: 'desc' }],
        include: this.promotionInclude(),
      }),
      this.prisma.platformPromotion.count({ where }),
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
    return this.getPromotionOrThrow(id);
  }

  async adminUpdate(
    user: AuthenticatedUser,
    id: number,
    dto: UpdatePlatformPromotionDto,
  ) {
    this.assertAdmin(user);

    const promotion = await this.getPromotionOrThrow(id);
    const next = {
      title: dto.title ?? promotion.title,
      description: dto.description ?? promotion.description ?? undefined,
      valueType: dto.valueType ?? promotion.valueType,
      value: dto.value ?? Number(promotion.value),
      priority: dto.priority ?? promotion.priority,
      isActive: dto.isActive ?? promotion.isActive,
      isExclusive: dto.isExclusive ?? promotion.isExclusive,
      allowVendorDiscountStacking:
        dto.allowVendorDiscountStacking ?? promotion.allowVendorDiscountStacking,
      allowCouponStacking:
        dto.allowCouponStacking ?? promotion.allowCouponStacking,
      promotedVisibility: dto.promotedVisibility ?? promotion.promotedVisibility,
      startAt: dto.startAt !== undefined ? dto.startAt : promotion.startAt ?? undefined,
      endAt: dto.endAt !== undefined ? dto.endAt : promotion.endAt ?? undefined,
    };

    const scopes = this.normalizeScopes({
      productIds:
        dto.productIds !== undefined
          ? dto.productIds
          : promotion.products.map((item) => item.productId),
      storeIds:
        dto.storeIds !== undefined
          ? dto.storeIds
          : promotion.stores.map((item) => item.storeId),
      categoryIds:
        dto.categoryIds !== undefined
          ? dto.categoryIds
          : promotion.categories.map((item) => item.categoryId),
    });

    this.validatePromotionPayload({
      ...next,
      ...scopes,
    });
    await this.assertScopesExist(scopes);

    return this.prisma.$transaction(async (tx) => {
      if (dto.productIds !== undefined) {
        await tx.promotionOnProducts.deleteMany({ where: { promotionId: id } });
      }

      if (dto.storeIds !== undefined) {
        await tx.promotionOnStores.deleteMany({ where: { promotionId: id } });
      }

      if (dto.categoryIds !== undefined) {
        await tx.promotionOnCategories.deleteMany({ where: { promotionId: id } });
      }

      const updated = await tx.platformPromotion.update({
        where: { id },
        data: {
          title: next.title,
          description: next.description,
          valueType: next.valueType,
          value: next.value,
          priority: next.priority,
          isActive: next.isActive,
          isExclusive: next.isExclusive,
          allowVendorDiscountStacking: next.allowVendorDiscountStacking,
          allowCouponStacking: next.allowCouponStacking,
          promotedVisibility: next.promotedVisibility,
          startAt: dto.startAt !== undefined ? dto.startAt : promotion.startAt,
          endAt: dto.endAt !== undefined ? dto.endAt : promotion.endAt,
          metadata:
            dto.metadata !== undefined
              ? this.toInputJson(dto.metadata)
              : this.toNullableInputJson(promotion.metadata),
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
        include: this.promotionInclude(),
      });

      return updated;
    });
  }

  async adminRemove(user: AuthenticatedUser, id: number) {
    this.assertAdmin(user);
    await this.getPromotionOrThrow(id);

    await this.prisma.platformPromotion.delete({
      where: { id },
    });
  }

  private async getPromotionOrThrow(id: number) {
    const promotion = await this.prisma.platformPromotion.findUnique({
      where: { id },
      include: this.promotionInclude(),
    });

    if (!promotion) {
      throw new NotFoundException('platform promotion مورد نظر یافت نشد');
    }

    return promotion;
  }

  private validatePromotionPayload(input: {
    valueType: PlatformPromotion['valueType'];
    value: number;
    startAt?: Date;
    endAt?: Date;
    productIds?: number[];
    storeIds?: number[];
    categoryIds?: number[];
  }) {
    if (input.startAt && input.endAt && input.startAt > input.endAt) {
      throw new BadRequestException('startAt نمی‌تواند بعد از endAt باشد');
    }

    if (input.valueType === 'PERCENTAGE' && input.value > 100) {
      throw new BadRequestException('درصد promotion باید بین 0.01 تا 100 باشد');
    }

    const totalScopes =
      (input.productIds?.length ?? 0) +
      (input.storeIds?.length ?? 0) +
      (input.categoryIds?.length ?? 0);

    if (totalScopes === 0) {
      throw new BadRequestException(
        'در فاز فعلی promotion باید حداقل یک scope از product/store/category داشته باشد',
      );
    }
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
      throw new NotFoundException('یک یا چند productId برای promotion معتبر نیست');
    }

    if (scopes.storeIds.length && storeCount !== scopes.storeIds.length) {
      throw new NotFoundException('یک یا چند storeId برای promotion معتبر نیست');
    }

    if (scopes.categoryIds.length && categoryCount !== scopes.categoryIds.length) {
      throw new NotFoundException('یک یا چند categoryId برای promotion معتبر نیست');
    }
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!user.roles.includes('ADMIN')) {
      throw new ForbiddenException('این endpoint فقط برای ادمین مجاز است');
    }
  }

  private promotionInclude() {
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
    } satisfies Prisma.PlatformPromotionInclude;
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

import { 
  Injectable, 
  ConflictException, 
  InternalServerErrorException, 
  NotFoundException, 
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { CreateElementDto } from './dto/create-element.dto';
import { ReviewProductDto } from './dto/review-product.dto';
import { PublishProductDto } from './dto/publish-product.dto';
import { ToggleProductPurchasableDto } from './dto/toggle-product-purchasable.dto';
import slugify from 'slugify';
import { Prisma, Product, ProductPublicationStatus, Store } from '@prisma/client';
import { AbilityFactory } from '../auth/ability.factory';
import { subject } from '@casl/ability';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private abilityFactory: AbilityFactory,
  ) {}

  async create(dto: CreateProductDto, user: { id: number; roles: string[] }) {
    const {
      compositions,
      storeId,
      categoryId,
      productTypeId,
      mainImageAlt,
      gallery,
      images,
      publicationStatus: requestedPublicationStatus,
      isPurchasable,
      isArchived,
      reviewNote,
      ...rest
    } = dto;
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, ownerId: true },
    });

    if (!store) {
      throw new NotFoundException('فروشگاه مورد نظر یافت نشد');
    }

    await this.assertCanManageProduct(user, 'create', store);

    const productType = await this.prisma.productType.findUnique({
      where: { id: productTypeId },
    });

    if (!productType) {
      throw new NotFoundException('نوع محصول مورد نظر یافت نشد');
    }

    const allowedElements = productType.allowedElements as Prisma.JsonArray | null;
    const allowedElementIds = allowedElements?.map((el: any) => el.id) || [];

    if (compositions && compositions.length > 0) {
      for (const comp of compositions) {
        if (!allowedElementIds.includes(comp.elementId)) {
          const forbiddenElement = await this.prisma.productElement.findUnique({
            where: { id: comp.elementId }
          });
          throw new BadRequestException(
            `المان "${forbiddenElement?.name || comp.elementId}" برای نوع "${productType.name}" مجاز نیست.`
          );
        }
      }
    }

    const requestedSlug =
      typeof (dto as any).slug === 'string' && (dto as any).slug.trim().length > 0
        ? (dto as any).slug.trim()
        : null;
    const slugBase = requestedSlug ?? slugify(rest.name, { lower: true, strict: true, locale: 'fa' });
    const slug = await this.buildUniqueProductSlug(slugBase);

    try {
      const isAdmin = user.roles.includes('ADMIN');
      const publicationStatus = requestedPublicationStatus
        ? requestedPublicationStatus
        : isAdmin
          ? ProductPublicationStatus.DRAFT
          : ProductPublicationStatus.SUBMITTED;

      return await this.prisma.$transaction(async (tx) => {
        return await tx.product.create({
          data: {
            ...rest,
            slug,
            mainImageAlt: mainImageAlt ?? null,
            gallery: this.toGalleryJson(gallery, images),
            publicationStatus,
            isPurchasable: isPurchasable ?? false,
            isArchived: isArchived ?? false,
            reviewNote: reviewNote ?? null,
            submittedAt: publicationStatus === ProductPublicationStatus.SUBMITTED ? new Date() : null,
            store: { connect: { id: storeId } },
            category: { connect: { id: categoryId } },
            productType: { connect: { id: productTypeId } },
            composition: compositions ? {
              create: compositions.map((c) => ({
                quantity: c.quantity,
                elementType: c.elementType,
                element: { connect: { id: c.elementId } }
              })),
            } : undefined,
          },
        });
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('نام یا اسلاگ محصول تکراری است');
      }
      throw new InternalServerErrorException('خطا در ثبت محصول: ' + error.message);
    }
  }

  async update(
    id: number,
    dto: UpdateProductDto,
    user: { id: number; roles: string[] },
  ) {
    const {
      categoryId,
      storeId,
      productTypeId,
      compositions,
      mainImageAlt,
      gallery,
      images,
      publicationStatus: requestedPublicationStatus,
      isPurchasable,
      isArchived,
      reviewNote,
      ...rest
    } = dto;
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
      include: {
        productType: true,
        store: { select: { ownerId: true } },
      },
    });
    if (!existingProduct) throw new NotFoundException('محصول یافت نشد');
    await this.assertCanManageProduct(user, 'update', existingProduct);

    if (productTypeId || compositions) {
      const typeId = productTypeId || existingProduct.productTypeId;
      const targetType = await this.prisma.productType.findUnique({
        where: { id: typeId },
      });

      const allowedElementsForUpdate = targetType?.allowedElements as Prisma.JsonArray | null;
      const allowedIds = allowedElementsForUpdate?.map((el: any) => el.id) || [];
      
      if (compositions) {
        for (const comp of compositions) {
          if (!allowedIds.includes(comp.elementId)) {
            throw new BadRequestException(`المان انتخاب شده در این نوع محصول مجاز نیست`);
          }
        }
      }
    }

    if (storeId) {
      const targetStore = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, ownerId: true },
      });
      if (!targetStore) {
        throw new NotFoundException('فروشگاه مورد نظر یافت نشد');
      }
      await this.assertCanManageProduct(user, 'update', targetStore);
    }

    const isAdmin = user.roles.includes('ADMIN');

    return this.prisma.$transaction(async (tx) => {
      if (compositions) {
        await tx.productComposition.deleteMany({ where: { productId: id } });
      }

      const nextPublicationStatus = this.resolveNextPublicationStatus(existingProduct.publicationStatus, requestedPublicationStatus, isAdmin);
      const nextReviewNote = reviewNote !== undefined ? reviewNote : existingProduct.reviewNote;
      const nextIsArchived = isArchived ?? existingProduct.isArchived;
      const nextIsPurchasable = nextIsArchived ? false : (isPurchasable ?? existingProduct.isPurchasable);

      return tx.product.update({
        where: { id },
        data: {
          ...rest,
          ...(typeof (dto as any).slug === 'string' && (dto as any).slug.trim().length > 0
            ? { slug: (dto as any).slug.trim() }
            : {}),
          mainImageAlt: mainImageAlt ?? existingProduct.mainImageAlt,
          gallery: gallery || images ? this.toGalleryJson(gallery, images) : undefined,
          publicationStatus: nextPublicationStatus,
          reviewNote: nextReviewNote,
          submittedAt: !isAdmin && nextPublicationStatus === ProductPublicationStatus.SUBMITTED ? new Date() : existingProduct.submittedAt,
          isArchived: nextIsArchived,
          isPurchasable: nextIsPurchasable,
          category: categoryId ? { connect: { id: categoryId } } : undefined,
          store: storeId ? { connect: { id: storeId } } : undefined,
          productType: productTypeId ? { connect: { id: productTypeId } } : undefined,
          composition: compositions ? {
            create: compositions.map((c) => ({
              quantity: c.quantity,
              elementType: c.elementType,
              element: { connect: { id: c.elementId } }
            })),
          } : undefined,
        },
      });
    });
  }

  private async buildUniqueProductSlug(baseSlug: string) {
    const normalizedBase = baseSlug.trim();
    if (!normalizedBase) {
      throw new BadRequestException('اسلاگ محصول نامعتبر است');
    }

    const existing = await this.prisma.product.findUnique({
      where: { slug: normalizedBase },
      select: { id: true },
    });

    if (!existing) {
      return normalizedBase;
    }

    let attempt = 1;
    while (attempt <= 1000) {
      const candidate = `${normalizedBase}-${attempt}`;
      const match = await this.prisma.product.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!match) {
        return candidate;
      }

      attempt += 1;
    }

    throw new ConflictException('تولید اسلاگ یکتای محصول ممکن نشد');
  }

  async findAll(query: GetProductsQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      categoryIds,
      storeId,
      productTypeId,
      ids,
      minPrice,
      maxPrice,
      publicationStatus,
      isPurchasable,
      isArchived,
      sortBy,
    } = query;
    const skip = (page - 1) * limit;
    const productIds = ids
      ? ids
          .split(',')
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isInteger(value) && value > 0)
      : [];
    const categoryIdList = categoryIds
      ? categoryIds
          .split(',')
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isInteger(value) && value > 0)
      : [];

    const where: any = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(categoryIdList.length > 0
        ? { categoryId: { in: categoryIdList } }
        : categoryId
          ? { categoryId }
          : {}),
      ...(storeId && { storeId }),
      ...(productTypeId && { productTypeId }),
      ...(productIds.length > 0 ? { id: { in: productIds } } : {}),
      ...(publicationStatus && { publicationStatus }),
      ...(typeof isPurchasable === 'boolean' ? { isPurchasable } : {}),
      ...(typeof isArchived === 'boolean' ? { isArchived } : {}),
      ...((minPrice || maxPrice) && {
        price: {
          ...(minPrice && { gte: minPrice }),
          ...(maxPrice && { lte: maxPrice }),
        },
      }),
    };

    const orderBy =
      sortBy === 'most_sold'
        ? [{ orderItems: { _count: 'desc' as const } }, { createdAt: 'desc' as const }]
        : sortBy === 'instant_delivery'
          ? [{ store: { sameDayDelivery: 'desc' as const } }, { createdAt: 'desc' as const }]
          : [{ createdAt: 'desc' as const }];

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          store: { select: { id: true, name: true } },
          productType: { select: { id: true, name: true } },
          reviewedByUser: { select: { id: true, fullName: true, phoneNumber: true } },
          publishedByUser: { select: { id: true, fullName: true, phoneNumber: true } },
        },
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async findOne(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        store: true,
        productType: true,
        composition: { include: { element: true } },
        reviewedByUser: { select: { id: true, fullName: true, phoneNumber: true } },
        publishedByUser: { select: { id: true, fullName: true, phoneNumber: true } },
      },
    });
    if (!product) throw new NotFoundException(`محصول یافت نشد`);
    return product;
  }

  async remove(id: number, user: { id: number; roles: string[] }) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { store: { select: { ownerId: true } } },
    });
    if (!product) throw new NotFoundException(`محصول یافت نشد`);
    await this.assertCanManageProduct(user, 'delete', product);
    return this.prisma.product.update({
      where: { id },
      data: {
        isArchived: true,
        isPurchasable: false,
        publicationStatus:
          product.publicationStatus === ProductPublicationStatus.PUBLISHED
            ? ProductPublicationStatus.ARCHIVED
            : product.publicationStatus,
      },
    });
  }

  async review(id: number, dto: ReviewProductDto, user: { id: number; roles: string[] }) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('محصول یافت نشد');

    const approved = Boolean(dto.approved);
    const requestChanges = Boolean(dto.requestChanges);

    if (approved && requestChanges) {
      throw new BadRequestException('محصول نمی‌تواند هم‌زمان هم تایید شود و هم برای اصلاح بازگردد');
    }

    const nextStatus = approved
      ? ProductPublicationStatus.APPROVED
      : requestChanges
        ? ProductPublicationStatus.CHANGES_REQUESTED
        : ProductPublicationStatus.SUBMITTED;

    return this.prisma.product.update({
      where: { id },
      data: {
        publicationStatus: nextStatus,
        reviewedAt: new Date(),
        reviewedByUserId: user.id,
        reviewNote: dto.reviewNote ?? null,
        approvedAt: approved ? new Date() : null,
        isPurchasable: false,
      },
      include: {
        reviewedByUser: { select: { id: true, fullName: true, phoneNumber: true } },
      },
    });
  }

  async publish(id: number, dto: PublishProductDto, user: { id: number; roles: string[] }) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('محصول یافت نشد');

    const shouldPublish = dto.publish ?? true;
    if (shouldPublish && product.publicationStatus !== ProductPublicationStatus.APPROVED && product.publicationStatus !== ProductPublicationStatus.PUBLISHED) {
      throw new BadRequestException('فقط محصول تاییدشده می‌تواند منتشر شود');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        publicationStatus: shouldPublish ? ProductPublicationStatus.PUBLISHED : ProductPublicationStatus.APPROVED,
        publishedAt: shouldPublish ? new Date() : null,
        publishedByUserId: shouldPublish ? user.id : null,
        reviewNote: dto.note ?? product.reviewNote,
      },
      include: {
        publishedByUser: { select: { id: true, fullName: true, phoneNumber: true } },
      },
    });
  }

  async togglePurchasable(id: number, dto: ToggleProductPurchasableDto, user: { id: number; roles: string[] }) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { store: { select: { ownerId: true } } },
    });
    if (!product) throw new NotFoundException('محصول یافت نشد');
    await this.assertCanManageProduct(user, 'update', product);

    return this.prisma.product.update({
      where: { id },
      data: {
        isPurchasable: dto.isArchived ? false : dto.isPurchasable,
        isArchived: dto.isArchived ?? product.isArchived,
        reviewNote: dto.note ?? product.reviewNote,
        publicationStatus:
          dto.isArchived === true
            ? ProductPublicationStatus.ARCHIVED
            : product.publicationStatus === ProductPublicationStatus.ARCHIVED
              ? ProductPublicationStatus.APPROVED
              : product.publicationStatus,
      },
    });
  }

  async createElement(dto: CreateElementDto) {
    return this.prisma.productElement.create({
      data: {
        name: dto.name,
        type: dto.type,
        unit: dto.unit ?? 'عدد',
        image: dto.image ?? null,
      },
    });
  }

  async findAllElements() {
    return this.prisma.productElement.findMany({ orderBy: { name: 'asc' } });
  }

  async removeElement(id: number) {
    return this.prisma.productElement.delete({ where: { id } });
  }

  private async assertCanManageProduct(
    user: { id: number; roles: string[] },
    action: 'create' | 'update' | 'delete',
    productOrStore:
      | Pick<Store, 'ownerId'>
      | (Product & { store: Pick<Store, 'ownerId'> }),
  ) {
    const ownerId = 'store' in productOrStore
      ? productOrStore.store.ownerId
      : productOrStore.ownerId;

    const ability = await this.abilityFactory.createForUser(user);
    const canManage = ability.can(
      action,
      subject('Product', { ownerId }),
    );

    if (!canManage) {
      throw new ForbiddenException('شما اجازه مدیریت این محصول را ندارید');
    }
  }

  private toGalleryJson(
    gallery?: Array<{ url: string; alt?: string }> | null,
    fallbackImages?: string[] | null,
  ) {
    if (gallery && gallery.length > 0) {
      return gallery.map((item) => ({
        url: item.url,
        alt: item.alt ?? null,
      })) as Prisma.InputJsonValue;
    }

    if (fallbackImages && fallbackImages.length > 0) {
      return fallbackImages.map((url) => ({ url, alt: null })) as Prisma.InputJsonValue;
    }

    return undefined;
  }

  private resolveNextPublicationStatus(
    current: ProductPublicationStatus,
    requested: ProductPublicationStatus | undefined,
    isAdmin: boolean,
  ) {
    if (requested && isAdmin) {
      return requested;
    }

    if (isAdmin) {
      return current;
    }

    if (current === ProductPublicationStatus.CHANGES_REQUESTED) {
      return ProductPublicationStatus.SUBMITTED;
    }

    if (current === ProductPublicationStatus.DRAFT) {
      return ProductPublicationStatus.SUBMITTED;
    }

    return current;
  }
}

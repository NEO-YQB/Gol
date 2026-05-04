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
import slugify from 'slugify';
import { Prisma, Product, Store } from '@prisma/client';
import { AbilityFactory } from '../auth/ability.factory';
import { subject } from '@casl/ability';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private abilityFactory: AbilityFactory,
  ) {}

  async create(dto: CreateProductDto, user: { id: number; roles: string[] }) {
    const { compositions, storeId, categoryId, productTypeId, ...rest } = dto;
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

    const slug = slugify(rest.name, { lower: true, strict: true, locale: 'fa' }) 
                 + '-' + Math.floor(Math.random() * 1000);

    try {
      return await this.prisma.$transaction(async (tx) => {
        return await tx.product.create({
          data: {
            ...rest,
            slug,
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
    const { categoryId, storeId, productTypeId, compositions, ...rest } = dto;
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

    return this.prisma.$transaction(async (tx) => {
      if (compositions) {
        await tx.productComposition.deleteMany({ where: { productId: id } });
      }

      return tx.product.update({
        where: { id },
        data: {
          ...rest,
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

  async findAll(query: GetProductsQueryDto) {
    const { page = 1, limit = 10, search, categoryId, storeId, minPrice, maxPrice } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(categoryId && { categoryId }),
      ...(storeId && { storeId }),
      ...((minPrice || maxPrice) && {
        price: {
          ...(minPrice && { gte: minPrice }),
          ...(maxPrice && { lte: maxPrice }),
        },
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: { select: { name: true } },
          store: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
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
        composition: { include: { element: true } }
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
    return this.prisma.product.delete({ where: { id } });
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
}

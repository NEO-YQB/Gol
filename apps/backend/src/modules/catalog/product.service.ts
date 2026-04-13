import { Injectable, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import slugify from 'slugify';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  // ۱. ایجاد محصول
  async create(dto: CreateProductDto) {
    const { compositions, storeId, categoryId, productTypeId, ...rest } = dto;

    // تولید اسلاگ خودکار از نام (اگر در DTO نبود)
    const slug = slugify(rest.name, { lower: true, strict: true, locale: 'fa' })+ '-' + Math.floor(Math.random() * 1000);

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
      throw new InternalServerErrorException('خطا در ثبت محصول');
    }
  }

  // ۲. لیست محصولات (findAll)
  async findAll(query: GetProductsQueryDto) {
    const { page = 1, limit = 10, search, categoryId, storeId, minPrice, maxPrice } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
        ],
      }),
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

  // ۳. یافتن بر اساس اسلاگ (findOne) - حل خطای اول
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

    if (!product) throw new NotFoundException(`محصولی با اسلاگ ${slug} یافت نشد`);
    return product;
  }

  // ۴. یافتن با آیدی (متد داخلی برای Update و Delete)
  async findOneById(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`محصولی با شناسه ${id} یافت نشد`);
    return product;
  }

  // ۵. به‌روزرسانی (update) - حل خطای دوم
  async update(id: number, dto: UpdateProductDto) {
  const { categoryId, storeId, productTypeId, compositions, ...rest } = dto;

  return this.prisma.$transaction(async (tx) => {
    // ۱. بررسی وجود محصول
    await tx.product.findUniqueOrThrow({ where: { id } });

    // ۲. اگر لیست اجزا ارسال شده، قبلی‌ها را پاک و جدیدها را می‌سازیم
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

  // ۶. حذف (remove) - حل خطای سوم
  async remove(id: number) {
    await this.findOneById(id);
    return this.prisma.product.delete({ where: { id } });
  }
}

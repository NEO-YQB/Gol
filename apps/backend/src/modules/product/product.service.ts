import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    // ۱. بررسی تکراری نبودن اسلاگ
    const existingSlug = await this.prisma.product.findUnique({
      where: { slug: dto.slug },
    });

    if (existingSlug) {
      throw new ConflictException('این اسلاگ قبلاً ثبت شده است.');
    }

    // ۲. جدا کردن فیلدهای رابطه‌ای از داده‌های اصلی
    const { categoryId, storeId, productTypeId, images, ...rest } = dto;

    return this.prisma.product.create({
      data: {
        ...rest,
        images: images as any, // فیلد Json در پریزما
        category: { connect: { id: categoryId } },
        store: { connect: { id: storeId } },
        productType: { connect: { id: productTypeId } },
      },
      include: {
        category: true,
        productType: true,
        store: true
      }
    });
  }

  async findAll(query: any = {}) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: { select: { name: true, slug: true } },
          store: { select: { name: true } },
          productType: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.product.count({ where })
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        store: true,
        productType: true,
        composition: {
          include: { element: true }
        }
      },
    });
    if (!product) throw new NotFoundException(`محصولی با شناسه ${id} یافت نشد`);
    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    // ابتدا بررسی وجود محصول
    const product = await this.findOne(id);
    
    const { categoryId, storeId, productTypeId, images, ...rest } = dto;

    return this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        // فقط اگر مقدار فرستاده شده بود، تصاویر را آپدیت کن
        images: images !== undefined ? (images as any) : undefined,
        
        // هندل کردن روابط به صورت امن
        category: categoryId ? { connect: { id: categoryId } } : undefined,
        store: storeId ? { connect: { id: storeId } } : undefined,
        productType: productTypeId ? { connect: { id: productTypeId } } : undefined,
      },
      include: {
        category: true,
        productType: true,
        store: true
      }
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }
}

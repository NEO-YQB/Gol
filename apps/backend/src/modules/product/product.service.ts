import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name: string;
    slug: string;
    description?: string;
    price: number;
    stock: number;
    images?: any;
    attributes?: any;
    categoryId: number;
    storeId: number;
  }) {
    // ابتدا بررسی می‌کنیم که آیا فروشگاه و دسته‌بندی وجود دارند
    const store = await this.prisma.store.findUnique({ where: { id: data.storeId } });
    if (!store) throw new NotFoundException('Store not found');

    const category = await this.prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new NotFoundException('Category not found');

    return this.prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: new Prisma.Decimal(data.price),
        stock: data.stock,
        images: data.images,
        attributes: data.attributes,
        categoryId: data.categoryId,
        storeId: data.storeId,
      },
    });
  }

  async findAll() {
    return this.prisma.product.findMany({
      include: {
        category: { select: { name: true, slug: true } },
        store: { select: { name: true } },
      },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, store: true, reviews: true }
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}

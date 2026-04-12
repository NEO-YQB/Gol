import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    // ۱. بررسی تکراری نبودن اسلاگ
    const existingSlug = await this.prisma.product.findUnique({
      where: { slug: createProductDto.slug },
    });

    if (existingSlug) {
      throw new ConflictException('این اسلاگ قبلاً ثبت شده است. لطفا مقدار دیگری وارد کنید.');
    }

    return this.prisma.product.create({
      data: createProductDto,
    });
  }

  async findAll() {
    return this.prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        store: { select: { name: true } },
      },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        store: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`محصولی با شناسه ${id} یافت نشد`);
    }
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    // ۱. بررسی وجود محصول
    const product = await this.findOne(id);

    // ۲. اگر اسلاگ در حال تغییر است، بررسی تکراری نبودن در سایر محصولات
    if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
      const existingSlug = await this.prisma.product.findUnique({
        where: { slug: updateProductDto.slug },
      });
      if (existingSlug) {
        throw new ConflictException('این اسلاگ توسط محصول دیگری رزرو شده است.');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.product.delete({
      where: { id },
    });
  }
}

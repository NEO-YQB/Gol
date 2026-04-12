import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // مسیر سرویس پریزما در پروژه شما
import { CreateProductDto } from './dto/create-product.dto';
import { ElementType } from '@prisma/client';
import slugify from 'slugify';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    // ۱. استخراج جداگانه آیدی‌ها و داده‌های اصلی
    const { 
      compositions, 
      storeId, 
      categoryId, 
      productTypeId, 
      ...rest 
    } = dto;

    const slug = slugify(dto.name, { lower: true, strict: true });

    try {
      return await this.prisma.$transaction(async (tx) => {
        return await tx.product.create({
          data: {
            name: rest.name,
            mainImage: rest.mainImage,
            description: rest.description,
            price: rest.price,
            discountPrice: rest.discountPrice,
            quantity: rest.quantity || 0,
            slug: slug,
            // ۲. اتصال روابط با استفاده از آیدی‌های عددی
            store: { connect: { id: storeId } },
            category: { connect: { id: categoryId } },
            productType: { connect: { id: productTypeId } },
            
            composition: {
              create: compositions.map((c) => ({
                quantity: c.quantity,
                elementType: c.elementType,
                element: {
                  connect: { id: c.elementId }
                }
              })),
            },
          },
          include: {
            composition: { include: { element: true } },
            store: true,
            category: true
          }
        });
      });
    } catch (error: any) {
      console.error("Prisma Detail Error:", error);
      if (error.code === 'P2002') {
        throw new ConflictException('نام یا اسلاگ تکراری است');
      }
      throw new InternalServerErrorException('خطا در ثبت محصول');
    }
  }

  async findAll() {
    return this.prisma.product.findMany({
      include: {
        category: true,
        productType: true,
        store: true,
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; 
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        slug: createCategoryDto.slug,
        description: createCategoryDto.description ?? null,
        parentId: createCategoryDto.parentId,
      },
    });
  }

  async findAllWithChildren() {
  return this.prisma.category.findMany({
    where: { parentId: null }, // فقط دسته‌های اصلی
    include: {
      children: {
        include: {
          children: true // تا ۳ مرحله عمق (قابل تغییر است)
        }
      }
    }
  });
}
}

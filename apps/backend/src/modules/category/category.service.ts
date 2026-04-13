import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; 
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const { parentId, ...rest } = dto;

    // بررسی تکراری نبودن اسلاگ
    const existing = await this.prisma.category.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('اسلاگ تکراری است');

    return this.prisma.category.create({
      data: {
        ...rest,
        parent: parentId ? { connect: { id: parentId } } : undefined,
      },
    });
  }

  async findAllWithChildren() {
    return this.prisma.category.findMany({
      where: { parentId: null }, // دریافت ریشه‌ها
      include: {
        children: {
          include: {
            children: true // تا ۲ مرحله عمق
          }
        }
      }
    });
  }

  async findOne(id: number) {
    return this.prisma.category.findUnique({
      where: { id },
      include: { children: true, parent: true }
    });
  }
}

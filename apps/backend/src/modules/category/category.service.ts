import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; 
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const { parentId, ...rest } = dto;

    await this.ensureSlugIsAvailable(dto.slug);
    await this.ensureParentExists(parentId);

    return this.prisma.category.create({
      data: {
        ...rest,
        parent: parentId ? { connect: { id: parentId } } : undefined,
      },
    });
  }

  async findAllWithChildren() {
    return this.prisma.category.findMany({
      where: { parentId: null }, 
      include: {
        children: {
          include: {
            children: true, 
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          include: {
            children: true,
          },
        },
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('دسته بندی یافت نشد');
    }

    return category;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.ensureCategoryExists(id);

    if (dto.slug) {
      await this.ensureSlugIsAvailable(dto.slug, id);
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new ConflictException('یک دسته بندی نمی تواند والد خودش باشد');
      }

      await this.ensureParentExists(dto.parentId);
      await this.ensureNoCycle(id, dto.parentId);
    }

    const { parentId, ...rest } = dto;

    return this.prisma.category.update({
      where: { id },
      data: {
        ...rest,
        parent:
          parentId === undefined
            ? undefined
            : parentId === null
              ? { disconnect: true }
              : { connect: { id: parentId } },
      },
    });
  }

  async remove(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            children: true,
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('دسته بندی یافت نشد');
    }

    if (category._count.children > 0) {
      throw new ConflictException('ابتدا زیر دسته های این دسته بندی را حذف یا منتقل کنید');
    }

    if (category._count.products > 0) {
      throw new ConflictException('این دسته بندی به محصول متصل است و قابل حذف نیست');
    }

    await this.prisma.category.delete({
      where: { id },
    });
  }

  private async ensureSlugIsAvailable(slug: string, currentId?: number) {
    const existing = await this.prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('اسلاگ تکراری است');
    }
  }

  private async ensureParentExists(parentId?: number | null) {
    if (!parentId) {
      return;
    }

    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true },
    });

    if (!parent) {
      throw new NotFoundException('دسته بندی والد یافت نشد');
    }
  }

  private async ensureCategoryExists(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('دسته بندی یافت نشد');
    }
  }

  private async ensureNoCycle(categoryId: number, parentId: number) {
    let currentParentId: number | null | undefined = parentId;

    while (currentParentId) {
      if (currentParentId === categoryId) {
        throw new ConflictException('این تغییر باعث حلقه در درخت دسته بندی می شود');
      }

      const parent = await this.prisma.category.findUnique({
        where: { id: currentParentId },
        select: { parentId: true },
      });

      currentParentId = parent?.parentId;
    }
  }
}

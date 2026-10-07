import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCategoryFaqDto } from './dto/create-category-faq.dto';
import { UpdateCategoryFaqDto } from './dto/update-category-faq.dto';
import { ReorderCategoryFaqDto } from './dto/reorder-category-faq.dto';
import { RedisCacheService } from '../../common/redis/redis-cache.service';

@Injectable()
export class CategoryService {
  constructor(
    private prisma: PrismaService,
    private redisCache: RedisCacheService,
  ) {}

  private async invalidateCategoryCache(id?: number) {
    try {
      await this.redisCache.del('categories:tree');
      if (id) {
        await this.redisCache.del(`categories:detail:${id}`);
      }
      await this.redisCache.delByPattern('catalog:products:list:*');
    } catch {
      // ignore
    }
  }

  async create(dto: CreateCategoryDto) {
    const { parentId, ...rest } = dto;

    await this.ensureSlugIsAvailable(dto.slug);
    await this.ensureParentExists(parentId);

    const created = await this.prisma.category.create({
      data: {
        ...rest,
        parent: parentId ? { connect: { id: parentId } } : undefined,
      },
    });
    await this.invalidateCategoryCache(created.id);
    return created;
  }

  async findAllWithChildren() {
    const cacheKey = 'categories:tree';
    const cached = await this.redisCache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const categories = await this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: {
              include: {
                categoryFaqs: { orderBy: { sortOrder: 'asc' } },
              },
            },
            categoryFaqs: { orderBy: { sortOrder: 'asc' } },
          },
        },
        categoryFaqs: { orderBy: { sortOrder: 'asc' } },
      },
    });
    await this.redisCache.set(cacheKey, categories, 3600);
    return categories;
  }

  async findOne(id: number) {
    const cacheKey = `categories:detail:${id}`;
    const cached = await this.redisCache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          include: {
            children: true,
          },
        },
        categoryFaqs: { orderBy: { sortOrder: 'asc' } },
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

    await this.redisCache.set(cacheKey, category, 3600);
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

    const updated = await this.prisma.category.update({
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
    await this.invalidateCategoryCache(id);
    return updated;
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
    await this.invalidateCategoryCache(id);
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

  async createFaq(categoryId: number, dto: CreateCategoryFaqDto) {
    await this.ensureCategoryExists(categoryId);

    const created = await this.prisma.categoryFaq.create({
      data: {
        question: dto.question,
        answer: dto.answer,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        category: { connect: { id: categoryId } },
      },
    });
    await this.invalidateCategoryCache(categoryId);
    return created;
  }

  async findFaqs(categoryId: number) {
    await this.ensureCategoryExists(categoryId);

    return this.prisma.categoryFaq.findMany({
      where: { categoryId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateFaq(categoryId: number, faqId: number, dto: UpdateCategoryFaqDto) {
    await this.ensureCategoryExists(categoryId);

    const faq = await this.prisma.categoryFaq.findUnique({
      where: { id: faqId },
      select: { id: true, categoryId: true },
    });

    if (!faq || faq.categoryId !== categoryId) {
      throw new NotFoundException('سوال متداول یافت نشد');
    }

    const updated = await this.prisma.categoryFaq.update({
      where: { id: faqId },
      data: {
        ...(dto.question !== undefined && { question: dto.question }),
        ...(dto.answer !== undefined && { answer: dto.answer }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    await this.invalidateCategoryCache(categoryId);
    return updated;
  }

  async removeFaq(categoryId: number, faqId: number) {
    await this.ensureCategoryExists(categoryId);

    const faq = await this.prisma.categoryFaq.findUnique({
      where: { id: faqId },
      select: { id: true, categoryId: true },
    });

    if (!faq || faq.categoryId !== categoryId) {
      throw new NotFoundException('سوال متداول یافت نشد');
    }

    await this.prisma.categoryFaq.delete({ where: { id: faqId } });
    await this.invalidateCategoryCache(categoryId);
  }

  async reorderFaqs(categoryId: number, dto: ReorderCategoryFaqDto) {
    await this.ensureCategoryExists(categoryId);

    const updates = dto.faqIds.map((faqId, index) =>
      this.prisma.categoryFaq.update({
        where: { id: faqId },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);
    await this.invalidateCategoryCache(categoryId);

    return this.prisma.categoryFaq.findMany({
      where: { categoryId },
      orderBy: { sortOrder: 'asc' },
    });
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSeoLandingDto } from './dto/create-seo-landing.dto';
import { UpdateSeoLandingDto } from './dto/update-seo-landing.dto';

@Injectable()
export class SeoLandingService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSeoLandingDto) {
    await this.ensureSlugIsAvailable(dto.slug);
    await this.ensureCategoryExists(dto.categoryId);

    return this.prisma.seoLandingRule.create({
      data: {
        internalName: dto.internalName,
        slug: dto.slug,
        categoryId: dto.categoryId,
        filterConfig: dto.filterConfig as any,
        isActive: dto.isActive ?? true,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        h1Tag: dto.h1Tag,
        seoContent: dto.seoContent,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findAll() {
    return this.prisma.seoLandingRule.findMany({
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const rule = await this.prisma.seoLandingRule.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    if (!rule) {
      throw new NotFoundException('规则 لندینگ سئو یافت نشد');
    }

    return rule;
  }

  async update(id: number, dto: UpdateSeoLandingDto) {
    await this.ensureRuleExists(id);

    if (dto.slug) {
      await this.ensureSlugIsAvailable(dto.slug, id);
    }

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    return this.prisma.seoLandingRule.update({
      where: { id },
      data: {
        internalName: dto.internalName,
        slug: dto.slug,
        categoryId: dto.categoryId,
        filterConfig: dto.filterConfig as any,
        isActive: dto.isActive,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        h1Tag: dto.h1Tag,
        seoContent: dto.seoContent,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: number) {
    await this.ensureRuleExists(id);
    await this.prisma.seoLandingRule.delete({ where: { id } });
  }

  async matchLanding(categoryId: number, filterIds: number[]) {
    const rule = await this.prisma.seoLandingRule.findFirst({
      where: {
        categoryId,
        isActive: true,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    if (!rule) {
      return null;
    }

    const config = rule.filterConfig as Array<{ type: string; valueId: number }>;
    if (!Array.isArray(config) || config.length === 0) {
      return rule;
    }

    const configValueIds = config.map((f) => f.valueId).sort();
    const queryValueIds = [...filterIds].sort();

    if (
      configValueIds.length === queryValueIds.length &&
      configValueIds.every((id, i) => id === queryValueIds[i])
    ) {
      return rule;
    }

    return null;
  }

  private async ensureSlugIsAvailable(slug: string, currentId?: number) {
    const existing = await this.prisma.seoLandingRule.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('اسلاگ تکراری است');
    }
  }

  private async ensureCategoryExists(categoryId: number) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('دسته‌بندی یافت نشد');
    }
  }

  private async ensureRuleExists(id: number) {
    const rule = await this.prisma.seoLandingRule.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!rule) {
      throw new NotFoundException('规则 لندینگ سئو یافت نشد');
    }
  }
}

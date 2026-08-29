import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { CreateProductTypeFaqDto } from './dto/create-product-type-faq.dto';
import { ReorderProductTypeFaqDto } from './dto/reorder-product-type-faq.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { UpdateProductTypeFaqDto } from './dto/update-product-type-faq.dto';

@Injectable()
export class ProductTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductTypeDto) {
    await this.ensureSlugIsAvailable(dto.slug);

    const allowedElements = await this.buildAllowedElements(
      dto.allowedElementIds,
    );

    return this.prisma.productType.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        image: dto.image,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        isIndexed: dto.isIndexed,
        allowedElements,
      },
    });
  }

  async findAll() {
    return this.prisma.productType.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
        productTypeFaqs: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const productType = await this.prisma.productType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
        productTypeFaqs: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!productType) {
      throw new NotFoundException('نوع محصول یافت نشد');
    }

    return productType;
  }

  async update(id: number, dto: UpdateProductTypeDto) {
    await this.ensureProductTypeExists(id);

    if (dto.slug) {
      await this.ensureSlugIsAvailable(dto.slug, id);
    }

    const allowedElements =
      dto.allowedElementIds !== undefined
        ? await this.buildAllowedElements(dto.allowedElementIds)
        : undefined;

    return this.prisma.productType.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        image: dto.image,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        isIndexed: dto.isIndexed,
        allowedElements,
      },
    });
  }

  async remove(id: number) {
    const productType = await this.prisma.productType.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!productType) {
      throw new NotFoundException('نوع محصول یافت نشد');
    }

    if (productType._count.products > 0) {
      throw new ConflictException(
        'این نوع محصول به محصولات ثبت شده متصل است و قابل حذف نیست',
      );
    }

    await this.prisma.productType.delete({
      where: { id },
    });
  }

  async createFaq(productTypeId: number, dto: CreateProductTypeFaqDto) {
    await this.ensureProductTypeExists(productTypeId);

    return this.prisma.productTypeFaq.create({
      data: {
        question: dto.question,
        answer: dto.answer,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        productType: { connect: { id: productTypeId } },
      },
    });
  }

  async findFaqs(productTypeId: number) {
    await this.ensureProductTypeExists(productTypeId);

    return this.prisma.productTypeFaq.findMany({
      where: { productTypeId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateFaq(productTypeId: number, faqId: number, dto: UpdateProductTypeFaqDto) {
    await this.ensureProductTypeExists(productTypeId);

    const faq = await this.prisma.productTypeFaq.findUnique({
      where: { id: faqId },
      select: { id: true, productTypeId: true },
    });

    if (!faq || faq.productTypeId !== productTypeId) {
      throw new NotFoundException('سوال متداول یافت نشد');
    }

    return this.prisma.productTypeFaq.update({
      where: { id: faqId },
      data: {
        ...(dto.question !== undefined && { question: dto.question }),
        ...(dto.answer !== undefined && { answer: dto.answer }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async removeFaq(productTypeId: number, faqId: number) {
    await this.ensureProductTypeExists(productTypeId);

    const faq = await this.prisma.productTypeFaq.findUnique({
      where: { id: faqId },
      select: { id: true, productTypeId: true },
    });

    if (!faq || faq.productTypeId !== productTypeId) {
      throw new NotFoundException('سوال متداول یافت نشد');
    }

    await this.prisma.productTypeFaq.delete({ where: { id: faqId } });
  }

  async reorderFaqs(productTypeId: number, dto: ReorderProductTypeFaqDto) {
    await this.ensureProductTypeExists(productTypeId);

    const updates = dto.faqIds.map((faqId, index) =>
      this.prisma.productTypeFaq.update({
        where: { id: faqId },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);

    return this.prisma.productTypeFaq.findMany({
      where: { productTypeId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  private async ensureSlugIsAvailable(slug: string, currentId?: number) {
    const existing = await this.prisma.productType.findUnique({
      where: { slug },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('این اسلاگ قبلا ثبت شده است');
    }
  }

  private async ensureProductTypeExists(id: number) {
    const productType = await this.prisma.productType.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!productType) {
      throw new NotFoundException('نوع محصول یافت نشد');
    }
  }

  private async buildAllowedElements(elementIds?: number[]) {
    if (elementIds === undefined) {
      return undefined;
    }

    if (elementIds.length === 0) {
      return [];
    }

    const elements = await this.prisma.productElement.findMany({
      where: { id: { in: elementIds } },
      select: {
        id: true,
        name: true,
        type: true,
        unit: true,
        image: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    if (elements.length !== elementIds.length) {
      throw new NotFoundException('یک یا چند المان انتخاب شده وجود ندارند');
    }

    const elementMap = new Map(elements.map((element) => [element.id, element]));
    return elementIds.map((id) => elementMap.get(id)!);
  }
}

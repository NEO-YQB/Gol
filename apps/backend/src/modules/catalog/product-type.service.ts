import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';

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

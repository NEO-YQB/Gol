import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { AbilityFactory } from '../auth/ability.factory';
import { subject } from '@casl/ability';

@Injectable()
export class StoreService {
  constructor(
    private prisma: PrismaService,
    private abilityFactory: AbilityFactory,
  ) {}

  async create(createStoreDto: CreateStoreDto, userId: number) {
    const userHasStore = await this.prisma.store.findFirst({
      where: { ownerId: userId },
    });

    if (userHasStore) {
      throw new ConflictException('شما قبلاً یک فروشگاه ثبت کرده‌اید');
    }

    await this.ensureSlugIsAvailable(createStoreDto.slug);

    return this.prisma.store.create({
      data: {
        ...createStoreDto,
        ownerId: userId,
        isVerified: false,
      },
    });
  }

  async findAll() {
    return this.prisma.store.findMany({
      include: { owner: { select: { id: true, email: true } } },
    });
  }

  async findBySlug(slug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug },
      include: {
        products: true,
        _count: { select: { products: true } },
      },
    });

    if (!store) throw new NotFoundException('فروشگاه یافت نشد');
    return store;
  }

  async update(
    id: number,
    updateStoreDto: UpdateStoreDto,
    user: { id: number; roles: string[] },
  ) {
    const store = await this.prisma.store.findUnique({ where: { id } });

    if (!store) throw new NotFoundException('فروشگاه یافت نشد');

    await this.assertCanManageStore(user, 'update', store.ownerId);

    if (updateStoreDto.slug) {
      await this.ensureSlugIsAvailable(updateStoreDto.slug, id);
    }

    return this.prisma.store.update({
      where: { id },
      data: updateStoreDto,
    });
  }

  async remove(id: number, user: { id: number; roles: string[] }) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('فروشگاه یافت نشد');
    }

    await this.assertCanManageStore(user, 'delete', store.ownerId);

    if (store._count.products > 0) {
      throw new ConflictException('این فروشگاه محصول دارد و فعلا قابل حذف نیست');
    }

    await this.prisma.store.delete({
      where: { id },
    });
  }

  private async ensureSlugIsAvailable(slug: string, currentId?: number) {
    const existing = await this.prisma.store.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('این اسلاگ قبلاً رزرو شده است');
    }
  }

  private async assertCanManageStore(
    user: { id: number; roles: string[] },
    action: 'update' | 'delete',
    ownerId: number,
  ) {
    if (user.id === ownerId) {
      return;
    }

    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can(action, subject('Store', { ownerId }))) {
      throw new ForbiddenException(
        action === 'update'
          ? 'شما اجازه ویرایش این فروشگاه را ندارید'
          : 'شما اجازه حذف این فروشگاه را ندارید',
      );
    }
  }
}

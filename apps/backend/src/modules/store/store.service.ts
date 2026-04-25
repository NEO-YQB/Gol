import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  async create(
    createStoreDto: CreateStoreDto,
    user: { id: number; roles: string[] },
  ) {
    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can('create', 'Store')) {
      throw new ForbiddenException('شما اجازه ایجاد فروشگاه را ندارید');
    }

    const userHasStore = await this.prisma.store.findFirst({
      where: { ownerId: user.id },
    });

    if (userHasStore) {
      throw new ConflictException('شما قبلاً یک فروشگاه ثبت کرده‌اید');
    }

    await this.ensureSlugIsAvailable(createStoreDto.slug);
    this.validateDeliveryConfig(createStoreDto);

    return this.prisma.store.create({
      data: {
        ...this.toCreateStorePersistenceInput(createStoreDto),
        ownerId: user.id,
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

    this.validateDeliveryConfig({
      sameDayDelivery: updateStoreDto.sameDayDelivery ?? store.sameDayDelivery,
      hasExpressDelivery:
        updateStoreDto.hasExpressDelivery ?? store.hasExpressDelivery,
      minDeliveryHours: updateStoreDto.minDeliveryHours ?? store.minDeliveryHours ?? undefined,
      maxDeliveryHours: updateStoreDto.maxDeliveryHours ?? store.maxDeliveryHours ?? undefined,
      expressDeliveryHours:
        updateStoreDto.expressDeliveryHours ?? store.expressDeliveryHours ?? undefined,
      deliveryWindows:
        updateStoreDto.deliveryWindows ?? this.parseDeliveryWindows(store.deliveryWindows),
    });

    return this.prisma.store.update({
      where: { id },
      data: this.toUpdateStorePersistenceInput(updateStoreDto),
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

  private validateDeliveryConfig(
    dto: Pick<
      CreateStoreDto,
      | 'sameDayDelivery'
      | 'hasExpressDelivery'
      | 'minDeliveryHours'
      | 'maxDeliveryHours'
      | 'expressDeliveryHours'
      | 'deliveryWindows'
    >,
  ) {
    if (
      dto.minDeliveryHours !== undefined &&
      dto.maxDeliveryHours !== undefined &&
      dto.minDeliveryHours > dto.maxDeliveryHours
    ) {
      throw new ConflictException('حداقل زمان ارسال نمی‌تواند بیشتر از حداکثر زمان ارسال باشد');
    }

    if (dto.hasExpressDelivery && !dto.expressDeliveryHours) {
      throw new ConflictException('برای ارسال فوری باید زمان ارسال فوری مشخص شود');
    }

    if (
      dto.expressDeliveryHours !== undefined &&
      dto.minDeliveryHours !== undefined &&
      dto.expressDeliveryHours > dto.minDeliveryHours
    ) {
      throw new ConflictException('زمان ارسال فوری باید کمتر یا مساوی حداقل زمان ارسال عادی باشد');
    }

    if (dto.deliveryWindows && dto.deliveryWindows.length === 0) {
      throw new ConflictException('اگر بازه زمانی ارسال تعریف می‌شود، لیست آن نباید خالی باشد');
    }
  }

  private toCreateStorePersistenceInput(dto: CreateStoreDto) {
    const { deliveryWindows, ...rest } = dto;

    return {
      ...rest,
      ...(deliveryWindows !== undefined
        ? {
            deliveryWindows:
              deliveryWindows as unknown as Prisma.InputJsonValue,
          }
        : {}),
    };
  }

  private toUpdateStorePersistenceInput(dto: UpdateStoreDto) {
    const { deliveryWindows, ...rest } = dto;

    return {
      ...rest,
      ...(deliveryWindows !== undefined
        ? {
            deliveryWindows:
              deliveryWindows as unknown as Prisma.InputJsonValue,
          }
        : {}),
    };
  }

  private parseDeliveryWindows(
    value: Prisma.JsonValue | null,
  ): CreateStoreDto['deliveryWindows'] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    return value as unknown as CreateStoreDto['deliveryWindows'];
  }
}

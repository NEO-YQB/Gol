import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}

  async create(createStoreDto: CreateStoreDto, userId: number) {

    const userHasStore = await this.prisma.store.findFirst({
    where: { ownerId: userId },
  });

  if (userHasStore) {
    throw new ConflictException('شما قبلاً یک فروشگاه ثبت کرده‌اید و مجاز به ثبت فروشگاه دیگری نیستید');
  }

    const slugExists = await this.prisma.store.findUnique({
    where: { slug: createStoreDto.slug },
  });

  if (slugExists) {
    throw new ConflictException('این نام مستعار (slug) قبلاً توسط فروشگاه دیگری رزرو شده است.');
  }

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

    if (!store) {
      throw new NotFoundException('فروشگاه یافت نشد');
    }
    return store;
  }

  async update(id: number, updateStoreDto: UpdateStoreDto, userId: number, userRole: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });

    if (!store) throw new NotFoundException('فروشگاه یافت نشد');

    // بررسی سطح دسترسی: فقط صاحب فروشگاه یا ادمین
    if (store.ownerId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('شما اجازه ویرایش این فروشگاه را ندارید');
    }

    return this.prisma.store.update({
      where: { id },
      data: updateStoreDto,
    });
  }
}

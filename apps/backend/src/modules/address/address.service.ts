import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { AbilityFactory } from '../auth/ability.factory';
import { subject } from '@casl/ability';

@Injectable()
export class AddressService {
  constructor(
    private prisma: PrismaService,
    private abilityFactory: AbilityFactory,
  ) {}

  async create(userId: number, dto: CreateAddressDto) {
    // اگر این آدرس به عنوان پیش‌فرض ست شده، بقیه آدرس‌های کاربر از حالت پیش‌فرض خارج شوند
    if (dto.isDefault) {
      await this.prisma.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.userAddress.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async findAll(userId: number) {
    return this.prisma.userAddress.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(user: { id: number; roles: string[] }, addressId: number) {
    const address = await this.prisma.userAddress.findUnique({
      where: { id: addressId },
      select: { id: true, userId: true },
    });

    if (!address) {
      throw new NotFoundException('آدرس یافت نشد');
    }

    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can('delete', subject('UserAddress', { userId: address.userId }))) {
      throw new ForbiddenException('شما اجازه حذف این آدرس را ندارید');
    }

    return this.prisma.userAddress.delete({
      where: { id: addressId },
    });
  }
}

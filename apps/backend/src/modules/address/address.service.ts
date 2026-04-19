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

  async create(user: { id: number; roles: string[] }, dto: CreateAddressDto) {
    await this.assertCanManageAddress(user, 'create', user.id);

    // اگر این آدرس به عنوان پیش‌فرض ست شده، بقیه آدرس‌های کاربر از حالت پیش‌فرض خارج شوند
    if (dto.isDefault) {
      await this.prisma.userAddress.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    return this.prisma.userAddress.create({
      data: {
        ...dto,
        userId: user.id,
      },
    });
  }

  async findAll(user: { id: number; roles: string[] }) {
    await this.assertCanManageAddress(user, 'read', user.id);

    return this.prisma.userAddress.findMany({
      where: { userId: user.id },
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

    await this.assertCanManageAddress(user, 'delete', address.userId);

    return this.prisma.userAddress.delete({
      where: { id: addressId },
    });
  }

  private async assertCanManageAddress(
    user: { id: number; roles: string[] },
    action: 'create' | 'read' | 'delete',
    ownerUserId: number,
  ) {
    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can(action, subject('UserAddress', { userId: ownerUserId }))) {
      throw new ForbiddenException('شما اجازه دسترسی به این آدرس را ندارید');
    }
  }
}

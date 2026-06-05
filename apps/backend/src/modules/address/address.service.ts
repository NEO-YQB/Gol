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

  async setDefault(user: { id: number; roles: string[] }, addressId: number) {
    const address = await this.prisma.userAddress.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException('آدرس یافت نشد');
    }

    await this.assertCanManageAddress(user, 'read', address.userId);

    await this.prisma.userAddress.updateMany({
      where: { userId: address.userId },
      data: { isDefault: false },
    });

    return this.prisma.userAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
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
    action: 'create' | 'read' | 'update' | 'delete',
    ownerUserId: number,
  ) {
    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can(action, subject('UserAddress', { userId: ownerUserId }))) {
      throw new ForbiddenException('شما اجازه دسترسی به این آدرس را ندارید');
    }
  }
}

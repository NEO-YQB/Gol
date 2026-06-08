import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { SettingsService } from '../settings/settings.service';
import { SmsProviderService } from '../settings/sms-provider.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private settingsService: SettingsService,
    private smsProviderService: SmsProviderService,
  ) {}

  async verifyOtp(phoneNumber: string, code: string) {
    const otpEntry = await this.prisma.otpCode.findFirst({
      where: {
        phoneNumber,
        code,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpEntry) {
      throw new BadRequestException('کد وارد شده اشتباه است یا منقضی شده');
    }

    let user = await this.prisma.user.findUnique({
      where: { phoneNumber },
      include: {
        roles: {
          include: {
            role: true, 
          },
        },
      },
    });

    if (user && !user.isActive) {
      throw new ForbiddenException('حساب کاربری شما غیرفعال است');
    }

    if (!user) {
      try {
        const customerRole = await this.prisma.role.findUnique({
          where: { name: 'CUSTOMER' },
        });

        if (!customerRole) {
          throw new InternalServerErrorException('نقش مشتری در سیستم تعریف نشده است');
        }

        user = await this.prisma.user.create({
          data: {
            phoneNumber,
            roles: {
              create: {
                roleId: customerRole.id,
              },
            },
          },
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        });
      } catch (error) {
        throw new InternalServerErrorException('خطا در ثبت‌نام کاربر جدید');
      }
    }

    await this.prisma.otpCode.deleteMany({ where: { phoneNumber } });

    const roleNames = user.roles.map((userRole) => userRole.role.name);

    const payload = { 
      sub: user.id, 
      phoneNumber: user.phoneNumber, 
      roles: roleNames
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        nationalId: user.nationalId,
        roles: roleNames,
        needsProfileCompletion: !user.fullName,
      },
    };
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('کاربر یافت نشد');
    }

    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      nationalId: user.nationalId,
      roles: user.roles.map((userRole) => userRole.role.name),
      needsProfileCompletion: !user.fullName,
      createdAt: user.createdAt,
    };
  }

  async completeProfile(userId: number, fullName: string, nationalId?: string) {
    if (nationalId?.trim()) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          nationalId: nationalId.trim(),
          id: { not: userId },
        },
        select: { id: true },
      });

      if (existingUser) {
        throw new BadRequestException('این کد ملی قبلاً برای حساب دیگری ثبت شده است');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: fullName.trim(),
        nationalId: nationalId?.trim() || null,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      nationalId: user.nationalId,
      roles: user.roles.map((userRole) => userRole.role.name),
      needsProfileCompletion: !user.fullName,
    };
  }

  async getCustomerAccountSummary(userId: number) {
    const [user, orders, addresses, addressCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phoneNumber: true,
          fullName: true,
          nationalId: true,
          createdAt: true,
        },
      }),
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 4,
        include: {
          orderItems: {
            select: {
              id: true,
            },
          },
          store: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.userAddress.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        take: 3,
        select: {
          id: true,
          title: true,
          city: true,
          address: true,
          isDefault: true,
        },
      }),
      this.prisma.userAddress.count({
        where: { userId },
      }),
    ]);

    if (!user) {
      throw new BadRequestException('کاربر یافت نشد');
    }

    const allOrderCount = await this.prisma.order.count({ where: { userId } });
    const activeOrderCount = await this.prisma.order.count({
      where: {
        userId,
        status: {
          in: [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.ACCEPTED, OrderStatus.PROCESSING, OrderStatus.SHIPPED],
        },
      },
    });
    const deliveredOrderCount = await this.prisma.order.count({
      where: { userId, status: OrderStatus.DELIVERED },
    });

    return {
      profile: user,
      stats: {
        orderCount: allOrderCount,
        activeOrderCount,
        deliveredOrderCount,
        addressCount,
        defaultAddressTitle: addresses.find((item) => item.isDefault)?.title ?? null,
        latestOrderStatus: orders[0]?.status ?? null,
      },
      recentOrders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: Number(order.totalAmount),
        createdAt: order.createdAt,
        storeName: order.store?.name ?? null,
        itemCount: order.orderItems.length,
      })),
      addresses,
    };
  }


  async getSessionBootstrap(user: { id: number; roles: string[]; phoneNumber?: string }) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        store: {
          select: {
            id: true,
            isVerified: true,
            name: true,
            slug: true,
          },
        },
        vendorOnboardingRequest: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const effectiveRoles = dbUser
      ? dbUser.roles.map((userRole) => userRole.role.name)
      : user.roles;

    const permissionMap = new Map<string, { action: string; subject: string }>();

    for (const userRole of dbUser?.roles ?? []) {
      for (const rolePermission of userRole.role.permissions) {
        const permission = rolePermission.permission;
        permissionMap.set(`${permission.action}:${permission.subject}`, {
          action: permission.action,
          subject: permission.subject,
        });
      }
    }

    return {
      roles: effectiveRoles,
      effectivePermissions: Array.from(permissionMap.values()),
      store: dbUser?.store
        ? {
            id: dbUser.store.id,
            isVerified: dbUser.store.isVerified,
            name: dbUser.store.name,
            slug: dbUser.store.slug,
          }
        : null,
      vendorOnboarding: dbUser?.vendorOnboardingRequest
        ? {
            applicationStatus: dbUser.vendorOnboardingRequest.applicationStatus,
            productStatus: dbUser.vendorOnboardingRequest.productStatus,
            storeActivatedAt: dbUser.vendorOnboardingRequest.storeActivatedAt,
          }
        : null,
    };
  }

  async sendOtp(phoneNumber: string, options?: { forceRealProvider?: boolean; requestedByAdmin?: number }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber },
      select: { isActive: true },
    });

    if (existingUser && !existingUser.isActive) {
      throw new ForbiddenException('حساب کاربری شما غیرفعال است');
    }

    const code = Math.floor(10000 + Math.random() * 90000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 2);

    await this.prisma.$transaction(async (tx) => {
      await tx.otpCode.deleteMany({
        where: { phoneNumber },
      });

      await tx.otpCode.create({
        data: {
          phoneNumber,
          code,
          expiresAt,
        },
      });
    });

    const smsSettings = await this.settingsService.getSmsSettingsForRuntime();

    if (options?.forceRealProvider) {
      this.settingsService.assertSmsSettingsConfigured(smsSettings);
    }

    if (smsSettings?.apiKey && smsSettings.templateId) {
      await this.smsProviderService.sendSmsIrVerify({
        apiKey: smsSettings.apiKey,
        templateId: smsSettings.templateId,
        phoneNumber,
        code,
      });
    } else {
      console.log(`📱 OTP for ${phoneNumber}: ${code}`);
    }
    
    return { message: 'کد تایید ارسال شد', expiresAt };
  }

}

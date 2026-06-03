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
      roles: user.roles.map((userRole) => userRole.role.name),
      needsProfileCompletion: !user.fullName,
      createdAt: user.createdAt,
    };
  }

  async completeProfile(userId: number, fullName: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: fullName.trim(),
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
      roles: user.roles.map((userRole) => userRole.role.name),
      needsProfileCompletion: !user.fullName,
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

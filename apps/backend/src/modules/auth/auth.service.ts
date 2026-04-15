import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async verifyOtp(phoneNumber: string, code: string) {
    // ۱. پیدا کردن آخرین کد معتبر برای این شماره
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

    // ۲. پیدا کردن یا ساختن کاربر با نقش‌هایش
    let user = await this.prisma.user.findUnique({
      where: { phoneNumber },
      include: {
        roles: {
          include: {
            role: true, // اطلاعات نقش را هم می‌آوریم
          },
        },
      },
    });

    // اگر کاربر وجود نداشت، او را می‌سازیم و نقش CUSTOMER را به او می‌دهیم
    if (!user) {
      try {
        // ابتدا پیدا کردن نقش CUSTOMER از دیتابیس
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

    // ۳. حذف کدهای OTP استفاده شده
    await this.prisma.otpCode.deleteMany({ where: { phoneNumber } });

    // ۴. استخراج نام نقش‌ها برای قرار دادن در توکن
    // خروجی به شکل ['CUSTOMER'] یا ['ADMIN', 'VENDOR'] خواهد بود
    const roleNames = user.roles.map((userRole) => userRole.role.name);

    // ۵. تولید Token
    const payload = { 
      sub: user.id, 
      phoneNumber: user.phoneNumber, 
      roles: roleNames // به جای یک نقش، لیست نقش‌ها را می‌فرستیم
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        roles: roleNames,
      },
    };
  }

  async sendOtp(phoneNumber: string) {
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 2);

    await this.prisma.otpCode.create({
      data: {
        phoneNumber,
        code,
        expiresAt,
      },
    });

    console.log(`📱 OTP for ${phoneNumber}: ${code}`);
    
    return { message: 'کد تایید ارسال شد', expiresAt };
  }
}
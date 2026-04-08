import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
  private prisma: PrismaService,
  private jwtService: JwtService, // تزریق سرویس JWT
) {}

  async verifyOtp(phoneNumber: string, code: string) {
  // ۱. پیدا کردن آخرین کد معتبر برای این شماره
  const otpEntry = await this.prisma.otpCode.findFirst({
    where: {
      phoneNumber,
      code,
      expiresAt: { gt: new Date() }, // چک کردن زمان انقضا
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpEntry) {
    throw new BadRequestException('کد وارد شده اشتباه است یا منقضی شده');
  }

  // ۲. پیدا کردن یا ساختن کاربر (چون لاگین و ثبت‌نام با هم است)
  let user = await this.prisma.user.findUnique({
    where: { phoneNumber },
  });

  if (!user) {
    user = await this.prisma.user.create({
      data: { phoneNumber, role: 'CUSTOMER' },
    });
  }

  // ۳. حذف کدهای OTP استفاده شده برای این شماره (اختیاری برای امنیت بیشتر)
  await this.prisma.otpCode.deleteMany({ where: { phoneNumber } });

  // ۴. تولید Token
  const payload = { sub: user.id, phoneNumber: user.phoneNumber, role: user.role };
  return {
    access_token: this.jwtService.sign(payload),
    user,
  };
  }

  async sendOtp(phoneNumber: string) {
    // ۱. تولید کد ۵ رقمی تصادفی
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    
    // ۲. تعیین زمان انقضا (مثلاً ۲ دقیقه دیگر)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 2);

    // ۳. ذخیره در دیتابیس
    await this.prisma.otpCode.create({
      data: {
        phoneNumber,
        code,
        expiresAt,
      },
    });

    // ۴. ارسال پیامک (فعلاً فقط در کنسول چاپ می‌کنیم)
    console.log(`📱 OTP for ${phoneNumber}: ${code}`);
    
    return { message: 'کد تایید ارسال شد', expiresAt };
  }
}

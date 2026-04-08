import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    // تست اتصال: بررسی می‌کنیم آیا کاربری وجود دارد یا خیر
    const userCount = await this.prisma.user.count();
    console.log(`--- Total users in DB: ${userCount} ---`);
  }

  getHello(): string {
    return 'Hello Flower Market!';
  }
}

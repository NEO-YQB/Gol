import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // دیگر نیازی به پاس دادن دستی URL در سازنده نیست
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ [Prisma]: Connected to PostgreSQL successfully (v6).');
      const count = await this.user.count();
      console.log(`📊 [Database]: ${count} users found.`);
    } catch (e) {
      console.error('❌ [Prisma]: Connection error!', e);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

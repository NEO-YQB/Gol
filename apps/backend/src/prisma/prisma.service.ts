import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ [Prisma]: Connected to PostgreSQL successfully (v6).');
    } catch (e) {
      console.error('❌ [Prisma]: Connection error!', e);
      await new Promise(res => setTimeout(res, 3000));
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

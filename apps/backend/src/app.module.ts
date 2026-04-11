import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { CategoryModule } from './modules/category/category.module';
import { join } from 'path';

@Global() // این باعث می‌شود سرویس در کل اپلیکیشن در دسترس باشد
@Module({
  imports: [ConfigModule.forRoot({
      isGlobal: true, // باعث می‌شود در تمام ماژول‌ها بدون نیاز به ایمپورت مجدد در دسترس باشد
      envFilePath: join(process.cwd(), '.env'), 
      cache: false,
  }),
    AuthModule,CategoryModule,],
  controllers: [AppController],
  providers: [AppService, PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
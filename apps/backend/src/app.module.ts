import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { CategoryModule } from './modules/category/category.module';
import { CatalogModule } from './modules/catalog/product.module';
import { StoreModule } from './modules/store/store.module'; 
import { join } from 'path';
import { AddressModule } from './modules/address/address.module';
import { FilesModule } from './modules/files/files.module';
import { RolesGuard } from './common/guards/roles.guard';
import { AbilitiesGuard } from './common/guards/abilities.guard';
import { OrderModule } from './modules/order/order.module';
import { CartModule } from './modules/cart/cart.module';
import { PaymentModule } from './modules/payment/payment.module';
import { DiscountModule } from './modules/discount/discount.module';

@Global() // این باعث می‌شود سرویس در کل اپلیکیشن در دسترس باشد
@Module({
  imports: [AuthModule, StoreModule, CatalogModule, ConfigModule.forRoot({
      isGlobal: true, // باعث می‌شود در تمام ماژول‌ها بدون نیاز به ایمپورت مجدد در دسترس باشد
      envFilePath: join(process.cwd(), '.env'), 
      cache: false,
  }),
    CategoryModule,
    AddressModule,
    FilesModule,
    OrderModule,
    CartModule,
    PaymentModule,
    DiscountModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, RolesGuard, AbilitiesGuard],
  exports: [PrismaService],
})
export class AppModule {}

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AbilitiesGuard } from './common/guards/abilities.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AddressModule } from './modules/address/address.module';
import { AdminReportsModule } from './modules/admin-reports/admin-reports.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { CatalogModule } from './modules/catalog/product.module';
import { CategoryModule } from './modules/category/category.module';
import { DiscountModule } from './modules/discount/discount.module';
import { FilesModule } from './modules/files/files.module';
import { FinanceModule } from './modules/finance/finance.module';
import { OrderModule } from './modules/order/order.module';
import { PaymentModule } from './modules/payment/payment.module';
import { StoreModule } from './modules/store/store.module';
import { SupportModule } from './modules/support/support.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Global()
@Module({
  imports: [
    AuthModule,
    AdminReportsModule,
    StoreModule,
    CatalogModule,
    ConfigModule.forRoot({
      isGlobal: true,
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
    FinanceModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, RolesGuard, AbilitiesGuard],
  exports: [PrismaService],
})
export class AppModule {}

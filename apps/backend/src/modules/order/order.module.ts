import { Module } from '@nestjs/common';
import { DiscountModule } from '../discount/discount.module';
import { FinanceModule } from '../finance/finance.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [DiscountModule, FinanceModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}

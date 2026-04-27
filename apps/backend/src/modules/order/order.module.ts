import { Module } from '@nestjs/common';
import { DiscountModule } from '../discount/discount.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [DiscountModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}

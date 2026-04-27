import { Module } from '@nestjs/common';
import { DiscountModule } from '../discount/discount.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [DiscountModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}

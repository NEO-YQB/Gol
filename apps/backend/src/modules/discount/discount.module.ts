import { Module } from '@nestjs/common';
import { StoreModule } from '../store/store.module';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { PlatformPromotionController } from './platform-promotion.controller';
import { PlatformPromotionService } from './platform-promotion.service';
import { PricingService } from './pricing.service';
import { VendorDiscountController } from './vendor-discount.controller';
import { VendorDiscountService } from './vendor-discount.service';

@Module({
  imports: [StoreModule],
  controllers: [
    VendorDiscountController,
    PlatformPromotionController,
    CouponController,
  ],
  providers: [
    VendorDiscountService,
    PlatformPromotionService,
    CouponService,
    PricingService,
  ],
  exports: [PricingService],
})
export class DiscountModule {}

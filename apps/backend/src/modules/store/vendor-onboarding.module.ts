import { Module } from '@nestjs/common'
import { VendorOnboardingController } from './vendor-onboarding.controller'
import { VendorOnboardingService } from './vendor-onboarding.service'
import { PaymentModule } from '../payment/payment.module'

@Module({
  imports: [PaymentModule],
  controllers: [VendorOnboardingController],
  providers: [VendorOnboardingService],
  exports: [VendorOnboardingService],
})
export class VendorOnboardingModule {}

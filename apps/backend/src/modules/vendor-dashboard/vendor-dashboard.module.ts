import { Module } from '@nestjs/common';
import { VendorDashboardController } from './vendor-dashboard.controller';
import { VendorDashboardService } from './vendor-dashboard.service';

@Module({
  controllers: [VendorDashboardController],
  providers: [VendorDashboardService],
  exports: [VendorDashboardService],
})
export class VendorDashboardModule {}

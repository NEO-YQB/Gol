import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { VendorHealthService } from './vendor-health.service';

@Module({
  controllers: [StoreController],
  providers: [StoreService, VendorHealthService],
  exports: [StoreService, VendorHealthService],
})
export class StoreModule {}

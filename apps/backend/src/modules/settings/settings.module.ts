import { Module } from '@nestjs/common';
import { MobileRuntimeController } from './mobile-runtime.controller';
import { MobileRuntimeService } from './mobile-runtime.service';
import { PublicSettingsController } from './public-settings.controller';
import { SettingsController } from './settings.controller';
import { SmsProviderService } from './sms-provider.service';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController, MobileRuntimeController, PublicSettingsController],
  providers: [SettingsService, SmsProviderService, MobileRuntimeService],
  exports: [SettingsService, SmsProviderService, MobileRuntimeService],
})
export class SettingsModule {}

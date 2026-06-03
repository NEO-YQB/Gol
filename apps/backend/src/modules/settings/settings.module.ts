import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SmsProviderService } from './sms-provider.service';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SmsProviderService],
  exports: [SettingsService, SmsProviderService],
})
export class SettingsModule {}

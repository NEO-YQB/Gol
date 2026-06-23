import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

@ApiTags('Public Settings')
@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('storefront-info-pages')
  @ApiOperation({ summary: 'دریافت تنظیمات عمومی صفحه‌های اطلاعاتی storefront' })
  getStorefrontInfoPagesSettings() {
    return this.settingsService.getStorefrontInfoPagesSettingsPublic();
  }
}

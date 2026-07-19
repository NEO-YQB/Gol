import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

@ApiTags('Public Settings')
@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly settingsService: SettingsService) {}


  @Get('seo')
  @ApiOperation({ summary: 'دریافت تنظیمات عمومی سئو storefront' })
  getSeoSettings() {
    return this.settingsService.getSeoSettingsPublic();
  }

  @Get('storefront-info-pages')
  @ApiOperation({ summary: 'دریافت تنظیمات عمومی صفحه‌های اطلاعاتی storefront' })
  getStorefrontInfoPagesSettings() {
    return this.settingsService.getStorefrontInfoPagesSettingsPublic();
  }

  @Get('favicon')
  @ApiOperation({ summary: 'دریافت تنظیمات عمومی فاوایکون' })
  getFaviconSettings() {
    return this.settingsService.getFaviconSettingsPublic();
  }
}

import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TestSmsSettingsDto } from './dto/test-sms-settings.dto';
import { UpdateSeoSettingsDto } from './dto/update-seo-settings.dto';
import { UpdateStorefrontInfoPagesSettingsDto } from './dto/update-storefront-info-pages-settings.dto';
import { UpdateSmsSettingsDto } from './dto/update-sms-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('sms')
  @ApiOperation({ summary: 'دریافت تنظیمات SMS.IR' })
  getSmsSettings(@GetUser() user: { id: number; roles: string[] }) {
    return this.settingsService.getSmsSettings(user);
  }

  @Patch('sms')
  @ApiOperation({ summary: 'ذخیره تنظیمات SMS.IR' })
  updateSmsSettings(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: UpdateSmsSettingsDto,
  ) {
    return this.settingsService.updateSmsSettings(user, dto);
  }

  @Post('sms')
  @ApiOperation({ summary: 'ذخیره تنظیمات SMS.IR با POST' })
  createOrUpdateSmsSettings(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: UpdateSmsSettingsDto,
  ) {
    return this.settingsService.updateSmsSettings(user, dto);
  }

  @Post('sms/test')
  @ApiOperation({ summary: 'ارسال OTP تستی از طریق تنظیمات SMS.IR' })
  sendTestSms(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: TestSmsSettingsDto,
  ) {
    return this.settingsService.sendTestSms(user, dto.phoneNumber);
  }


  @Get('seo')
  @ApiOperation({ summary: 'دریافت تنظیمات سئوی storefront' })
  getSeoSettings(@GetUser() user: { id: number; roles: string[] }) {
    return this.settingsService.getSeoSettings(user);
  }

  @Patch('seo')
  @ApiOperation({ summary: 'ذخیره تنظیمات سئوی storefront' })
  updateSeoSettings(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: UpdateSeoSettingsDto,
  ) {
    return this.settingsService.updateSeoSettings(user, { ...dto });
  }

  @Get('storefront-info-pages')
  @ApiOperation({ summary: 'دریافت تنظیمات صفحه‌های اطلاعاتی storefront' })
  getStorefrontInfoPagesSettings(@GetUser() user: { id: number; roles: string[] }) {
    return this.settingsService.getStorefrontInfoPagesSettings(user);
  }

  @Patch('storefront-info-pages')
  @ApiOperation({ summary: 'ذخیره تنظیمات صفحه‌های اطلاعاتی storefront' })
  updateStorefrontInfoPagesSettings(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: UpdateStorefrontInfoPagesSettingsDto,
  ) {
    return this.settingsService.updateStorefrontInfoPagesSettings(user, { ...dto });
  }
}

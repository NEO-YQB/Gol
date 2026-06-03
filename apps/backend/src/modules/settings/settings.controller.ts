import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { TestSmsSettingsDto } from './dto/test-sms-settings.dto';
import { UpdateSmsSettingsDto } from './dto/update-sms-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('admin/settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly authService: AuthService,
  ) {}

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

  @Post('sms/test')
  @ApiOperation({ summary: 'ارسال OTP تستی از طریق تنظیمات SMS.IR' })
  sendTestSms(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: TestSmsSettingsDto,
  ) {
    return this.authService.sendOtp(dto.phoneNumber, { forceRealProvider: true, requestedByAdmin: user.id });
  }
}

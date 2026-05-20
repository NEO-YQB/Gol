import { Controller, Post, Body, BadRequestException, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}


  @Get('session-bootstrap')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'دریافت bootstrap نشست برای فرانت پنل' })
  @ApiOkResponse({
    description: 'نقش ها و دسترسی های موثر نشست جاری',
    schema: {
      example: {
        roles: ['SEO_MANAGER'],
        effectivePermissions: [
          { action: 'read', subject: 'Article' },
          { action: 'update', subject: 'Article' },
        ],
        vendorOnboarding: {
          applicationStatus: 'SUBMITTED',
          productStatus: 'DRAFT',
          storeActivatedAt: null,
        },
      },
    },
  })
  getSessionBootstrap(@GetUser() user: { id: number; roles: string[]; phoneNumber?: string }) {
    return this.authService.getSessionBootstrap(user);
  }

  @Post('send-otp')
  @ApiOperation({ summary: 'ارسال کد OTP برای شماره موبایل' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phoneNumber'],
      properties: {
        phoneNumber: { type: 'string', example: '09121234567' },
      },
    },
  })
  @ApiOkResponse({
    description: 'کد OTP با موفقیت ایجاد و ارسال شد',
    schema: {
      example: {
        message: 'کد تایید ارسال شد',
        expiresAt: '2026-05-05T10:35:00.000Z',
      },
    },
  })
  async sendOtp(@Body('phoneNumber') phoneNumber: string) {
    if (!phoneNumber) {
      throw new BadRequestException('شماره موبایل الزامی است');
    }
    return this.authService.sendOtp(phoneNumber);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'تایید OTP و دریافت JWT' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phoneNumber', 'code'],
      properties: {
        phoneNumber: { type: 'string', example: '09121234567' },
        code: { type: 'string', example: '123456' },
      },
    },
  })
  @ApiOkResponse({
    description: 'OTP با موفقیت تایید شد و توکن دسترسی برگشت',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 12,
          phoneNumber: '09121234567',
          fullName: 'مریم احمدی',
          roles: ['CUSTOMER'],
        },
      },
    },
  })
  async verifyOtp(
    @Body('phoneNumber') phoneNumber: string,
    @Body('code') code: string,
  ) {
    if (!phoneNumber || !code) {
      throw new BadRequestException('شماره موبایل و کد الزامی هستند');
    }
    return this.authService.verifyOtp(phoneNumber, code);
  }
}

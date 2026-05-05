import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

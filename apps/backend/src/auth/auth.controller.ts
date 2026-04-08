import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  async sendOtp(@Body('phoneNumber') phoneNumber: string) {
    if (!phoneNumber) {
      throw new BadRequestException('شماره موبایل الزامی است');
    }
    return this.authService.sendOtp(phoneNumber);
  }

  @Post('verify-otp')
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

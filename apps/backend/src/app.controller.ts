import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {

  @Get('profile')
  @UseGuards(AuthGuard('jwt')) // محافظت از این مسیر
  getProfile(@Request() req) {
    return {
      message: 'شما به این مسیر امن دسترسی دارید',
      user: req.user,
    };
  }
}

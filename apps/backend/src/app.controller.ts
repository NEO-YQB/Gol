import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('health')

@Controller()
export class AppController {

  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
  
  @Get('profile')
  @UseGuards(AuthGuard('jwt')) 
  getProfile(@Request() req) {
    return {
      message: 'شما به این مسیر امن دسترسی دارید',
      user: req.user,
    };
  }
}

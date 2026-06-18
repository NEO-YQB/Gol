import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MobileRuntimeService } from './mobile-runtime.service';

@ApiTags('Mobile Runtime')
@Controller('mobile-app')
export class MobileRuntimeController {
  constructor(private readonly mobileRuntimeService: MobileRuntimeService) {}

  @Get('config')
  @ApiOperation({ summary: 'دریافت تنظیمات عمومی runtime برای اپ موبایل' })
  getConfig() {
    return this.mobileRuntimeService.getPublicConfig();
  }

  @Get('reverse-geocode')
  @ApiOperation({ summary: 'تبدیل مختصات به آدرس از طریق proxy بک‌اند' })
  @ApiQuery({ name: 'lat', type: Number, required: true })
  @ApiQuery({ name: 'lng', type: Number, required: true })
  reverseGeocode(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.mobileRuntimeService.reverseGeocode(Number(lat), Number(lng));
  }
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

class FaviconItemDto {
  @ApiPropertyOptional({ description: 'آدرس favicon با فرمت .ico' })
  @IsOptional()
  faviconIco?: string;

  @ApiPropertyOptional({ description: 'آدرس favicon با فرمت .png' })
  @IsOptional()
  faviconPng?: string;
}

class StorefrontFaviconDto extends FaviconItemDto {
  @ApiPropertyOptional({ description: 'آدرس Apple Touch Icon' })
  @IsOptional()
  appleTouchIcon?: string;
}

export class UpdateFaviconSettingsDto {
  @ApiPropertyOptional({ description: 'تنظیمات فاوایکون استورفرونت' })
  @IsOptional()
  @IsObject()
  storefront?: StorefrontFaviconDto;

  @ApiPropertyOptional({ description: 'تنظیمات فاوایکون پنل ادمین' })
  @IsOptional()
  @IsObject()
  adminPanel?: FaviconItemDto;

  @ApiPropertyOptional({ description: 'تنظیمات فاوایکون پنل فروشنده' })
  @IsOptional()
  @IsObject()
  vendorPanel?: FaviconItemDto;
}

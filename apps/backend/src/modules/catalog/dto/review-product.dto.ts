import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ReviewProductDto {
  @ApiPropertyOptional({ description: 'آیا محصول تایید شده است؟' })
  @IsOptional()
  @IsBoolean()
  approved?: boolean;

  @ApiPropertyOptional({ description: 'آیا محصول برای اصلاح بازگردانده شود؟' })
  @IsOptional()
  @IsBoolean()
  requestChanges?: boolean;

  @ApiPropertyOptional({ description: 'یادداشت بازبینی ادمین' })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}

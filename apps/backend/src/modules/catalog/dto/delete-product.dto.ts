import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteProductDto {
  @ApiPropertyOptional({
    description: 'آدرس مقصد برای ریدایرکت لینک محصول حذف‌شده',
    example: '/categories/rose-bouquets',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  redirectTargetUrl?: string;
}

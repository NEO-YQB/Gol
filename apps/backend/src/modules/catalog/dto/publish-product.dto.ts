import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class PublishProductDto {
  @ApiPropertyOptional({ description: 'آیا محصول منتشر شود؟', default: true })
  @IsOptional()
  @IsBoolean()
  publish?: boolean;

  @ApiPropertyOptional({ description: 'یادداشت انتشار یا عدم انتشار' })
  @IsOptional()
  @IsString()
  note?: string;
}

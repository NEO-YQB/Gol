import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStoreStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive!: boolean;

  @ApiPropertyOptional({
    description: 'برای تأیید اولیه فروشگاه در همان عملیات فعال‌سازی',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({
    example: 'تعلیق موقت تا تکمیل بررسی مدارک فروشنده',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ToggleProductPurchasableDto {
  @ApiProperty({ description: 'آیا محصول قابل خرید باشد؟' })
  @IsBoolean()
  isPurchasable!: boolean;

  @ApiProperty({ description: 'آیا محصول آرشیو شود؟', required: false })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @ApiProperty({ description: 'یادداشت ادمین برای این تغییر', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

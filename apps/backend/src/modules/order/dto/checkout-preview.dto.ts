import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CheckoutPreviewDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  addressId!: number;

  @ApiPropertyOptional({ example: 'FIRSTBUY20' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  couponCode?: string;
}

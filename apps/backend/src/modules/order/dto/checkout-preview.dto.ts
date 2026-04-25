import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CheckoutPreviewDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  addressId!: number;
}

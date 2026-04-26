import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  orderId!: number;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  gatewayConfigId?: number;

  @ApiProperty({ required: false, example: 'mock-default' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  gatewayKey?: string;
}

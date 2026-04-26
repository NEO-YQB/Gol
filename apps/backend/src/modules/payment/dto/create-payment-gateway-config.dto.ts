import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePaymentGatewayConfigDto {
  @ApiProperty({ example: 'zarinpal-main' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key!: string;

  @ApiProperty({ example: 'زرین پال اصلی' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  displayName!: string;

  @ApiProperty({ example: 'zarinpal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  driver!: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ required: false, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priority?: number;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  sandboxMode?: boolean;

  @ApiProperty({ required: false, example: { merchantId: 'xxxx' } })
  @IsOptional()
  @IsObject()
  merchantConfig?: Record<string, unknown>;

  @ApiProperty({ required: false, example: { baseUrl: 'https://api.example.com' } })
  @IsOptional()
  @IsObject()
  technicalConfig?: Record<string, unknown>;

  @ApiProperty({ required: false, example: 'https://api.example.com/v1/payments/callback/zarinpal-main' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  callbackUrl?: string;

  @ApiProperty({ required: false, example: 'https://store.example.com/payment/result' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  returnUrl?: string;

  @ApiProperty({ required: false, example: 'درگاه اصلی برای پرداخت های production' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ required: false, example: { shard: 'primary' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

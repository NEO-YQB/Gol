import { ApiProperty } from '@nestjs/swagger';
import { DeliveryType, PaymentMethod } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateOrderFromCartDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  addressId!: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.COD })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiProperty({ enum: DeliveryType, required: false, example: DeliveryType.STANDARD })
  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @ApiProperty({ required: false, example: 'امروز 18 تا 21' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  deliveryWindowLabel?: string;

  @ApiProperty({ required: false, example: 'FIRSTBUY20' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  couponCode?: string;

  @ApiProperty({ example: '0012345678' })
  @IsString()
  @Matches(/^\d{10}$/)
  nationalId!: string;
}

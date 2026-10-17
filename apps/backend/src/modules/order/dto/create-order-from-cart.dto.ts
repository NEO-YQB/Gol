import { ApiProperty } from '@nestjs/swagger';
import { DeliveryType, PaymentMethod } from '@prisma/client';
import { Equals, IsEnum, IsInt, IsISO8601, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateOrderFromCartDto {
  @ApiProperty({ required: false, description: 'زمان تحویل با منطقه زمانی، حداکثر پنج روز آینده', example: '2026-10-19T15:00:00+03:30' })
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  scheduledDeliveryAt?: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  addressId!: number;

  @ApiProperty({ enum: [PaymentMethod.ONLINE], example: PaymentMethod.ONLINE })
  @Equals(PaymentMethod.ONLINE, { message: 'ثبت سفارش فقط با پرداخت آنلاین امکان‌پذیر است' })
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

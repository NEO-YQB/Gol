import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsISO8601,
  Matches,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { DeliveryType, PaymentMethod } from '@prisma/client';

export class CreateOrderItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  productId!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ required: false, description: 'زمان تحویل با منطقه زمانی، حداکثر پنج روز آینده', example: '2026-10-19T15:00:00+03:30' })
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  scheduledDeliveryAt?: string;

  @ApiProperty({
    type: [CreateOrderItemDto],
    example: [
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: 2 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiProperty({ example: 3, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  addressId?: number;

  @ApiProperty({ enum: PaymentMethod, required: false, example: PaymentMethod.COD })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({ enum: DeliveryType, required: false, example: DeliveryType.STANDARD })
  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @ApiProperty({ required: false, example: 'امروز 18 تا 21' })
  @IsOptional()
  @IsString()
  deliveryWindowLabel?: string;

  @ApiProperty({ required: false, example: 'FIRSTBUY20' })
  @IsOptional()
  @IsString()
  couponCode?: string;
}

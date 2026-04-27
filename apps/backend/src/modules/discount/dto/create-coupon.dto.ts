import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CouponApplyOn, DiscountValueType } from '@prisma/client';

export class CreateCouponDto {
  @ApiProperty({ example: 'FIRSTBUY20' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'کد کوپن فقط می‌تواند شامل حروف انگلیسی، عدد، خط تیره و زیرخط باشد',
  })
  code!: string;

  @ApiProperty({ example: 'تخفیف خرید اول' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ required: false, example: 'فقط برای اولین سفارش کاربر' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: DiscountValueType, example: DiscountValueType.PERCENTAGE })
  @IsEnum(DiscountValueType)
  valueType!: DiscountValueType;

  @ApiProperty({ example: 20 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999.99)
  value!: number;

  @ApiProperty({ required: false, example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priority?: number;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isExclusive?: boolean;

  @ApiProperty({ enum: CouponApplyOn, required: false, example: CouponApplyOn.DISCOUNTED_SUBTOTAL })
  @IsOptional()
  @IsEnum(CouponApplyOn)
  applyOn?: CouponApplyOn;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  firstOrderOnly?: boolean;

  @ApiProperty({ required: false, example: 500000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minOrderAmount?: number;

  @ApiProperty({ required: false, example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perUserUsageLimit?: number;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  allowVendorDiscountStacking?: boolean;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  allowPlatformPromotionStacking?: boolean;

  @ApiProperty({ required: false, example: '2026-07-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startAt?: Date;

  @ApiProperty({ required: false, example: '2026-07-31T23:59:59.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date;

  @ApiProperty({ required: false, example: [12, 14] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  productIds?: number[];

  @ApiProperty({ required: false, example: [3] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  storeIds?: number[];

  @ApiProperty({ required: false, example: [7] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  categoryIds?: number[];

  @ApiProperty({ required: false, example: { channel: 'crm-panel' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

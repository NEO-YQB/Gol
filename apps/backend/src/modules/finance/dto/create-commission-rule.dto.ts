import { ApiProperty } from '@nestjs/swagger';
import { CommissionRuleScope } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCommissionRuleDto {
  @ApiProperty({ enum: CommissionRuleScope, example: CommissionRuleScope.GLOBAL })
  @IsEnum(CommissionRuleScope)
  scope!: CommissionRuleScope;

  @ApiProperty({ required: false, example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  storeId?: number;

  @ApiProperty({ example: 'قانون پیش فرض پلتفرم' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ required: false, example: 'کمیسیون عمومی همه فروشگاه ها' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionRate!: number;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  systemServiceFeeRate?: number;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  systemServiceFeeFixed?: number;

  @ApiProperty({ required: false, example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  settlementHoldDays?: number;

  @ApiProperty({ required: false, example: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  complaintWindowHours?: number;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  autoReleaseEnabled?: boolean;

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

  @ApiProperty({ required: false, example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startAt?: Date;

  @ApiProperty({ required: false, example: '2026-05-31T23:59:59.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date;

  @ApiProperty({ required: false, example: 'پاداش شروع همکاری' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @ApiProperty({ required: false, example: { source: 'vendor-support' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

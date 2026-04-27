import { ApiProperty } from '@nestjs/swagger';
import { WalletTransactionDirection, WalletTransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ManualWalletAdjustmentDto {
  @ApiProperty({ enum: WalletTransactionDirection, example: WalletTransactionDirection.CREDIT })
  @IsEnum(WalletTransactionDirection)
  direction!: WalletTransactionDirection;

  @ApiProperty({ required: false, enum: WalletTransactionType, example: WalletTransactionType.MANUAL_CREDIT })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType;

  @ApiProperty({ example: 250000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: 'پاداش فروش ویژه' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ required: false, example: 'به دلیل عملکرد خوب در کمپین' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ required: false, example: 'batch-may-01' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchKey?: string;

  @ApiProperty({ required: false, example: { source: 'admin-panel' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

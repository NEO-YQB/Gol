import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AdminUpsertVendorRiskPolicyDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  autoSettlementHoldEnabled?: boolean;

  @ApiPropertyOptional({ example: 14 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  settlementHoldDaysOverride?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  manualReviewRequired?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  blockNewDiscounts?: boolean;

  @ApiPropertyOptional({ example: 'فروشنده به دليل افزايش ريفاندها فعلا در حالت مانيتورينگ است.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({ example: { reasonCode: 'HIGH_REFUND_RATE' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

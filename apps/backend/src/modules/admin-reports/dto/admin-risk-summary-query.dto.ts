import { ApiPropertyOptional } from '@nestjs/swagger';
import { VendorHealthStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AdminReportDateRangeQueryDto } from './admin-report-date-range-query.dto';

export class AdminRiskSummaryQueryDto extends AdminReportDateRangeQueryDto {
  @ApiPropertyOptional({ enum: VendorHealthStatus })
  @IsOptional()
  @IsEnum(VendorHealthStatus)
  status?: VendorHealthStatus;

  @ApiPropertyOptional({ example: 'گل سرخ' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { VendorHealthStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class AdminListVendorHealthQueryDto {
  @ApiPropertyOptional({ enum: VendorHealthStatus })
  @IsOptional()
  @IsEnum(VendorHealthStatus)
  status?: VendorHealthStatus;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

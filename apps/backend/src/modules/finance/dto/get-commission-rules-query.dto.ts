import { ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionRuleScope } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class GetCommissionRulesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: CommissionRuleScope })
  @IsOptional()
  @IsEnum(CommissionRuleScope)
  scope?: CommissionRuleScope;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value))
  @IsBoolean()
  isActive?: boolean;
}

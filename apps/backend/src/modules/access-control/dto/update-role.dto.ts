import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'FINANCE_OPERATOR' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_]+$/)
  name?: string;

  @ApiPropertyOptional({ example: 'اپراتور مالی' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: 'دسترسی به جریان های مالی و settlement' })
  @IsOptional()
  @IsString()
  description?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'FINANCE_OPERATOR', description: 'نام انگلیسی یکتا برای role' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_]+$/)
  name!: string;

  @ApiPropertyOptional({ example: 'اپراتور مالی' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: 'دسترسی به جریان های مالی و settlement' })
  @IsOptional()
  @IsString()
  description?: string;
}

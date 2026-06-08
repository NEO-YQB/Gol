import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: '09121234567' })
  @IsString()
  @Matches(/^09\d{9}$/)
  phoneNumber!: string;

  @ApiPropertyOptional({ example: 'مریم احمدی' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'maryam@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '0012345678' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/)
  nationalId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 3],
    description: 'roleهای اولیه کاربر در لحظه ایجاد',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  roleIds?: number[];
}

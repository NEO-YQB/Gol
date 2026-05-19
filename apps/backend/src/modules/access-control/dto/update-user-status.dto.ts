import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ example: false, description: 'فعال یا غیرفعال بودن حساب کاربری' })
  @IsBoolean()
  isActive!: boolean;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminManualRefundDto {
  @ApiProperty({ example: 'بازگشت وجه دستی بعد از تایید مالی' })
  @IsString()
  @MaxLength(2000)
  reason!: string;

  @ApiPropertyOptional({ example: 'رسید بانکی به صورت آفلاین برای کاربر ثبت شد' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

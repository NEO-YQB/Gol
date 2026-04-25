import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class OptionalOrderReasonDto {
  @ApiProperty({ required: false, example: 'مشتری تصمیم به لغو سفارش گرفت.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiProperty({ required: false, example: 'درخواست از طریق پشتیبانی ثبت شد.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

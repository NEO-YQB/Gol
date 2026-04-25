import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class OrderActionNoteDto {
  @ApiProperty({ required: false, example: 'سفارش آماده شد و برای ارسال تحویل پیک شد.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

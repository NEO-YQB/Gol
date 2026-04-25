import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class OrderReasonDto {
  @ApiProperty({ example: 'گل مورد نظر امروز در انبار موجود نیست.' })
  @IsString()
  @MaxLength(1000)
  reason!: string;

  @ApiProperty({ required: false, example: 'با مشتری برای جایگزین تماس گرفته شد اما تایید نکرد.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

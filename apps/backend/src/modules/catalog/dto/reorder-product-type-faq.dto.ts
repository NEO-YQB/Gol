import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class ReorderProductTypeFaqDto {
  @ApiProperty({ description: 'لیست شناسه FAQها به ترتیب جدید', example: [3, 1, 2] })
  @IsArray()
  @IsInt({ each: true })
  faqIds!: number[];
}

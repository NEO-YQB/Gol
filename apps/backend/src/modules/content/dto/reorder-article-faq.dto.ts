import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderArticleFaqDto {
  @ApiProperty({ description: 'لیست شناسه FAQ‌ها به ترتیب جدید', example: [3, 1, 2] })
  @IsArray()
  @IsInt({ each: true })
  faqIds!: number[];
}

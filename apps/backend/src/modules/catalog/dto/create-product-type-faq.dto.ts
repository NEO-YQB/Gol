import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProductTypeFaqDto {
  @ApiProperty({ description: 'متن سوال', example: 'آیا این نوع محصول همیشه موجود است؟' })
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiProperty({ description: 'متن پاسخ', example: 'بسته به فصل و موجودی ممکن است تغییر کند.' })
  @IsString()
  @IsNotEmpty()
  answer!: string;

  @ApiPropertyOptional({ description: 'ترتیب نمایش', example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'آیا فعال باشد؟', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

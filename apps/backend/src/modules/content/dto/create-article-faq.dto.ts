import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateArticleFaqDto {
  @ApiProperty({ description: 'متن سوال', example: 'چطور عمر گل شاخه بریده را بیشتر کنم؟' })
  @IsString({ message: 'سوال باید رشته باشد' })
  @IsNotEmpty({ message: 'سوال نباید خالی باشد' })
  question!: string;

  @ApiProperty({ description: 'متن پاسخ', example: 'آب گلدان را روزانه تعویض کنید و ساقه را مورب ببرید.' })
  @IsString({ message: 'پاسخ باید رشته باشد' })
  @IsNotEmpty({ message: 'پاسخ نباید خالی باشد' })
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

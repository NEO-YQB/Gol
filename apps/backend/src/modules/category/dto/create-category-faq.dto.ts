import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryFaqDto {
  @ApiProperty({ description: 'متن سوال', example: 'آیا امکان بازگشت کالا وجود دارد؟' })
  @IsString({ message: 'سوال باید رشته باشد' })
  @IsNotEmpty({ message: 'سوال نباید خالی باشد' })
  question!: string;

  @ApiProperty({ description: 'متن پاسخ', example: 'بله تا ۷ روز پس از خرید امکان بازگشت وجود دارد.' })
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

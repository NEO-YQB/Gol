import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class FilterEntryDto {
  @ApiProperty({ description: 'نوع فیلتر', example: 'occasion' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ description: 'شناسه مقدار فیلتر', example: 5 })
  @IsInt()
  @Min(1)
  valueId!: number;

  @ApiPropertyOptional({ description: 'نام نمایشی فیلتر', example: 'خواستگاری' })
  @IsOptional()
  @IsString()
  label?: string;
}

export class CreateSeoLandingDto {
  @ApiProperty({ description: 'نام داخلی لندینگ', example: 'سبد گل خواستگاری' })
  @IsString({ message: 'نام داخلی باید رشته باشد' })
  @IsNotEmpty({ message: 'نام داخلی نباید خالی باشد' })
  internalName!: string;

  @ApiProperty({ description: 'اسلاگ URL', example: 'flower-basket-proposal' })
  @IsString({ message: 'اسلاگ باید رشته باشد' })
  @IsNotEmpty({ message: 'اسلاگ نباید خالی باشد' })
  slug!: string;

  @ApiProperty({ description: 'شناسه دسته‌بندی اصلی', example: 1 })
  @IsInt({ message: 'شناسه دسته‌بندی باید عدد صحیح باشد' })
  @Min(1, { message: 'شناسه دسته‌بندی باید بزرگتر از صفر باشد' })
  categoryId!: number;

  @ApiProperty({ description: 'فیلترهای ترکیبی', type: [FilterEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterEntryDto)
  filterConfig!: FilterEntryDto[];

  @ApiPropertyOptional({ description: 'فعال/غیرفعال', example: true })
  @IsOptional()
  @IsBoolean({ message: 'IsActive باید بولیین باشد' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'عنوان متا', example: 'خرید سبد گل خواستگاری' })
  @IsOptional()
  @IsString({ message: 'عنوان متا باید رشته باشد' })
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'توضیحات متا' })
  @IsOptional()
  @IsString({ message: 'توضیحات متا باید رشته باشد' })
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'تگ H1 صفحه' })
  @IsOptional()
  @IsString({ message: 'H1 باید رشته باشد' })
  h1Tag?: string;

  @ApiPropertyOptional({ description: 'محتوای سئو (HTML)' })
  @IsOptional()
  @IsString({ message: 'محتوای سئو باید رشته باشد' })
  seoContent?: string;
}

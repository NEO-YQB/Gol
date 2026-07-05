import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; 

export class CreateCategoryDto {
  @ApiProperty({ description: 'نام دسته‌بندی', example: 'گیاهان آپارتمانی' })
  @IsString({ message: 'نام دسته‌بندی باید رشته باشد' })
  @IsNotEmpty({ message: 'نام دسته‌بندی نباید خالی باشد' })
  name!: string;

  @ApiProperty({ description: 'اسلاگ دسته‌بندی (برای URL)', example: 'indoor-plants' })
  @IsString({ message: 'اسلاگ باید رشته باشد' })
  @IsNotEmpty({ message: 'اسلاگ نباید خالی باشد' })
  slug!: string;

  @ApiPropertyOptional({ description: 'شناسه دسته‌بندی والد (اختیاری)', example: 1 })
  @IsOptional()
  @IsInt({ message: 'شناسه والد باید عدد صحیح باشد' })
  @Min(1, { message: 'شناسه والد باید بزرگتر از صفر باشد' })
  parentId?: number;

  @ApiPropertyOptional({ description: 'توضیحات دسته‌بندی (اختیاری)', example: 'انواع گل و گیاه مناسب نگهداری در منزل' })
  @IsOptional()
  @IsString({ message: 'توضیحات باید رشته باشد' })
  description?: string;

  @ApiPropertyOptional({ description: 'آدرس تصویر دسته‌بندی (اختیاری)', example: 'https://example.com/category-image.jpg' })
  @IsOptional()
  @IsString({ message: 'آدرس تصویر باید رشته باشد' })
  image?: string;

  @ApiPropertyOptional({ description: 'متن جایگزین تصویر دسته‌بندی (Alt)', example: 'دسته گیاهان آپارتمانی' })
  @IsOptional()
  @IsString({ message: 'متن ALT تصویر باید رشته باشد' })
  imageAlt?: string;

  @ApiPropertyOptional({ description: 'آدرس تصویر بندانگشتی' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'عنوان متا برای SEO', example: 'خرید گیاهان آپارتمانی' })
  @IsOptional()
  @IsString({ message: 'عنوان متا باید رشته باشد' })
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'توضیحات متا برای SEO', example: 'بهترین گیاهان آپارتمانی برای منزل شما' })
  @IsOptional()
  @IsString({ message: 'توضیحات متا باید رشته باشد' })
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'آیا دسته‌بندی برای SEO ایندکس شود؟', example: true })
  @IsOptional()
  @IsBoolean({ message: 'IsIndexed باید بولیین باشد' })
  isIndexed?: boolean;

  @ApiPropertyOptional({ description: 'آیا این دسته‌بندی کمپین است؟', example: false })
  @IsOptional()
  @IsBoolean({ message: 'IsCampaign باید بولیین باشد' })
  isCampaign?: boolean;
}
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateArticleCategoryDto {
  @ApiProperty({ example: 'نگهداری گل' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'flower-care' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({ example: 'مقالات مربوط به نگهداری و مراقبت از گل و گیاه' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'در این دسته‌بندی می‌توانید همه مقاله‌های نگهداری گل و گیاه را پیدا کنید.' })
  @IsOptional()
  @IsString()
  introText?: string;

  @ApiPropertyOptional({ example: 1, description: 'شناسه دسته‌بندی والد برای ساختار درختی محتوا' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number;

  @ApiPropertyOptional({ example: 'https://example.com/article-categories/flower-care.jpg' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ example: 'مقالات نگهداری گل' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ example: 'راهنمای کامل نگهداری گل و گیاه در خانه' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ example: 'https://example.com/blog/flower-care' })
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  robotsIndex?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  robotsFollow?: boolean;

  @ApiPropertyOptional({ example: 'نگهداری گل | وبلاگ' })
  @IsOptional()
  @IsString()
  ogTitle?: string;

  @ApiPropertyOptional({ example: 'بهترین راهنمای نگهداری گل و گیاه' })
  @IsOptional()
  @IsString()
  ogDescription?: string;

  @ApiPropertyOptional({ example: 'https://example.com/og/flower-care.jpg' })
  @IsOptional()
  @IsString()
  ogImage?: string;
}

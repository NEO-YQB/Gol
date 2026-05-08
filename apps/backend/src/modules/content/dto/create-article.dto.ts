import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateArticleDto {
  @ApiProperty({ example: 'راهنمای نگهداری رز شاخه بریده' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'cut-rose-care-guide' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({ example: 'نکات کلیدی برای افزایش عمر رز شاخه بریده در خانه' })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiPropertyOptional({ example: 'https://example.com/articles/rose-cover.jpg' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ example: 'مراقبت از گل رز' })
  @IsOptional()
  @IsString()
  focusKeyword?: string;

  @ApiPropertyOptional({ example: 'در این مقاله باید روی intent آموزشی و لینک به دسته‌بندی رز تمرکز شود.' })
  @IsOptional()
  @IsString()
  seoNotes?: string;

  @ApiProperty({ example: '<p>محتوای کامل مقاله...</p>' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ enum: ArticleStatus, example: ArticleStatus.DRAFT })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  authorId!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  categoryId!: number;

  @ApiPropertyOptional({ example: [1, 2], type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  tagIds?: number[];

  @ApiPropertyOptional({ example: 'راهنمای نگهداری رز' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ example: 'آموزش افزایش ماندگاری رز شاخه بریده' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ example: 'https://example.com/blog/cut-rose-care-guide' })
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

  @ApiPropertyOptional({ example: 'رز شاخه بریده | وبلاگ گل' })
  @IsOptional()
  @IsString()
  ogTitle?: string;

  @ApiPropertyOptional({ example: 'نکات مهم نگهداری رز شاخه بریده' })
  @IsOptional()
  @IsString()
  ogDescription?: string;

  @ApiPropertyOptional({ example: 'https://example.com/og/rose-guide.jpg' })
  @IsOptional()
  @IsString()
  ogImage?: string;
}

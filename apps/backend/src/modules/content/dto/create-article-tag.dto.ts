import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateArticleTagDto {
  @ApiProperty({ example: 'رز' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'rose' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({ example: 'مقاله‌های مرتبط با گل رز' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'آرشیو مقاله‌های مرتبط با گل رز و نگهداری آن' })
  @IsOptional()
  @IsString()
  introText?: string;

  @ApiPropertyOptional({ example: 'مقاله‌های رز' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ example: 'آموزش و مقاله‌های مرتبط با رز' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ example: 'https://example.com/blog/tags/rose' })
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

  @ApiPropertyOptional({ example: 'رز | وبلاگ' })
  @IsOptional()
  @IsString()
  ogTitle?: string;

  @ApiPropertyOptional({ example: 'مقاله‌های مرتبط با گل رز' })
  @IsOptional()
  @IsString()
  ogDescription?: string;

  @ApiPropertyOptional({ example: 'https://example.com/og/tags/rose.jpg' })
  @IsOptional()
  @IsString()
  ogImage?: string;
}

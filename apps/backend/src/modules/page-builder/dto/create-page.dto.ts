import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PageBlockDto } from './page-block.dto';

export enum StorefrontPageType {
  HOME = 'HOME',
  LANDING = 'LANDING',
  CAMPAIGN = 'CAMPAIGN',
  STATIC = 'STATIC',
}

export enum StorefrontHeaderStickyVariant {
  FULL = 'full',
  FLOATING = 'floating',
}

export class HeaderMenuItemDto {
  @ApiProperty({ example: 'فروشگاه‌ها' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string;

  @ApiProperty({ example: '/stores' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  href!: string;
}

export class StorefrontHeaderConfigDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  transparentOnTop?: boolean;

  @ApiPropertyOptional({ enum: StorefrontHeaderStickyVariant, example: StorefrontHeaderStickyVariant.FLOATING })
  @IsOptional()
  @IsEnum(StorefrontHeaderStickyVariant)
  stickyVariant?: StorefrontHeaderStickyVariant;

  @ApiPropertyOptional({ example: 'گلینو' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brandLabel?: string;

  @ApiPropertyOptional({ example: '/' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  brandHref?: string;

  @ApiPropertyOptional({ type: [HeaderMenuItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => HeaderMenuItemDto)
  menuItems?: HeaderMenuItemDto[];
}

export class CreatePageDto {
  @ApiProperty({ example: 'صفحه اصلی فرانت‌استور' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    example: '/',
    description: 'Use `/` for home page. Other pages should use normalized lowercase slugs such as `yalda` or `campaigns/yalda`.',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\/$|^[a-z0-9]+(?:[/-][a-z0-9]+)*$/, {
    message: 'slug must be `/` or a lowercase path like `yalda` or `campaigns/yalda`',
  })
  slug!: string;

  @ApiPropertyOptional({ enum: StorefrontPageType, default: StorefrontPageType.LANDING })
  @IsOptional()
  @IsEnum(StorefrontPageType)
  pageType?: StorefrontPageType;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable storefront-side response caching for catalog/category/vendor enrichment.',
  })
  @IsOptional()
  @IsBoolean()
  cacheEnabled?: boolean;

  @ApiPropertyOptional({ example: 'خرید آنلاین گل | صفحه اصلی' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  metaTitle?: string;

  @ApiPropertyOptional({ type: StorefrontHeaderConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StorefrontHeaderConfigDto)
  headerConfig?: StorefrontHeaderConfigDto;

  @ApiPropertyOptional({ example: 'خرید گل و هدیه با ارسال سریع از فروشگاه‌های منتخب.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  metaDescription?: string;

  @ApiPropertyOptional({ type: [String], example: ['گل', 'ارسال فوری', 'هدیه'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ example: 'https://cdn.example.com/seo/home-og.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ogImage?: string;

  @ApiPropertyOptional({ example: 'https://masterdebug.ir/' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  canonicalUrl?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  noIndex?: boolean;

  @ApiProperty({ type: [PageBlockDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PageBlockDto)
  blocks!: PageBlockDto[];
}

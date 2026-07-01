import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
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

export enum StorefrontHeaderAuthPreviewMode {
  GUEST = 'guest',
  AUTHENTICATED = 'authenticated',
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

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  highlighted?: boolean;

  @ApiPropertyOptional({ example: '#ffffff' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  textColor?: string;

  @ApiPropertyOptional({ example: 'rgba(255,255,255,0.16)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  backgroundColor?: string;
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

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.svg' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  logoImageUrl?: string;

  @ApiPropertyOptional({ example: '#173126' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  textColor?: string;

  @ApiPropertyOptional({ example: '#6e6152' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  mutedTextColor?: string;

  @ApiPropertyOptional({ example: 'rgba(255,251,245,0.42)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  glassBackgroundColor?: string;

  @ApiPropertyOptional({ example: 'rgba(255,255,255,0.2)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  glassBorderColor?: string;

  @ApiPropertyOptional({ example: '#1f6a52' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  actionBackgroundColor?: string;

  @ApiPropertyOptional({ example: '#ffffff' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  actionTextColor?: string;

  @ApiPropertyOptional({ example: '#173126' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  dropdownTriggerTextColor?: string;

  @ApiPropertyOptional({ example: 'rgba(255,255,255,0.35)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  dropdownTriggerBackgroundColor?: string;

  @ApiPropertyOptional({ example: 'rgba(255,251,245,0.96)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  dropdownPanelBackgroundColor?: string;

  @ApiPropertyOptional({ example: '#173126' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  dropdownPanelTextColor?: string;

  @ApiPropertyOptional({ example: 'rgba(255,255,255,0.2)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  dropdownPanelBorderColor?: string;

  @ApiPropertyOptional({ example: 'rgba(255,255,255,0.52)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  dropdownPanelHoverBackgroundColor?: string;

  @ApiPropertyOptional({ enum: StorefrontHeaderAuthPreviewMode, example: StorefrontHeaderAuthPreviewMode.GUEST })
  @IsOptional()
  @IsEnum(StorefrontHeaderAuthPreviewMode)
  authPreviewMode?: StorefrontHeaderAuthPreviewMode;

  @ApiPropertyOptional({ example: 'افشین' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  authPreviewName?: string;

  @ApiPropertyOptional({ type: [HeaderMenuItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => HeaderMenuItemDto)
  menuItems?: HeaderMenuItemDto[];
}

export class FooterLinkItemDto {
  @ApiProperty({ example: 'درباره ما' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string;

  @ApiProperty({ example: '/about' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  href!: string;
}

export class FooterLinkColumnDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 'راهنما' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ type: [FooterLinkItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => FooterLinkItemDto)
  items?: FooterLinkItemDto[];
}

export class FooterBadgeItemDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 'ای‌نماد' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/trust/enamad.png' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/licenses' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  href?: string;
}

export class FooterSocialItemDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ example: 'Instagram' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string;

  @ApiPropertyOptional({ example: 'instagram' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/socials/instagram.png' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  @ApiProperty({ example: 'https://instagram.com/brand' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  href!: string;
}

export class FooterAppDownloadDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 'دانلود اپلیکیشن' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ example: 'https://cafebazaar.ir/app/com.golino.vendorapp' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bazaarUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/bazaar-icon.png' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bazaarImageUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/app.apk' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  directUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/android-icon.png' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  directImageUrl?: string;
}

export class StorefrontFooterConfigDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: '#173126' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  backgroundColor?: string;

  @ApiPropertyOptional({ example: '#f5efe4' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  textColor?: string;

  @ApiPropertyOptional({ example: '#d8c9b4' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  mutedTextColor?: string;

  @ApiPropertyOptional({ example: '#2a5d49' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accentColor?: string;

  @ApiPropertyOptional({ example: 'rgba(255,255,255,0.12)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  borderColor?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  brandEnabled?: boolean;

  @ApiPropertyOptional({ example: 34 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(60)
  brandWidthPercent?: number;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo-footer.png' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  brandLogoImageUrl?: string;

  @ApiPropertyOptional({ example: '/' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  brandLogoHref?: string;

  @ApiPropertyOptional({ example: 'گلینو، انتخابی برای ارسال گل و هدیه با تجربه‌ای لوکس و ساده.' })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  brandDescription?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  linksEnabled?: boolean;

  @ApiPropertyOptional({ example: 36 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(60)
  linksWidthPercent?: number;

  @ApiPropertyOptional({ type: [FooterLinkColumnDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => FooterLinkColumnDto)
  linkColumns?: FooterLinkColumnDto[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  trustEnabled?: boolean;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(60)
  trustWidthPercent?: number;

  @ApiPropertyOptional({ example: 'مجوزها و شبکه‌های اجتماعی' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  trustTitle?: string;

  @ApiPropertyOptional({ type: [FooterBadgeItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => FooterBadgeItemDto)
  badges?: FooterBadgeItemDto[];

  @ApiPropertyOptional({ type: [FooterSocialItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => FooterSocialItemDto)
  socials?: FooterSocialItemDto[];

  @ApiPropertyOptional({ type: FooterAppDownloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FooterAppDownloadDto)
  appDownload?: FooterAppDownloadDto;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  legalEnabled?: boolean;

  @ApiPropertyOptional({ example: 'تمامی حقوق برای گلینو محفوظ است' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalText?: string;
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

  @ApiPropertyOptional({ type: StorefrontFooterConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StorefrontFooterConfigDto)
  footerConfig?: StorefrontFooterConfigDto;

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

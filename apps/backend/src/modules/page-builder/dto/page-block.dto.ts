import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, plainToInstance } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  validateSync,
} from 'class-validator';

export enum PageBlockType {
  HERO_HEADER = 'HERO_HEADER',
  CATEGORY_CIRCLES = 'CATEGORY_CIRCLES',
  PRODUCT_CAROUSEL = 'PRODUCT_CAROUSEL',
  EDITORIAL_RICH_BLOCK = 'EDITORIAL_RICH_BLOCK',
  VENDOR_CAROUSEL = 'VENDOR_CAROUSEL',
  CAMPAIGN_GRID = 'CAMPAIGN_GRID',
  LATEST_ARTICLES_SHOWCASE = 'LATEST_ARTICLES_SHOWCASE',
}

export enum ProductCarouselFilterType {
  CATEGORY = 'category',
  TAG = 'tag',
  PRODUCT_TYPE = 'productType',
  CUSTOM_LIST = 'custom_list',
}

export enum ProductCarouselSortBy {
  NEWEST = 'newest',
  MOST_SOLD = 'most_sold',
  INSTANT_DELIVERY = 'instant_delivery',
}

export enum VendorCarouselFilterType {
  TOP_RATED = 'top_rated',
  NEAREST_TO_USER = 'nearest_to_user',
  HANDPICKED = 'handpicked',
}

export enum EditorialImagePosition {
  LEFT = 'left',
  RIGHT = 'right',
}

export enum HeroHeaderContentAlign {
  START = 'start',
  CENTER = 'center',
}

export enum HeroHeaderImageFit {
  COVER = 'cover',
  CONTAIN = 'contain',
}

export enum HeroHeaderImagePosition {
  CENTER = 'center',
  TOP = 'top',
  BOTTOM = 'bottom',
}

export enum PageBlockLoadingMode {
  EAGER = 'eager',
  LAZY = 'lazy',
  VIEWPORT = 'viewport',
}

export class HeroHeaderBlockDataDto {
  @ApiProperty({ example: 'گل‌های خاص برای شب یلدا' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'ارسال سریع و بسته‌بندی ویژه' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;

  @ApiProperty({ example: 'https://cdn.example.com/hero.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  imageUrl!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/hero-mobile.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mobileImageUrl?: string;

  @ApiPropertyOptional({ example: 'مشاهده محصولات' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ctaText?: string;

  @ApiPropertyOptional({ example: '/campaigns/yalda' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ctaLink?: string;

  @ApiPropertyOptional({ example: '#ffffff' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  textColor?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  fullWidth?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  flushTop?: boolean;

  @ApiPropertyOptional({ example: 92 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(140)
  minHeightVh?: number;

  @ApiPropertyOptional({ example: 0.42 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  overlayOpacity?: number;

  @ApiPropertyOptional({ enum: HeroHeaderContentAlign, example: HeroHeaderContentAlign.START })
  @IsOptional()
  @IsEnum(HeroHeaderContentAlign)
  contentAlign?: HeroHeaderContentAlign;

  @ApiPropertyOptional({ enum: HeroHeaderImageFit, example: HeroHeaderImageFit.COVER })
  @IsOptional()
  @IsEnum(HeroHeaderImageFit)
  imageFit?: HeroHeaderImageFit;

  @ApiPropertyOptional({ enum: HeroHeaderImagePosition, example: HeroHeaderImagePosition.CENTER })
  @IsOptional()
  @IsEnum(HeroHeaderImagePosition)
  imagePosition?: HeroHeaderImagePosition;
}

export class CategoryCirclesBlockDataDto {
  @ApiProperty({ type: [String], example: ['1', '2', '3'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  categoryIds!: string[];

  @ApiProperty({ example: true })
  @IsBoolean()
  showTitles!: boolean;
}

@ValidatorConstraint({ name: 'productCarouselFilterValueMatchesType', async: false })
export class ProductCarouselFilterValueMatchesTypeConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments) {
    const dto = args.object as ProductCarouselBlockDataDto;

    if (dto.filterType === ProductCarouselFilterType.CUSTOM_LIST) {
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.length <= 50 &&
        value.every((item) => typeof item === 'string' && item.trim().length > 0)
      );
    }

    return typeof value === 'string' && value.trim().length > 0;
  }

  defaultMessage(args: ValidationArguments) {
    const dto = args.object as ProductCarouselBlockDataDto;
    if (dto.filterType === ProductCarouselFilterType.CUSTOM_LIST) {
      return `${args.property} must be a non-empty string array when filterType is custom_list`;
    }

    return `${args.property} must be a non-empty string when filterType is not custom_list`;
  }
}

export class ProductCarouselBlockDataDto {
  @ApiProperty({ example: 'پرفروش‌ترین‌ها' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ enum: ProductCarouselFilterType })
  @IsEnum(ProductCarouselFilterType)
  filterType!: ProductCarouselFilterType;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'flowers' },
      { type: 'array', items: { type: 'string' }, example: ['101', '102'] },
    ],
  })
  @Validate(ProductCarouselFilterValueMatchesTypeConstraint)
  filterValue!: string | string[];

  @ApiProperty({ enum: ProductCarouselSortBy })
  @IsEnum(ProductCarouselSortBy)
  sortBy!: ProductCarouselSortBy;

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(1)
  @Max(24)
  limit!: number;
}

export class EditorialRichBlockDataDto {
  @ApiProperty({ example: 'داستان پشت هر دسته‌گل' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'روایت ادیتوریال این بخش برای معرفی مجموعه.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ example: 'https://cdn.example.com/editorial.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  imageUrl!: string;

  @ApiProperty({ enum: EditorialImagePosition })
  @IsEnum(EditorialImagePosition)
  imagePosition!: EditorialImagePosition;

  @ApiPropertyOptional({ example: 'بیشتر بخوانید' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  buttonText?: string;

  @ApiPropertyOptional({ example: '/story' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  buttonLink?: string;

  @ApiPropertyOptional({ example: '#f6efe6' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  backgroundColor?: string;

  @ApiPropertyOptional({ example: '#355045' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  descriptionColor?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(45)
  imageWidthPercent?: number;
}

export class VendorCarouselBlockDataDto {
  @ApiProperty({ example: 'فروشگاه‌های منتخب' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ enum: VendorCarouselFilterType })
  @IsEnum(VendorCarouselFilterType)
  filterType!: VendorCarouselFilterType;

  @ApiPropertyOptional({ type: [String], example: ['12', '18'] })
  @ValidateIf(
    (dto: VendorCarouselBlockDataDto) =>
      dto.filterType === VendorCarouselFilterType.HANDPICKED ||
      dto.vendorIds !== undefined,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  vendorIds?: string[];
}

export class CampaignGridBannerDto {
  @ApiProperty({ example: 'https://cdn.example.com/banner-1.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  imageUrl!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/banner-1-mobile.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mobileImageUrl?: string;

  @ApiProperty({ example: '/campaigns/yalda/offers' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  link!: string;

  @ApiProperty({ enum: [1, 2, 3], example: 2 })
  @IsInt()
  @Min(1)
  @Max(3)
  colSpan!: 1 | 2 | 3;
}

export class CampaignGridBlockDataDto {
  @ApiPropertyOptional({ example: 'پیشنهادهای ویژه' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: '#f5f1ea' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  backgroundColor?: string;

  @ApiProperty({ type: [CampaignGridBannerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => CampaignGridBannerDto)
  banners!: CampaignGridBannerDto[];
}

export class LatestArticlesShowcaseBlockDataDto {
  @ApiPropertyOptional({ example: 'از مجله گلینو' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'آخرین مقاله‌ها، راهنماها و الهام‌های جدید برای انتخاب بهتر.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  limit?: number;

  @ApiPropertyOptional({ example: '/mag' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  articleBasePath?: string;

  @ApiPropertyOptional({ example: 'مشاهده همه مقاله‌ها' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ctaText?: string;

  @ApiPropertyOptional({ example: '/mag' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ctaLink?: string;
}

const blockDataDtoMap: Record<PageBlockType, new () => object> = {
  [PageBlockType.HERO_HEADER]: HeroHeaderBlockDataDto,
  [PageBlockType.CATEGORY_CIRCLES]: CategoryCirclesBlockDataDto,
  [PageBlockType.PRODUCT_CAROUSEL]: ProductCarouselBlockDataDto,
  [PageBlockType.EDITORIAL_RICH_BLOCK]: EditorialRichBlockDataDto,
  [PageBlockType.VENDOR_CAROUSEL]: VendorCarouselBlockDataDto,
  [PageBlockType.CAMPAIGN_GRID]: CampaignGridBlockDataDto,
  [PageBlockType.LATEST_ARTICLES_SHOWCASE]: LatestArticlesShowcaseBlockDataDto,
};

@ValidatorConstraint({ name: 'pageBlockDataMatchesType', async: false })
export class PageBlockDataMatchesTypeConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments) {
    const block = args.object as PageBlockDto;
    const dtoClass = blockDataDtoMap[block.type];

    if (!dtoClass || !value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const instance = plainToInstance(dtoClass, value);
    const errors = validateSync(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    return errors.length === 0;
  }

  defaultMessage(args: ValidationArguments) {
    const block = args.object as PageBlockDto;
    return `data is invalid for block type ${block.type}`;
  }
}

export class PageBlockDto {
  @ApiProperty({
    example: 'b2c6d1fc-84b2-46dd-ac65-9bf9bd35ef28',
    description: 'Stable client-side block identifier for reorder/edit operations.',
  })
  @IsUUID()
  id!: string;

  @ApiProperty({ enum: PageBlockType })
  @IsEnum(PageBlockType)
  type!: PageBlockType;

  @ApiPropertyOptional({
    enum: PageBlockLoadingMode,
    description: 'Controls how the storefront loads and mounts this block.',
  })
  @IsOptional()
  @IsEnum(PageBlockLoadingMode)
  loadingMode?: PageBlockLoadingMode;

  @ApiProperty({
    description: 'Type-specific block payload validated strictly based on the selected block type.',
  })
  @IsObject()
  @Validate(PageBlockDataMatchesTypeConstraint)
  data!: Record<string, unknown>;
}

export const pageBlockValidationProviders = [
  ProductCarouselFilterValueMatchesTypeConstraint,
  PageBlockDataMatchesTypeConstraint,
];

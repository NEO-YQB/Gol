import { IsOptional, IsNumber, IsString, Min, IsBoolean, IsEnum, Matches } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ElementType, ProductPublicationStatus } from '@prisma/client';

export enum ProductListingSortBy {
  NEWEST = 'newest',
  MOST_SOLD = 'most_sold',
  INSTANT_DELIVERY = 'instant_delivery',
  NEAREST = 'nearest',
}

function toOptionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return value;
}

export class GetProductsQueryDto {
  @ApiPropertyOptional({ description: 'شماره صفحه', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'تعداد آیتم در هر صفحه', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'جستجو در نام محصول' })  
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس شناسه دسته‌بندی' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional({
    description: 'فیلتر بر اساس چند شناسه دسته‌بندی به صورت comma-separated',
    example: '12,18,24',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(,\d+)*$/, {
    message: 'categoryIds باید به صورت comma-separated از اعداد باشد',
  })
  categoryIds?: string;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس شناسه فروشگاه' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  storeId?: number;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس شناسه نوع محصول' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  productTypeId?: number;

  @ApiPropertyOptional({
    description: 'فیلتر بر اساس شناسه‌های محصول به صورت comma-separated',
    example: '12,18,24',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(,\d+)*$/, {
    message: 'ids باید به صورت comma-separated از اعداد باشد',
  })
  ids?: string;

  @ApiPropertyOptional({ description: 'حداقل قیمت' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({ description: 'حداکثر قیمت' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس وضعیت انتشار', enum: ProductPublicationStatus })
  @IsOptional()
  @IsEnum(ProductPublicationStatus)
  publicationStatus?: ProductPublicationStatus;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس قابل خرید بودن' })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  isPurchasable?: boolean;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس آرشیوی بودن' })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  isArchived?: boolean;


  @ApiPropertyOptional({
    description: 'فیلتر بر اساس گروه‌های المان به صورت comma-separated',
    enum: ElementType,
    isArray: true,
    example: 'FLOWER,ACCESSORY',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]+(?:,[A-Z]+)*$/, {
    message: 'elementTypes باید به صورت comma-separated از enumهای معتبر باشد',
  })
  elementTypes?: string;

  @ApiPropertyOptional({ description: 'ترتیب نتایج برای مصرف storefront', enum: ProductListingSortBy })
  @IsOptional()
  @IsEnum(ProductListingSortBy)
  sortBy?: ProductListingSortBy;

  @ApiPropertyOptional({ description: 'عرض جغرافیایی کاربر برای سورت نزدیک‌ترین فروشگاه' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userLat?: number;

  @ApiPropertyOptional({ description: 'طول جغرافیایی کاربر برای سورت نزدیک‌ترین فروشگاه' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userLng?: number;
} 

import { IsOptional, IsNumber, IsString, Min, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductPublicationStatus } from '@prisma/client';

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

  @ApiPropertyOptional({ description: 'فیلتر بر اساس شناسه فروشگاه' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  storeId?: number;

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
  @Type(() => Boolean)
  @IsBoolean()
  isPurchasable?: boolean;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس آرشیوی بودن' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isArchived?: boolean;
} 

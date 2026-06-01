import { 
  IsString, 
  IsArray, 
  IsNumber, 
  IsOptional, 
  IsNotEmpty, 
  IsInt, 
  Min, 
  IsEnum, 
  ValidateNested,
  IsBoolean,
  IsUrl 
} from 'class-validator';
import { Type } from 'class-transformer';
import { ElementType, ProductPublicationStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional  } from '@nestjs/swagger';


class ProductCompositionDto {
  @IsInt()
  @IsNotEmpty()
  elementId!: number;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsEnum(ElementType)
  elementType!: ElementType;
}

class ProductGalleryItemDto {
  @ApiProperty({ description: 'آدرس تصویر گالری', example: 'https://example.com/image1.jpg' })
  @IsString()
  @IsNotEmpty()
  url!: string;

  @ApiPropertyOptional({ description: 'متن جایگزین تصویر گالری', example: 'نمای نزدیک دسته گل رز سفید' })
  @IsOptional()
  @IsString()
  alt?: string;
}

export class CreateProductDto {
  @ApiProperty({ description: 'نام محصول', example: 'اسپرسو' })
  @IsString()
  @IsNotEmpty({ message: 'نام محصول اجباری است' })
  name!: string;

  @ApiPropertyOptional({ description: 'اسلاگ یکتا برای URL محصول', example: 'flower-bouquet-red-roses' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ description: 'توضیحات', example: 'توضیحات کامل درباره محصول' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'توضیحات کوتاه', example: 'توضیحات کوتاه درباره محصول' })
  @IsString()
  @IsOptional()
  shortDescription?: string;

  @ApiProperty({ description: 'قیمت پایه', example: 55000 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ description: 'قیمت با تخفیف', example: 45000 })
  @IsNumber()
  @IsOptional()
  discountPrice?: number;

  @ApiProperty({ description: 'موجودی', example: 100 })
  @IsInt()
  @Min(0)
  quantity!: number;

  @ApiProperty({ description: 'تصویر اصلی', example: 'https://example.com/image.jpg' })
  @IsString()
  @IsNotEmpty({ message: 'تصویر اصلی اجباری است' })
  mainImage!: string;

  @ApiPropertyOptional({ description: 'متن جایگزین تصویر اصلی', example: 'تصویر اصلی محصول با پس‌زمینه روشن' })
  @IsString()
  @IsOptional()
  mainImageAlt?: string;

  @ApiProperty({ description: 'تصاویر', example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ description: 'گالری ساخت‌یافته با alt', type: [ProductGalleryItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductGalleryItemDto)
  gallery?: ProductGalleryItemDto[];

  @ApiProperty({ description: 'ویدیو', example: 'https://example.com/video.mp4' })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({ description: 'شناسه دسته‌بندی', example: 1 })
  @IsInt()
  @IsNotEmpty()
  categoryId!: number;

  @ApiProperty({ description: 'شناسه فروشگاه', example: 1 })
  @IsInt()
  @IsNotEmpty()
  storeId!: number;

  @ApiProperty({ description: 'شناسه نوع محصول', example: 1 })
  @IsInt()
  @IsNotEmpty()
  productTypeId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductCompositionDto)
  @IsOptional() 
  compositions!: ProductCompositionDto[];

  
  @ApiProperty({ description: 'عنوان متا', example: 'عنوان متا' })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiProperty({ description: 'توضیحات متا', example: 'توضیحات متا' })
  @IsString()
  @IsOptional()
  metaDescription?: string;

  @ApiPropertyOptional({ enum: ProductPublicationStatus, description: 'وضعیت انتشار محصول' })
  @IsOptional()
  @IsEnum(ProductPublicationStatus)
  publicationStatus?: ProductPublicationStatus;

  @ApiPropertyOptional({ description: 'آیا محصول قابل خرید است؟' })
  @IsOptional()
  @IsBoolean()
  isPurchasable?: boolean;

  @ApiPropertyOptional({ description: 'آیا محصول آرشیو شده است؟' })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @ApiPropertyOptional({ description: 'یادداشت بازبینی ادمین' })
  @IsOptional()
  @IsString()
  reviewNote?: string;
} 

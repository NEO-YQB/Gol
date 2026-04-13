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
  IsUrl 
} from 'class-validator';
import { Type } from 'class-transformer';
import { ElementType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional  } from '@nestjs/swagger';


// DTO کمکی برای ترکیب‌بندی محصول
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

export class CreateProductDto {
  @ApiProperty({ description: 'نام محصول', example: 'اسپرسو' })
  @IsString()
  @IsNotEmpty({ message: 'نام محصول اجباری است' })
  name!: string;

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
  quantity!: number; // موجودی انبار

  @ApiProperty({ description: 'تصویر اصلی', example: 'https://example.com/image.jpg' })
  @IsString()
  @IsNotEmpty({ message: 'تصویر اصلی اجباری است' })
  mainImage!: string;

  @ApiProperty({ description: 'تصاویر', example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

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
  @IsOptional() // اگر محصول ساده باشد ممکن است ترکیب نداشته باشد
  compositions!: ProductCompositionDto[];

  // فیلدهای سئو (طبق مدل تو)
  @ApiProperty({ description: 'عنوان متا', example: 'عنوان متا' })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiProperty({ description: 'توضیحات متا', example: 'توضیحات متا' })
  @IsString()
  @IsOptional()
  metaDescription?: string;
}

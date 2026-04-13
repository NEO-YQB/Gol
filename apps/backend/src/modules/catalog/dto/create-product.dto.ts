import { 
  IsString, 
  IsArray, 
  IsNumber, 
  IsOptional, 
  IsNotEmpty, 
  IsInt, 
  Min, 
  IsEnum, 
  ValidateNested 
} from 'class-validator';
import { Type } from 'class-transformer';
import { ElementType } from '@prisma/client';

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
  @IsString()
  @IsNotEmpty({ message: 'نام محصول اجباری است' })
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsNumber()
  @IsOptional()
  discountPrice?: number;

  @IsInt()
  @Min(0)
  quantity!: number; // موجودی انبار

  @IsString()
  @IsNotEmpty({ message: 'تصویر اصلی اجباری است' })
  mainImage!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsInt()
  @IsNotEmpty()
  categoryId!: number;

  @IsInt()
  @IsNotEmpty()
  storeId!: number;

  @IsInt()
  @IsNotEmpty()
  productTypeId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductCompositionDto)
  @IsOptional() // اگر محصول ساده باشد ممکن است ترکیب نداشته باشد
  compositions!: ProductCompositionDto[];

  // SEO Fields
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @IsString()
  @IsOptional()
  metaDescription?: string;
}

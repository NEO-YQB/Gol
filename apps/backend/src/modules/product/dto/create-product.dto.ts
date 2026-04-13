import { IsString, IsArray, IsNumber, IsOptional, IsNotEmpty, Matches, IsInt, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'نام محصول اجباری است' })
  name!: string; // اضافه شدن علامت !

  @IsString()
  @IsNotEmpty({ message: 'اسلاگ اجباری است' })
  @Matches(/^[a-z0-9آ-ی\s-]+$/i, { message: 'اسلاگ فقط می‌تواند شامل حروف، اعداد و خط تیره باشد' })
  slug!: string;

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
  quantity!: number;

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

  @IsString()
  @IsOptional()
  metaTitle?: string;

  @IsString()
  @IsOptional()
  metaDescription?: string;
}


export class UpdateProductDto extends PartialType(CreateProductDto)  {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsInt()
  @IsOptional()
  quantity?: number;

  @IsInt()
  @IsOptional()
  categoryId?: number;

  @IsInt()
  @IsOptional()
  productTypeId?: number;

  @IsString()
  @IsOptional()
  mainImage?: string;
}

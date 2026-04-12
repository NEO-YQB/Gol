import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ElementType } from '@prisma/client';

class ProductCompositionDto {
  @IsUUID()
  elementId!: number;

  @IsNumber()
  quantity!: number;

  @IsEnum(ElementType) 
  elementType!: ElementType;
}

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsNumber()
  discountPrice?: number;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsUUID()
  storeId!: number;

  @IsUUID()
  categoryId!: number;

  @IsUUID()
  productTypeId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductCompositionDto)
  compositions!: ProductCompositionDto[];

  @IsString()
  @IsNotEmpty()
  mainImage!: string; 

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  // SEO Fields
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;
}

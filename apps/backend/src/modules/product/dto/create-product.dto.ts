import { IsString, IsArray, IsUrl, IsNumber, IsOptional, IsNotEmpty, Matches, IsObject  } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'نام محصول اجباری است' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'اسلاگ برای سئو اجباری است' })
  // ریجکس زیر اجازه حروف، اعداد و خط تیره را می‌دهد (پشتیبانی از فارسی و انگلیسی)
  @Matches(/^[a-z0-9آ-ی\s-]+$/i, { message: 'اسلاگ فقط می‌تواند شامل حروف، اعداد و خط تیره باشد' })
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @IsNotEmpty()
  stock: number;

    @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'لینک تصویر اصلی معتبر نیست' })
  mainImage?: string;

  @IsArray({ message: 'گالری تصاویر باید به صورت آرایه باشد' })
  @IsString({ each: true, message: 'هر مورد در گالری باید یک متن (URL) باشد' })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'لینک ویدیو معتبر نیست' })
  videoUrl?: string;

  @IsOptional()
  @IsObject({ message: 'فیلد ویژگی‌ها باید به صورت یک شیء (Object) باشد' })
  attributes?: any;

  @IsNumber()
  @IsNotEmpty()
  categoryId: number;

  @IsNumber()
  @IsNotEmpty()
  storeId: number;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9آ-ی\s-]+$/i, { message: 'اسلاگ معتبر نیست' })
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  stock?: number;

  @IsNumber()
  @IsOptional()
  categoryId?: number;
}

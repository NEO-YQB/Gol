import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateProductTypeDto {
  @ApiProperty({ description: 'نام نوع محصول', example: 'دسته گل' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'اسلاگ یکتا برای URL',
    example: 'flower-bouquet',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'اسلاگ فقط می تواند شامل حروف کوچک، اعداد و خط تیره باشد',
  })
  slug!: string;

  @ApiPropertyOptional({ description: 'توضیحات نوع محصول' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'تصویر نماینده نوع محصول' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'متن جایگزین تصویر نوع محصول (Alt)' })
  @IsOptional()
  @IsString()
  imageAlt?: string;

  @ApiPropertyOptional({ description: 'عنوان متا برای SEO' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'توضیحات متا برای SEO' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'آیا صفحه ایندکس شود؟', example: true })
  @IsOptional()
  @IsBoolean()
  isIndexed?: boolean;

  @ApiPropertyOptional({
    description: 'شناسه المان های مجاز برای این نوع محصول',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  allowedElementIds?: number[];
}

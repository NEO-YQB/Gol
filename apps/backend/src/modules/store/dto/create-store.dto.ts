import { IsString, IsNotEmpty, IsOptional, Matches, MinLength } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: 'اسلاگ فقط می‌تواند شامل حروف کوچک، اعداد و خط تیره باشد' })
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  logo?: string;
}

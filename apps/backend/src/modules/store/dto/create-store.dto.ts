import {
  IsArray,
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeliveryWindowDto {
  @ApiProperty({ example: 'today-evening' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key: string;

  @ApiProperty({ example: 'امروز 18 تا 21' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  startTime: string;

  @ApiProperty({ example: '21:00' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  endTime: string;
}

export class CreateStoreDto {
  @ApiProperty({ example: 'گلخانه بهار' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @ApiProperty({ example: 'bahar-flower-shop' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: 'اسلاگ فقط می‌تواند شامل حروف کوچک، اعداد و خط تیره باشد' })
  slug: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 35.7219 })
  @IsOptional()
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ example: 51.3347 })
  @IsOptional()
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  sameDayDelivery?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  hasExpressDelivery?: boolean;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minDeliveryHours?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDeliveryHours?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  expressDeliveryHours?: number;

  @ApiPropertyOptional({
    type: [DeliveryWindowDto],
    example: [
      {
        key: 'today-evening',
        label: 'امروز 18 تا 21',
        startTime: '18:00',
        endTime: '21:00',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryWindowDto)
  deliveryWindows?: DeliveryWindowDto[];
}

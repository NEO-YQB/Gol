import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ElementType } from '@prisma/client';

export class CreateElementDto {
  @ApiProperty({ example: 'چوب گردو' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'ACCESSORY',
    enum: ElementType,
    description: 'نوع المان',
  })
  @IsEnum(ElementType)
  @IsString()
  @IsNotEmpty()
  type!: ElementType;

  @ApiPropertyOptional({ example: 'عدد' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  unit?: string;

  @ApiPropertyOptional({ example: 'https://images.example.com/elements/walnut-wood.jpg' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  image?: string;
}

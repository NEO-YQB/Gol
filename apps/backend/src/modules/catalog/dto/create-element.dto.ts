import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ElementType } from '@prisma/client';

export class CreateElementDto {
  @ApiProperty({ example: 'چوب گردو' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ 
    example: 'MATERIAL', 
    enum: ElementType,
    description: 'نوع المان' 
  })
  @IsEnum(ElementType)
  @IsString()
  @IsNotEmpty()
  type!: ElementType;
}

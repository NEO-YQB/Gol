import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum StructuredDataPageType {
  ARTICLE = 'ARTICLE',
  CATEGORY = 'CATEGORY',
  TAG = 'TAG',
}

export class GetStructuredDataQueryDto {
  @ApiPropertyOptional({
    enum: StructuredDataPageType,
    example: StructuredDataPageType.ARTICLE,
  })
  @IsOptional()
  @IsEnum(StructuredDataPageType)
  type?: StructuredDataPageType;
}

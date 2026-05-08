import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum ContentSitemapEntityType {
  ARTICLE = 'ARTICLE',
  CATEGORY = 'CATEGORY',
  TAG = 'TAG',
  ALL = 'ALL',
}

export class GetContentSitemapQueryDto {
  @ApiPropertyOptional({
    enum: ContentSitemapEntityType,
    example: ContentSitemapEntityType.ALL,
  })
  @IsOptional()
  @IsEnum(ContentSitemapEntityType)
  type?: ContentSitemapEntityType;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum ContentAuditType {
  ARTICLES_WITHOUT_TAG = 'ARTICLES_WITHOUT_TAG',
  ARTICLES_WITHOUT_FOCUS_KEYWORD = 'ARTICLES_WITHOUT_FOCUS_KEYWORD',
  ARTICLES_WITHOUT_CATEGORY = 'ARTICLES_WITHOUT_CATEGORY',
  THIN_CATEGORIES = 'THIN_CATEGORIES',
}

export class GetContentAuditQueryDto {
  @ApiPropertyOptional({
    enum: ContentAuditType,
    example: ContentAuditType.ARTICLES_WITHOUT_TAG,
  })
  @IsOptional()
  @IsEnum(ContentAuditType)
  type?: ContentAuditType;
}

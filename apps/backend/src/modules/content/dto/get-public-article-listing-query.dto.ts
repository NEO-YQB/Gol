import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum ArticleListingSort {
  NEWEST = 'NEWEST',
  OLDEST = 'OLDEST',
}

export class GetPublicArticleListingQueryDto {
  @ApiPropertyOptional({ example: 'رز' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ArticleListingSort, example: ArticleListingSort.NEWEST })
  @IsOptional()
  @IsEnum(ArticleListingSort)
  sort?: ArticleListingSort;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

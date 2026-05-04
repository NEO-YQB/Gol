import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 11 })
  @Type(() => Number)
  @IsInt()
  orderId!: number;

  @ApiProperty({ example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'دسته گل تازه بود و بسته بندي خوب انجام شده بود.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

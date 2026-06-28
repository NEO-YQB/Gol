import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSeoSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  siteUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  siteName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  googleSearchConsoleVerification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  googleTagManagerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  googleAnalyticsId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  robotsTxt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sitemapEnabled?: boolean;

  @ApiPropertyOptional({ enum: ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'] })
  @IsOptional()
  @IsIn(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'])
  sitemapChangeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  sitemapPriority?: string;
}

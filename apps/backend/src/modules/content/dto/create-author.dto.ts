import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateAuthorDto {
  @ApiProperty({ example: 'افشین رضایی' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'afshin-rezaei' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({ example: 'نویسنده حوزه گل و گیاه و محتوای آموزشی' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 'متن bio مناسب برای نمایش SEO در صفحه نویسنده' })
  @IsOptional()
  @IsString()
  seoBio?: string;

  @ApiPropertyOptional({ example: 'https://example.com/authors/afshin.jpg' })
  @IsOptional()
  @IsString()
  avatarImage?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 7,
    description: 'شناسه کاربری عضو تیم محتوا/SEO که این پروفایل نویسنده به آن متصل می‌شود',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;
}

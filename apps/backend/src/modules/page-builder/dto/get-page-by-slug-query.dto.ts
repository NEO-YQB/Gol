import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetPageBySlugQueryDto {
  @ApiProperty({
    example: '/',
    description: 'The storefront page slug. Use `/` for home page or a path like `yalda`.',
  })
  @IsString()
  @IsNotEmpty()
  slug!: string;
}

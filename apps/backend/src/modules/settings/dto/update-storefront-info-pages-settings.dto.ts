import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class UpdateStorefrontInfoPagesSettingsDto {
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  about?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  contact?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  terms?: Record<string, unknown>;
}

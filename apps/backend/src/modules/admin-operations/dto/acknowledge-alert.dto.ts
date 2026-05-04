import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AcknowledgeAlertDto {
  @ApiPropertyOptional({ example: 'بررسي شد و فعلا نياز به اقدام ديگري نيست' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

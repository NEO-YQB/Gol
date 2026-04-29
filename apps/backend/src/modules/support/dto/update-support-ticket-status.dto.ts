import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportTicketStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSupportTicketStatusDto {
  @ApiProperty({ enum: SupportTicketStatus, example: SupportTicketStatus.IN_REVIEW })
  @IsEnum(SupportTicketStatus)
  status!: SupportTicketStatus;

  @ApiPropertyOptional({ example: 'در حال بررسی با فروشنده' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;

  @ApiPropertyOptional({ example: 'نیاز به تماس با فروشنده' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  internalNote?: string;
}

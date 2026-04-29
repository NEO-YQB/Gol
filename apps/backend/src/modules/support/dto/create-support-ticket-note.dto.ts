import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSupportTicketNoteDto {
  @ApiProperty({ example: 'مشتری عکس سفارش را ارسال کرد.' })
  @IsString()
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

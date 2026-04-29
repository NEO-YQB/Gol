import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportTicketReason } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSupportTicketDto {
  @ApiProperty({ enum: SupportTicketReason, example: SupportTicketReason.DAMAGED_FLOWERS })
  @IsEnum(SupportTicketReason)
  reason!: SupportTicketReason;

  @ApiProperty({ example: 'گل‌ها پژمرده تحویل شدند' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'سفارش امروز تحویل شد ولی بخشی از دسته گل خراب بود.' })
  @IsString()
  @MaxLength(4000)
  description!: string;

  @ApiPropertyOptional({ example: { imageUrls: ['/uploads/issues/order-12.jpg'] } })
  @IsOptional()
  @IsObject()
  customerEvidence?: Record<string, unknown>;
}

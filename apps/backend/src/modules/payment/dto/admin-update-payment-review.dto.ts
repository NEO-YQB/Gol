import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentReviewStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminUpdatePaymentReviewDto {
  @ApiProperty({ enum: PaymentReviewStatus, example: PaymentReviewStatus.NEEDS_REVIEW })
  @IsEnum(PaymentReviewStatus)
  reviewStatus!: PaymentReviewStatus;

  @ApiPropertyOptional({ example: 'اختلاف بین callback و وضعیت سفارش' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewReason?: string;

  @ApiPropertyOptional({ example: 'نیاز به بررسی دستی توسط تیم مالی' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNote?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentReviewStatus, PaymentStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AdminListPaymentsQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ example: 'mock-default' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  gatewayKey?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @ApiPropertyOptional({ example: 33 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  expiredOnly?: boolean;

  @ApiPropertyOptional({ enum: PaymentReviewStatus })
  @IsOptional()
  @IsEnum(PaymentReviewStatus)
  reviewStatus?: PaymentReviewStatus;
}

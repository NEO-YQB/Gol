import { ApiPropertyOptional } from '@nestjs/swagger';
import { SupportTicketReason, SupportTicketStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class AdminListSupportTicketsQueryDto {
  @ApiPropertyOptional({ enum: SupportTicketStatus })
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @ApiPropertyOptional({ enum: SupportTicketReason })
  @IsOptional()
  @IsEnum(SupportTicketReason)
  reason?: SupportTicketReason;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  storeId?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

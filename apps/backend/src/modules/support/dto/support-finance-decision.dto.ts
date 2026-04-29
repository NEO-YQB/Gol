import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportTicketFinanceOutcome } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SupportFinanceDecisionDto {
  @ApiProperty({ enum: SupportTicketFinanceOutcome, example: SupportTicketFinanceOutcome.NO_ACTION_RELEASE })
  @IsEnum(SupportTicketFinanceOutcome)
  outcome!: SupportTicketFinanceOutcome;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  extendHoldDays?: number;

  @ApiPropertyOptional({ example: 'شکایت بررسی شد و تصمیم مالی ثبت شد.' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;
}

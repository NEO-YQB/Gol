import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkNotificationStatusDto {
  @ApiProperty({ enum: NotificationStatus, example: NotificationStatus.SENT })
  @IsEnum(NotificationStatus)
  status!: NotificationStatus;

  @ApiPropertyOptional({ example: 'ارسال به صف پیامک خارجی انجام شد' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

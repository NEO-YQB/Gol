import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AdminDispatchNotificationDto {
  @ApiPropertyOptional({ enum: NotificationChannel })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional({ enum: NotificationChannel, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  forceRetry?: boolean;

  @ApiPropertyOptional({ example: 'عنوان تستی پوش' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @ApiPropertyOptional({ example: 'متن تستی برای پوش نوتیفیکیشن' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  body?: string;

  @ApiPropertyOptional({ example: { topic: 'order.updated', orderId: 412 } })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AdminCreatePushNotificationDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  userId!: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  storeId?: number;

  @ApiPropertyOptional({ example: 412 })
  @IsOptional()
  @IsInt()
  @Min(1)
  orderId?: number;

  @ApiPropertyOptional({ example: 301 })
  @IsOptional()
  @IsInt()
  @Min(1)
  supportTicketId?: number;

  @ApiProperty({ example: 'order.updated' })
  @IsString()
  @MaxLength(120)
  topic!: string;

  @ApiProperty({ example: 'سفارش شما به‌روزرسانی شد' })
  @IsString()
  @MaxLength(180)
  title!: string;

  @ApiProperty({ example: 'وضعیت سفارش #۴۱۲ به آماده‌سازی تغییر کرد.' })
  @IsString()
  @MaxLength(1000)
  body!: string;

  @ApiPropertyOptional({ example: { topic: 'order.updated', orderId: 412 } })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

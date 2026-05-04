import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum AdminAlertAction {
  ACKNOWLEDGE = 'ACKNOWLEDGE',
  RESOLVE = 'RESOLVE',
  REOPEN = 'REOPEN',
  SNOOZE = 'SNOOZE',
}

export class UpdateAlertStatusDto {
  @ApiProperty({ enum: AdminAlertAction, example: AdminAlertAction.RESOLVE })
  @IsEnum(AdminAlertAction)
  action!: AdminAlertAction;

  @ApiPropertyOptional({ example: 'اقدام انجام شد و alert بسته شد' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ example: '2026-05-01T10:00:00.000Z' })
  @IsOptional()
  @IsString()
  snoozeUntil?: string;
}

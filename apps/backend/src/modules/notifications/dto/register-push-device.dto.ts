import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterPushDeviceDto {
  @ApiProperty({ example: 'fcm_device_token_here' })
  @IsString()
  @MaxLength(500)
  token!: string;

  @ApiProperty({ example: 'android', enum: ['android', 'ios', 'web'] })
  @IsString()
  @IsIn(['android', 'ios', 'web'])
  platform!: string;

  @ApiPropertyOptional({ example: 'Pixel 9 Emulator' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceLabel?: string;

  @ApiPropertyOptional({ example: '1.0.0+1' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  appVersion?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class UpdateVendorMembershipSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean

  @ApiPropertyOptional({ example: 1000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  feeAmount?: number

  @ApiPropertyOptional({ example: '2026-12-21T20:30:00.000Z', nullable: true })
  @IsOptional()
  @IsDateString()
  freeUntil?: string | null

  @ApiPropertyOptional({ example: 'حق عضویت فروشندگی' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @ApiPropertyOptional({ example: 'پس از تایید مدارک، برای فعال‌سازی پنل فروشنده پرداخت کنید.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string
}

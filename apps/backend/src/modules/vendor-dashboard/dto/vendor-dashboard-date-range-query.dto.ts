import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';
import { JALALI_PERIODS } from '../../../common/date/jalali-date-range.util';
import type { JalaliPeriod } from '../../../common/date/jalali-date-range.util';

export class VendorDashboardDateRangeQueryDto {
  @ApiPropertyOptional({
    enum: JALALI_PERIODS,
    default: 'month',
    description: 'بازه زمانی گزارش بر اساس تاریخ جلالی',
  })
  @IsOptional()
  @IsIn(JALALI_PERIODS)
  period?: JalaliPeriod;

  @ApiPropertyOptional({ example: '1404-01-01', description: 'فقط برای period=custom' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'فرمت fromDate باید YYYY-MM-DD باشد' })
  fromDate?: string;

  @ApiPropertyOptional({ example: '1404-01-31', description: 'فقط برای period=custom' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'فرمت toDate باید YYYY-MM-DD باشد' })
  toDate?: string;
}

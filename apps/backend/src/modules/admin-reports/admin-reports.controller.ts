import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminReportDateRangeQueryDto } from './dto/admin-report-date-range-query.dto';
import { AdminRiskSummaryQueryDto } from './dto/admin-risk-summary-query.dto';
import { AdminReportsService } from './admin-reports.service';

@ApiTags('Admin Reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('admin-reports')
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @Get('support/tickets/summary')
  @ApiOperation({ summary: 'گزارش summary تیکت‌های پشتیبانی برای ادمین' })
  getSupportTicketsSummary(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: AdminReportDateRangeQueryDto,
  ) {
    return this.adminReportsService.getSupportTicketsSummary(user, query);
  }

  @Get('finance/refunds-summary')
  @ApiOperation({ summary: 'گزارش summary تصمیم‌های refund / reversal برای ادمین' })
  getRefundsSummary(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: AdminReportDateRangeQueryDto,
  ) {
    return this.adminReportsService.getRefundsSummary(user, query);
  }

  @Get('finance/wallets-settlements-summary')
  @ApiOperation({ summary: 'گزارش summary کیف پول و settlement برای ادمین' })
  getWalletsSettlementsSummary(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: AdminReportDateRangeQueryDto,
  ) {
    return this.adminReportsService.getWalletsSettlementsSummary(user, query);
  }

  @Get('vendors/risk-summary')
  @ApiOperation({ summary: 'گزارش summary فروشنده‌های پرریسک برای ادمین' })
  getVendorRiskSummary(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: AdminRiskSummaryQueryDto,
  ) {
    return this.adminReportsService.getVendorRiskSummary(user, query);
  }
}

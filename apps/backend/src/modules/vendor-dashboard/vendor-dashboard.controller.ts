import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VendorDashboardDateRangeQueryDto } from './dto/vendor-dashboard-date-range-query.dto';
import { VendorDashboardService } from './vendor-dashboard.service';

@ApiTags('Vendor Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('vendor-dashboard')
export class VendorDashboardController {
  constructor(private readonly vendorDashboardService: VendorDashboardService) {}

  @Get('wallet-summary')
  @ApiOperation({ summary: 'summary کیف پول فروشنده جاری' })
  getWalletSummary(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: VendorDashboardDateRangeQueryDto,
  ) {
    return this.vendorDashboardService.getWalletSummary(user, query);
  }

  @Get('settlements-summary')
  @ApiOperation({ summary: 'summary settlementهای فروشنده جاری' })
  getSettlementsSummary(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: VendorDashboardDateRangeQueryDto,
  ) {
    return this.vendorDashboardService.getSettlementsSummary(user, query);
  }

  @Get('tickets-summary')
  @ApiOperation({ summary: 'summary تیکت‌های مربوط به فروشنده جاری' })
  getTicketsSummary(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: VendorDashboardDateRangeQueryDto,
  ) {
    return this.vendorDashboardService.getTicketsSummary(user, query);
  }

  @Get('health-summary')
  @ApiOperation({ summary: 'summary health score فروشنده جاری' })
  getHealthSummary(@GetUser() user: { id: number; roles: string[] }) {
    return this.vendorDashboardService.getHealthSummary(user);
  }
}

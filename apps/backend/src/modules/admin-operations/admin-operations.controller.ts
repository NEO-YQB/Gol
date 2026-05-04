import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminOperationsService } from './admin-operations.service';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';

@ApiTags('Admin Operations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('admin/operations')
export class AdminOperationsController {
  constructor(private readonly adminOperationsService: AdminOperationsService) {}

  @Get('orders/exceptions')
  @ApiOperation({ summary: 'لیست سفارش‌های exception یا stuck برای ادمین' })
  getOrderExceptions(@GetUser() user: { id: number; roles: string[] }) {
    return this.adminOperationsService.getOrderExceptions(user);
  }

  @Get('payments/exceptions')
  @ApiOperation({ summary: 'لیست paymentهای نیازمند review یا reconciliation' })
  getPaymentExceptions(@GetUser() user: { id: number; roles: string[] }) {
    return this.adminOperationsService.getPaymentExceptions(user);
  }

  @Get('settlements/exceptions')
  @ApiOperation({ summary: 'لیست settlementهای block شده یا ناسازگار' })
  getSettlementExceptions(@GetUser() user: { id: number; roles: string[] }) {
    return this.adminOperationsService.getSettlementExceptions(user);
  }

  @Get('support/follow-ups')
  @ApiOperation({ summary: 'لیست تیکت‌ها و follow-upهای عملیاتی' })
  getSupportFollowUps(@GetUser() user: { id: number; roles: string[] }) {
    return this.adminOperationsService.getSupportFollowUps(user);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'فید alertهای عملیاتی برای ادمین' })
  getAlerts(@GetUser() user: { id: number; roles: string[] }) {
    return this.adminOperationsService.getAlerts(user);
  }

  @Post('alerts/:key/status')
  @ApiOperation({ summary: 'تغییر lifecycle یک alert عملیاتی توسط ادمین' })
  updateAlertStatus(
    @GetUser() user: { id: number; roles: string[] },
    @Param('key') key: string,
    @Body() dto: UpdateAlertStatusDto,
  ) {
    return this.adminOperationsService.updateAlertStatus(user, key, dto);
  }

  @Get('vendors/:storeId/policy-timeline')
  @ApiOperation({ summary: 'timeline policy/alert فروشگاه برای ادمین' })
  getVendorPolicyTimeline(
    @GetUser() user: { id: number; roles: string[] },
    @Param('storeId', ParseIntPipe) storeId: number,
  ) {
    return this.adminOperationsService.getVendorPolicyTimeline(user, storeId);
  }
}

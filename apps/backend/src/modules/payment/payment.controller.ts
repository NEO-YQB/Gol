import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminListPaymentsQueryDto } from './dto/admin-list-payments-query.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { MockVerifyPaymentDto } from './dto/mock-verify-payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'شروع پرداخت برای سفارش آنلاین' })
  initiate(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentService.initiate(user, dto);
  }

  @Post('mock-verify')
  @ApiOperation({ summary: 'تایید یا رد mock پرداخت برای تست localhost' })
  mockVerify(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: MockVerifyPaymentDto,
  ) {
    return this.paymentService.mockVerify(user, dto);
  }

  @Get('admin')
  @ApiOperation({ summary: 'دریافت لیست paymentها برای ادمین با قابلیت فیلتر' })
  adminList(
    @GetUser() user: { id: number; roles: string[] },
    @Query() query: AdminListPaymentsQueryDto,
  ) {
    return this.paymentService.adminList(user, query);
  }

  @Post('admin/expire-sweep')
  @ApiOperation({ summary: 'اجرای دستی sweep برای paymentهای منقضی توسط ادمین' })
  runExpirySweep(@GetUser() user: { id: number; roles: string[] }) {
    return this.paymentService.processExpiredPayments(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'دریافت جزئیات یک payment' })
  findOne(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.paymentService.findOne(user, id);
  }
}

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
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminManualRefundDto } from './dto/admin-manual-refund.dto';
import { AdminListPaymentsQueryDto } from './dto/admin-list-payments-query.dto';
import { AdminUpdatePaymentReviewDto } from './dto/admin-update-payment-review.dto';
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
  @ApiOkResponse({
    description: 'payment initiation با موفقیت ایجاد شد',
    schema: {
      example: {
        message: 'payment initiation با موفقیت ایجاد شد',
        payment: {
          id: 21,
          orderId: 45,
          status: 'PENDING',
          authority: 'MOCK-1714900000-12345',
          paymentUrl: 'https://mock-gateway.local/pay/MOCK-1714900000-12345',
          attemptCount: 1,
        },
        gateway: {
          id: 2,
          key: 'mock-default',
          displayName: 'Mock Gateway',
          driver: 'mock',
          authority: 'MOCK-1714900000-12345',
          paymentUrl: 'https://mock-gateway.local/pay/MOCK-1714900000-12345',
        },
      },
    },
  })
  initiate(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentService.initiate(user, dto);
  }

  @Post('mock-verify')
  @ApiOperation({ summary: 'تایید یا رد mock پرداخت برای تست localhost' })
  @ApiOkResponse({
    description: 'نتیجه verify شدن payment',
    schema: {
      example: {
        message: 'payment با موفقیت verify شد',
        payment: {
          id: 21,
          orderId: 45,
          status: 'PAID',
          refId: 'MOCK-REF-21',
        },
        orderStatus: 'PAID',
        paymentStatus: 'PAID',
      },
    },
  })
  mockVerify(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: MockVerifyPaymentDto,
  ) {
    return this.paymentService.mockVerify(user, dto);
  }

  @Get('admin')
  @ApiOperation({ summary: 'دریافت لیست paymentها برای ادمین با قابلیت فیلتر' })
  @ApiOkResponse({
    description: 'لیست paymentهای ادمین',
    schema: {
      example: {
        data: [
          {
            id: 21,
            orderId: 45,
            status: 'PAID',
            gateway: 'mock',
            amount: '850000',
          },
        ],
        meta: {
          total: 1,
          page: 1,
          lastPage: 1,
        },
      },
    },
  })
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

  @Post('admin/:id/review')
  @ApiOperation({ summary: 'ثبت یا به‌روزرسانی وضعیت بررسی دستی payment توسط ادمین' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه payment' })
  adminUpdateReview(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdatePaymentReviewDto,
  ) {
    return this.paymentService.adminUpdateReview(user, id, dto);
  }

  @Post('admin/:id/manual-refund')
  @ApiOperation({ summary: 'ثبت refund دستی برای payment توسط ادمین' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه payment' })
  adminManualRefund(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminManualRefundDto,
  ) {
    return this.paymentService.adminManualRefund(user, id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'دریافت جزئیات یک payment' })
  @ApiParam({ name: 'id', type: Number, description: 'شناسه payment' })
  @ApiOkResponse({
    description: 'جزئیات payment',
    schema: {
      example: {
        id: 21,
        orderId: 45,
        status: 'PAID',
        reviewStatus: 'APPROVED',
        order: {
          id: 45,
          status: 'PAID',
          paymentStatus: 'PAID',
        },
        timeline: [],
        auditTrail: [],
        latestOperationalFlags: [],
      },
    },
  })
  findOne(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.paymentService.findOne(user, id);
  }
}

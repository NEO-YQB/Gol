import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreatePaymentGatewayConfigDto } from './dto/create-payment-gateway-config.dto';
import { UpdatePaymentGatewayConfigDto } from './dto/update-payment-gateway-config.dto';
import { PaymentGatewayService } from './payment-gateway.service';

@ApiTags('Payment Gateways')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('payments/gateways')
export class PaymentGatewayController {
  constructor(private readonly paymentGatewayService: PaymentGatewayService) {}

  @Get('options')
  @ApiOperation({ summary: 'دریافت gatewayهای فعال برای انتخاب در checkout/payment' })
  findActiveOptions() {
    return this.paymentGatewayService.listActiveOptions();
  }

  @Get('admin')
  @ApiOperation({ summary: 'دریافت همه gateway configها برای ادمین' })
  adminList(@GetUser() user: { id: number; roles: string[] }) {
    return this.paymentGatewayService.adminList(user);
  }

  @Post('admin')
  @ApiOperation({ summary: 'ایجاد gateway config جدید توسط ادمین' })
  adminCreate(
    @GetUser() user: { id: number; roles: string[] },
    @Body() dto: CreatePaymentGatewayConfigDto,
  ) {
    return this.paymentGatewayService.adminCreate(user, dto);
  }

  @Patch('admin/:id')
  @ApiOperation({ summary: 'ویرایش gateway config توسط ادمین' })
  adminUpdate(
    @GetUser() user: { id: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentGatewayConfigDto,
  ) {
    return this.paymentGatewayService.adminUpdate(user, id, dto);
  }
}

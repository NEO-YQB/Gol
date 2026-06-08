import { Body, Controller, Param, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PaymentService } from './payment.service';

@ApiTags('Payment Callbacks')
@Controller('payments/callback')
export class PaymentCallbackController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post(':gatewayKey')
  @ApiOperation({ summary: 'دریافت callback خام از gateway و route کردن به payment مربوطه' })
  receiveCallback(
    @Param('gatewayKey') gatewayKey: string,
    @Body() payload: Record<string, unknown>,
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() response: Response,
  ) {
    return this.paymentService.handleGatewayCallback(gatewayKey, payload, query, response);
  }
}

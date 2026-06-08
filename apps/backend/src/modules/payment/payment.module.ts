import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentGatewayController } from './payment-gateway.controller';
import { PaymentGatewayService } from './payment-gateway.service';
import { MockPaymentGatewayAdapter } from './adapters/mock-payment-gateway.adapter';
import { ZarinpalPaymentGatewayAdapter } from './adapters/zarinpal-payment-gateway.adapter';
import { PaymentGatewayRegistryService } from './payment-gateway-registry.service';
import { PaymentCallbackController } from './payment-callback.controller';
import { PaymentExpirySweeperService } from './payment-expiry-sweeper.service';

@Module({
  controllers: [PaymentController, PaymentGatewayController, PaymentCallbackController],
  providers: [
    PaymentService,
    PaymentGatewayService,
    MockPaymentGatewayAdapter,
    ZarinpalPaymentGatewayAdapter,
    PaymentGatewayRegistryService,
    PaymentExpirySweeperService,
  ],
  exports: [PaymentService, PaymentGatewayService, PaymentGatewayRegistryService],
})
export class PaymentModule {}

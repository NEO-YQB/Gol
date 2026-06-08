import { Injectable, NotFoundException } from '@nestjs/common';
import { MockPaymentGatewayAdapter } from './adapters/mock-payment-gateway.adapter';
import { PaymentGatewayAdapter } from './adapters/payment-gateway.adapter';
import { ZarinpalPaymentGatewayAdapter } from './adapters/zarinpal-payment-gateway.adapter';

@Injectable()
export class PaymentGatewayRegistryService {
  private readonly adapters: PaymentGatewayAdapter[];

  constructor(
    mockAdapter: MockPaymentGatewayAdapter,
    zarinpalAdapter: ZarinpalPaymentGatewayAdapter,
  ) {
    this.adapters = [mockAdapter, zarinpalAdapter];
  }

  getSupportedDrivers() {
    return this.adapters.map((adapter) => adapter.constructor.name.replace('PaymentGatewayAdapter', '').toLowerCase());
  }

  getAdapter(driver: string) {
    const adapter = this.adapters.find((candidate) =>
      candidate.supports(driver.toLowerCase()),
    );

    if (!adapter) {
      throw new NotFoundException('adapter مناسب برای این gateway driver پیدا نشد');
    }

    return adapter;
  }

  supports(driver: string) {
    return this.adapters.some((adapter) => adapter.supports(driver.toLowerCase()));
  }
}

import { Injectable } from '@nestjs/common';
import { PaymentGatewayAdapter, GatewayInitiationContext, GatewayVerificationContext } from './payment-gateway.adapter';

@Injectable()
export class MockPaymentGatewayAdapter implements PaymentGatewayAdapter {
  supports(driver: string) {
    return driver.toLowerCase() === 'mock';
  }

  async initiate(context: GatewayInitiationContext) {
    const authority = `MOCK-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const baseUrl =
      this.readStringConfig(context.config.technicalConfig, 'baseUrl') ??
      'https://mock-gateway.local';

    return {
      authority,
      paymentUrl: `${baseUrl}/pay/${authority}`,
      rawData: {
        authority,
        callbackUrl: context.callbackUrl,
        returnUrl: context.returnUrl,
        driver: context.config.driver,
      },
    };
  }

  async verify(context: GatewayVerificationContext) {
    const success = context.success ?? false;

    return {
      success,
      refId: success ? context.refId ?? `MOCK-REF-${context.payment.id}` : null,
      failureReason: success
        ? null
        : context.failureReason ?? 'پرداخت در mock gateway ناموفق شد',
      rawData: {
        success,
        refId: context.refId ?? null,
        paymentId: context.payment.id,
      },
    };
  }

  private readStringConfig(config: unknown, key: string) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return null;
    }

    const value = (config as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : null;
  }
}

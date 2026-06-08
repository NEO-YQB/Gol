import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentGatewayAdapter, GatewayInitiationContext, GatewayVerificationContext } from './payment-gateway.adapter';

type ZarinpalRequestResponse = {
  data?: {
    code?: number
    message?: string
    authority?: string
    ref_id?: number
    fee_type?: string
    fee?: number
  }
  errors?: {
    code?: number
    message?: string
  }
}

@Injectable()
export class ZarinpalPaymentGatewayAdapter implements PaymentGatewayAdapter {
  supports(driver: string) {
    return driver.toLowerCase() === 'zarinpal';
  }

  async initiate(context: GatewayInitiationContext) {
    const merchantId = this.readMerchantId(context.config.merchantConfig);
    const baseUrl = this.getBaseUrl(context);
    const callbackUrl = context.callbackUrl;

    if (!callbackUrl) {
      throw new BadRequestException('برای gateway زرین‌پال، callbackUrl الزامی است');
    }

    const response = await fetch(`${baseUrl}/pg/v4/payment/request.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: Math.round(context.amount),
        callback_url: callbackUrl,
        description: `پرداخت سفارش #${context.orderId}`,
        metadata: {
          orderId: context.orderId,
          paymentId: context.paymentId ?? null,
          mobile: this.readStringConfig(context.config.merchantConfig, 'mobile') ?? undefined,
          email: this.readStringConfig(context.config.merchantConfig, 'email') ?? undefined,
        },
      }),
    });

    const payload = (await response.json()) as ZarinpalRequestResponse;
    const code = payload.data?.code ?? payload.errors?.code;
    const authority = payload.data?.authority;

    if (!response.ok || code !== 100 || !authority) {
      throw new BadRequestException(payload.errors?.message || payload.data?.message || 'ایجاد پرداخت زرین‌پال ناموفق بود');
    }

    return {
      authority,
      paymentUrl: `${baseUrl}/pg/StartPay/${authority}`,
      rawData: payload as Record<string, unknown>,
    };
  }

  async verify(context: GatewayVerificationContext) {
    const gatewayConfig = context.payment.gatewayConfig;
    const merchantId = this.readMerchantId(gatewayConfig?.merchantConfig);
    const baseUrl = this.getBaseUrl({ config: gatewayConfig } as GatewayInitiationContext);
    const authority = context.payment.authority;

    if (!authority) {
      return {
        success: false,
        failureReason: 'authority برای verify زرین‌پال یافت نشد',
      };
    }

    const response = await fetch(`${baseUrl}/pg/v4/payment/verify.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: Math.round(Number(context.payment.amount)),
        authority,
      }),
    });

    const payload = (await response.json()) as ZarinpalRequestResponse;
    const code = payload.data?.code ?? payload.errors?.code;
    const refId = payload.data?.ref_id;
    const success = code === 100 || code === 101;

    return {
      success,
      refId: success && refId ? String(refId) : null,
      failureReason: success ? null : payload.errors?.message || payload.data?.message || 'verify زرین‌پال ناموفق بود',
      rawData: payload as Record<string, unknown>,
    };
  }

  private getBaseUrl(context: Pick<GatewayInitiationContext, 'config'>) {
    const configuredBaseUrl = this.readStringConfig(context.config.technicalConfig, 'baseUrl');
    if (configuredBaseUrl) return configuredBaseUrl.replace(/\/+$/, '');
    return context.config.sandboxMode ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';
  }

  private readMerchantId(config: unknown) {
    const merchantId = this.readStringConfig(config, 'merchantId');
    if (!merchantId) {
      throw new BadRequestException('merchantId برای gateway زرین‌پال تنظیم نشده است');
    }
    return merchantId;
  }

  private readStringConfig(config: unknown, key: string) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return null;
    }

    const value = (config as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : null;
  }
}

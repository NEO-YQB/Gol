import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PaymentGatewayAdapter, GatewayInitiationContext, GatewayVerificationContext } from './payment-gateway.adapter';

type ZarinpalRequestResponse = {
  data?: {
    code?: number
    message?: string
    authority?: string
    ref_id?: number | string
    fee_type?: string
    fee?: number
  }
  errors?: {
    code?: number
    message?: string
  } | unknown[]
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
    const amountInRials = this.toRials(context.amount);

    if (!callbackUrl) {
      throw new BadRequestException('برای gateway زرین‌پال، callbackUrl الزامی است');
    }
    this.assertCallbackUrl(callbackUrl, context.config.key);

    const { response, payload } = await this.post(baseUrl, 'request', {
        merchant_id: merchantId,
        amount: amountInRials,
        currency: 'IRR',
        callback_url: callbackUrl,
        description: context.orderId ? `پرداخت سفارش #${context.orderId}` : 'پرداخت حق عضویت فروشندگی',
        metadata: {
          order_id: context.orderId ? String(context.orderId) : undefined,
          mobile: this.readStringConfig(context.config.merchantConfig, 'mobile') ?? undefined,
          email: this.readStringConfig(context.config.merchantConfig, 'email') ?? undefined,
        },
    });

    const code = this.getCode(payload);
    const authority = payload.data?.authority;

    if (!response.ok || code !== 100 || !authority) {
      throw new BadRequestException(this.getFailureMessage(code));
    }

    return {
      authority,
      paymentUrl: `${baseUrl}/pg/StartPay/${authority}`,
      rawData: { ...payload, amountInRials, currency: 'IRR' },
    };
  }

  async verify(context: GatewayVerificationContext) {
    if (context.success === false) {
      return { success: false, refId: null, failureReason: 'پرداخت توسط کاربر لغو شد یا در زرین‌پال ناموفق بود' };
    }
    const gatewayConfig = context.payment.gatewayConfig;
    if (!gatewayConfig) {
      throw new BadRequestException('تنظیمات درگاه این پرداخت یافت نشد');
    }
    const merchantId = this.readMerchantId(gatewayConfig?.merchantConfig);
    const baseUrl = this.getBaseUrl({ config: gatewayConfig });
    const authority = context.payment.authority;

    if (!authority) {
      return {
        success: false,
        failureReason: 'authority برای verify زرین‌پال یافت نشد',
      };
    }

    const { response, payload } = await this.post(baseUrl, 'verify', {
        merchant_id: merchantId,
        amount: this.toRials(Number(context.payment.amount)),
        authority,
    });

    const code = this.getCode(payload);
    const refId = payload.data?.ref_id;
    const validRefId = refId !== undefined && /^\d+$/.test(String(refId)) && Number(refId) > 0;
    const success = response.ok && (code === 100 || code === 101) && validRefId;

    return {
      success,
      refId: success && refId ? String(refId) : null,
      failureReason: success ? null : this.getFailureMessage(code),
      rawData: payload as Record<string, unknown>,
    };
  }

  private getBaseUrl(context: Pick<GatewayInitiationContext, 'config'>) {
    const expectedBaseUrl = context.config.sandboxMode ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';
    const configuredBaseUrl = this.readStringConfig(context.config.technicalConfig, 'baseUrl');
    if (configuredBaseUrl && configuredBaseUrl.replace(/\/+$/, '') !== expectedBaseUrl) {
      throw new BadRequestException('baseUrl تنظیمات فنی با حالت واقعی/آزمایشی زرین‌پال سازگار نیست؛ آن را حذف یا اصلاح کنید');
    }
    return expectedBaseUrl;
  }

  private readMerchantId(config: unknown) {
    const merchantId = this.readStringConfig(config, 'merchantId') ?? this.readStringConfig(config, 'merchant_id');
    if (!merchantId || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(merchantId)) {
      throw new BadRequestException('مرچنت زرین‌پال باید یک شناسه معتبر ۳۶ کاراکتری باشد');
    }
    return merchantId;
  }

  private readStringConfig(config: unknown, key: string) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return null;
    }

    const value = (config as Record<string, unknown>)[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private toRials(amountInTomans: number) {
    const amountInRials = Math.round(amountInTomans * 10);
    if (!Number.isFinite(amountInTomans) || amountInTomans <= 0 || !Number.isSafeInteger(amountInRials) || amountInRials <= 0) {
      throw new BadRequestException('مبلغ پرداخت زرین‌پال معتبر نیست');
    }
    return amountInRials;
  }

  private assertCallbackUrl(value: string, gatewayKey: string) {
    let callback: URL;
    try {
      callback = new URL(value);
    } catch {
      throw new BadRequestException('callbackUrl زرین‌پال باید یک آدرس کامل و معتبر باشد');
    }
    if (!['http:', 'https:'].includes(callback.protocol) || callback.username || callback.password ||
        !callback.pathname.endsWith(`/payments/callback/${encodeURIComponent(gatewayKey)}`)) {
      throw new BadRequestException('callbackUrl باید به مسیر payments/callback/{key} در backend اشاره کند، نه صفحه نتیجه فروشگاه');
    }
  }

  private getCode(payload: ZarinpalRequestResponse) {
    return payload.data?.code ?? (Array.isArray(payload.errors) ? undefined : payload.errors?.code);
  }

  private getFailureMessage(code?: number) {
    const messages: Record<number, string> = {
      [-9]: 'اطلاعات پرداخت یا مبلغ ارسالی معتبر نیست',
      [-10]: 'مرچنت یا IP ثبت‌شده در زرین‌پال معتبر نیست',
      [-11]: 'درگاه زرین‌پال هنوز فعال نشده است',
      [-12]: 'تعداد درخواست‌های زرین‌پال بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید',
      [-14]: 'دامنه callback با دامنه ثبت‌شده در زرین‌پال مطابقت ندارد',
      [-15]: 'درگاه زرین‌پال تعلیق شده است؛ با پشتیبانی زرین‌پال تماس بگیرید',
      [-50]: 'مبلغ تأیید پرداخت با مبلغ ثبت‌شده در زرین‌پال یکسان نیست',
      [-51]: 'پرداخت در زرین‌پال ناموفق بوده است',
      [-53]: 'این پرداخت متعلق به مرچنت تنظیم‌شده نیست',
      [-54]: 'شناسه درخواست پرداخت زرین‌پال معتبر نیست',
    };
    const message = code !== undefined ? messages[code] ?? 'پاسخ موفق و کامل از زرین‌پال دریافت نشد' : 'پاسخ معتبر از زرین‌پال دریافت نشد';
    return code !== undefined ? `${message} (کد ${code})` : message;
  }

  private async post(baseUrl: string, action: 'request' | 'verify', body: Record<string, unknown>) {
    try {
      const response = await fetch(`${baseUrl}/pg/v4/payment/${action}.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
        redirect: 'error',
      });
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid gateway response');
      return { response, payload: payload as ZarinpalRequestResponse };
    } catch {
      throw new ServiceUnavailableException('ارتباط با زرین‌پال برقرار نشد یا پاسخ معتبر دریافت نشد؛ وضعیت پرداخت را پیش از تلاش مجدد بررسی کنید');
    }
  }
}

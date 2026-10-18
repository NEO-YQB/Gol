import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PaymentGatewayConfig } from '@prisma/client';
import { ZarinpalPaymentGatewayAdapter } from './zarinpal-payment-gateway.adapter';

function gatewayConfig(overrides: Partial<PaymentGatewayConfig> = {}): PaymentGatewayConfig {
  return {
    id: 1,
    key: 'zarinpal-main',
    displayName: 'زرین‌پال',
    driver: 'zarinpal',
    isActive: true,
    isDefault: true,
    priority: 1,
    sandboxMode: false,
    merchantConfig: { merchantId: '11111111-1111-4111-8111-111111111111' },
    technicalConfig: null,
    callbackUrl: 'https://api.example.com/v1/payments/callback/zarinpal-main',
    returnUrl: 'https://shop.example.com/payment/thank-you',
    notes: null,
    metadata: null,
    createdAt: new Date('2026-10-17T00:00:00Z'),
    updatedAt: new Date('2026-10-17T00:00:00Z'),
    ...overrides,
  };
}

function gatewayResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('ZarinpalPaymentGatewayAdapter', () => {
  const adapter = new ZarinpalPaymentGatewayAdapter();
  const authority = 'A'.repeat(36);

  beforeEach(() => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No mocked gateway response'));
  });

  afterEach(() => jest.restoreAllMocks());

  function initiate(config = gatewayConfig(), amount = 120000) {
    return adapter.initiate({ amount, orderId: 42, config, callbackUrl: config.callbackUrl });
  }

  function verify() {
    return adapter.verify({
      payment: { id: 7, amount: 120000, authority, gatewayConfig: gatewayConfig() },
      success: true,
    });
  }

  it('uses the live endpoint and sends toman amounts as rials', async () => {
    jest.mocked(fetch).mockResolvedValue(gatewayResponse({ data: { code: 100, authority }, errors: [] }));
    const result = await initiate();
    expect(fetch).toHaveBeenCalledWith('https://payment.zarinpal.com/pg/v4/payment/request.json', expect.any(Object));
    const request = JSON.parse(String(jest.mocked(fetch).mock.calls[0][1]?.body)) as Record<string, unknown>;
    expect(request).toMatchObject({ amount: 1200000, currency: 'IRR', metadata: { order_id: '42' } });
    expect(result.paymentUrl).toBe(`https://payment.zarinpal.com/pg/StartPay/${authority}`);
    expect(result.rawData).toMatchObject({ amountInRials: 1200000, currency: 'IRR' });
  });

  it('uses sandbox only when explicitly configured', async () => {
    jest.mocked(fetch).mockResolvedValue(gatewayResponse({ data: { code: 100, authority } }));
    const result = await initiate(gatewayConfig({ sandboxMode: true }));
    expect(fetch).toHaveBeenCalledWith('https://sandbox.zarinpal.com/pg/v4/payment/request.json', expect.any(Object));
    expect(result.paymentUrl).toBe(`https://sandbox.zarinpal.com/pg/StartPay/${authority}`);
  });

  it.each([100, 101])('verifies the same rial amount for success code %s', async (code) => {
    jest.mocked(fetch).mockResolvedValue(gatewayResponse({ data: { code, ref_id: 123456 }, errors: [] }));
    expect(await verify()).toMatchObject({ success: true, refId: '123456' });
    const request = JSON.parse(String(jest.mocked(fetch).mock.calls[0][1]?.body)) as Record<string, unknown>;
    expect(request).toMatchObject({ amount: 1200000, authority });
    expect(fetch).toHaveBeenCalledWith('https://payment.zarinpal.com/pg/v4/payment/verify.json', expect.any(Object));
  });

  it('does not accept an HTTP failure as a successful verification', async () => {
    jest.mocked(fetch).mockResolvedValue(gatewayResponse({ data: { code: 100, ref_id: 123456 } }, 503));
    expect(await verify()).toMatchObject({ success: false, refId: null });
  });

  it('requires a reference ID before accepting verification', async () => {
    jest.mocked(fetch).mockResolvedValue(gatewayResponse({ data: { code: 100 } }));
    expect(await verify()).toMatchObject({ success: false, refId: null });
  });

  it('reports actionable errors without exposing the merchant', async () => {
    jest.mocked(fetch).mockResolvedValue(gatewayResponse({ data: [], errors: { code: -10, message: 'secret provider message' } }, 400));
    const request = initiate();
    await expect(request).rejects.toThrow('کد -10');
    await expect(request).rejects.not.toThrow('secret provider message');
  });

  it('accepts and trims the merchant_id alias', async () => {
    jest.mocked(fetch).mockResolvedValue(gatewayResponse({ data: { code: 100, authority } }));
    await initiate(gatewayConfig({ merchantConfig: { merchant_id: ' 11111111-1111-4111-8111-111111111111 ' } }));
    const request = JSON.parse(String(jest.mocked(fetch).mock.calls[0][1]?.body)) as Record<string, unknown>;
    expect(request.merchant_id).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('rejects malformed merchants without making a gateway request', async () => {
    await expect(initiate(gatewayConfig({ merchantConfig: { merchantId: 'invalid' } }))).rejects.toThrow(BadRequestException);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a callback that points to the storefront instead of the backend', async () => {
    await expect(initiate(gatewayConfig({ callbackUrl: 'https://shop.example.com/payment/thank-you' }))).rejects.toThrow(BadRequestException);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects conflicting sandbox and production base URLs', async () => {
    await expect(initiate(gatewayConfig({ technicalConfig: { baseUrl: 'https://sandbox.zarinpal.com' } }))).rejects.toThrow('baseUrl');
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER])('rejects invalid amounts: %s', async (amount) => {
    await expect(initiate(gatewayConfig(), amount)).rejects.toThrow(BadRequestException);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles network failures without treating the payment as verified', async () => {
    await expect(verify()).rejects.toThrow(ServiceUnavailableException);
  });

  it('handles a non-JSON provider response', async () => {
    jest.mocked(fetch).mockResolvedValue(new Response('<html>Unavailable</html>', { status: 502 }));
    await expect(initiate()).rejects.toThrow(ServiceUnavailableException);
  });

  it('does not verify a cancelled callback', async () => {
    expect(await adapter.verify({
      payment: { id: 7, amount: 120000, authority, gatewayConfig: gatewayConfig() }, success: false,
    })).toMatchObject({ success: false });
    expect(fetch).not.toHaveBeenCalled();
  });
});

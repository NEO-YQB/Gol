import { BadRequestException } from '@nestjs/common';
import { assertProductDeliveryHours, buildProductDeliveryPolicy, resolveScheduledDelivery } from './delivery-policy';

describe('product delivery scheduling', () => {
  const now = new Date('2026-10-17T08:00:00.000Z');
  const store = {
    minDeliveryHours: 3,
    maxDeliveryHours: 6,
    hasExpressDelivery: true,
    expressDeliveryHours: 2,
  };
  const product = { store, maxAdvanceOrderDays: 5 };

  it('inherits delivery settings for existing products', () => {
    expect(buildProductDeliveryPolicy([product], now)).toMatchObject({
      minDeliveryHours: 3,
      maxDeliveryHours: 6,
      hasExpressDelivery: true,
      expressDeliveryHours: 2,
      earliestStandardDeliveryAt: '2026-10-17T14:00:00.000Z',
      earliestExpressDeliveryAt: '2026-10-17T10:00:00.000Z',
      latestScheduledDeliveryAt: '2026-10-22T20:29:59.999Z',
    });
  });

  it('uses the longest lead time and shortest scheduling horizon across products', () => {
    expect(buildProductDeliveryPolicy([
      { ...product, minDeliveryHours: 1, maxDeliveryHours: 2, expressDeliveryHours: 1 },
      { ...product, minDeliveryHours: 6, maxDeliveryHours: 24, expressDeliveryHours: 4, maxAdvanceOrderDays: 2 },
    ], now)).toMatchObject({
      minDeliveryHours: 6,
      maxDeliveryHours: 24,
      expressDeliveryHours: 4,
      maxAdvanceOrderDays: 2,
      earliestStandardDeliveryAt: '2026-10-18T08:00:00.000Z',
      latestScheduledDeliveryAt: '2026-10-19T20:29:59.999Z',
    });
  });

  it('disables express when any product does not support it', () => {
    const policy = buildProductDeliveryPolicy([product, { ...product, hasExpressDelivery: false }], now);
    expect(policy.hasExpressDelivery).toBe(false);
    expect(policy.earliestExpressDeliveryAt).toBeNull();
    expect(() => resolveScheduledDelivery(policy, 'EXPRESS', '2026-10-19T15:00:00+03:30')).toThrow(BadRequestException);
  });

  it('lets a product explicitly enable express independently of its store default', () => {
    expect(buildProductDeliveryPolicy([{
      ...product, store: { ...store, hasExpressDelivery: false }, hasExpressDelivery: true,
    }], now).hasExpressDelivery).toBe(true);
  });

  it('accepts a future date and stores the requested timestamp as an instant', () => {
    const policy = buildProductDeliveryPolicy([product], now);
    expect(resolveScheduledDelivery(policy, 'STANDARD', '2026-10-19T15:00:00+03:30')?.toISOString())
      .toBe('2026-10-19T11:30:00.000Z');
  });

  it('preserves immediate ordering when no date is selected', () => {
    expect(resolveScheduledDelivery(buildProductDeliveryPolicy([product], now), 'STANDARD')).toBeNull();
  });

  it('rejects express delivery for scheduled orders even when every product supports it', () => {
    const policy = buildProductDeliveryPolicy([product], now);
    expect(policy.hasExpressDelivery).toBe(true);
    expect(() => resolveScheduledDelivery(policy, 'EXPRESS', '2026-10-19T15:00:00+03:30'))
      .toThrow('ارسال فوری برای سفارش زمان‌بندی‌شده قابل انتخاب نیست');
  });

  it('keeps express delivery available for immediate orders', () => {
    expect(resolveScheduledDelivery(buildProductDeliveryPolicy([product], now), 'EXPRESS')).toBeNull();
  });

  it.each(['2026-10-16T15:00:00+03:30', '2026-10-17T16:00:00+03:30', '2026-10-23T00:00:00+03:30', 'invalid'])(
    'rejects a past, too-early, out-of-horizon or invalid date: %s', (selected) => {
      expect(() => resolveScheduledDelivery(buildProductDeliveryPolicy([product], now), 'STANDARD', selected))
        .toThrow(BadRequestException);
    },
  );

  it('accepts both exact lead-time and final-day boundaries', () => {
    const policy = buildProductDeliveryPolicy([product], now);
    expect(resolveScheduledDelivery(policy, 'STANDARD', policy.earliestStandardDeliveryAt)).toBeInstanceOf(Date);
    expect(resolveScheduledDelivery(policy, 'STANDARD', policy.latestScheduledDeliveryAt)).toBeInstanceOf(Date);
  });

  it('uses the Tehran calendar day near UTC midnight', () => {
    const policy = buildProductDeliveryPolicy([product], new Date('2026-10-17T21:00:00.000Z'));
    expect(policy.latestScheduledDeliveryAt).toBe('2026-10-23T20:29:59.999Z');
  });

  it('allows a product to restrict advance ordering to today', () => {
    expect(buildProductDeliveryPolicy([{ ...product, maxAdvanceOrderDays: 0 }], now).latestScheduledDeliveryAt)
      .toBe('2026-10-17T20:29:59.999Z');
  });

  it('rejects an inverted product delivery range', () => {
    expect(() => assertProductDeliveryHours({ minDeliveryHours: 12, maxDeliveryHours: 6 }))
      .toThrow(BadRequestException);
  });

  it.each([null, -1, 6, 1.5])('rejects an invalid advance-order limit: %s', (days) => {
    expect(() => assertProductDeliveryHours({ maxAdvanceOrderDays: days })).toThrow(BadRequestException);
  });
});

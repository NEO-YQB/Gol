import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { CreateOrderDto } from './create-order.dto';
import { CreateOrderFromCartDto } from './create-order-from-cart.dto';

describe('online-only order payment', () => {
  const orderDtos = [
    {
      name: 'direct order',
      create: (paymentMethod: unknown) => plainToInstance(CreateOrderDto, {
        items: [{ productId: 1, quantity: 1 }], paymentMethod,
      }),
    },
    {
      name: 'order from cart',
      create: (paymentMethod: unknown) => plainToInstance(CreateOrderFromCartDto, {
        addressId: 1, nationalId: '0012345678', paymentMethod,
      }),
    },
  ];

  it.each(orderDtos)('accepts online payment for $name', async ({ create }) => {
    expect(await validate(create(PaymentMethod.ONLINE))).toHaveLength(0);
  });

  it.each(orderDtos)('rejects COD for $name', async ({ create }) => {
    const errors = await validate(create(PaymentMethod.COD));
    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ property: 'paymentMethod', constraints: expect.objectContaining({ equals: expect.any(String) }) }),
    ]));
  });

  it.each(orderDtos)('rejects unsupported payment values for $name', async ({ create }) => {
    for (const paymentMethod of ['OFFLINE', '', false, 0]) {
      const errors = await validate(create(paymentMethod));
      expect(errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ property: 'paymentMethod' }),
      ]));
    }
  });

  it.each(orderDtos)('requires a full timestamp with timezone for scheduled $name', async ({ create }) => {
    for (const scheduledDeliveryAt of ['2026-10-19', '2026-10-19T15:00:00', 'invalid']) {
      const dto = Object.assign(create(PaymentMethod.ONLINE), { scheduledDeliveryAt });
      const errors = await validate(dto);
      expect(errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ property: 'scheduledDeliveryAt' }),
      ]));
    }
  });

  it.each(orderDtos)('accepts a timezone-aware scheduled $name', async ({ create }) => {
    const dto = Object.assign(create(PaymentMethod.ONLINE), { scheduledDeliveryAt: '2026-10-19T15:00:00+03:30' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('allows the direct-order API to use its online-only default', async () => {
    expect(await validate(orderDtos[0].create(undefined))).toHaveLength(0);
  });

  it('requires a payment method when submitting a cart', async () => {
    const errors = await validate(orderDtos[1].create(undefined));
    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ property: 'paymentMethod' }),
    ]));
  });
});

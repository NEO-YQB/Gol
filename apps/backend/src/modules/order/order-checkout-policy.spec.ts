import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DeliveryType, PaymentMethod } from '@prisma/client';
import { DomainEventsService } from '../../common/services/domain-events.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AbilityFactory } from '../auth/ability.factory';
import { PricingService } from '../discount/pricing.service';
import { FinanceService } from '../finance/finance.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderService } from './order.service';

describe('order checkout policy enforcement', () => {
  const user = { id: 1, roles: ['CUSTOMER'] };
  const store = {
    id: 1, name: 'فروشگاه', slug: 'store', ownerId: 9,
    sameDayDelivery: true, hasExpressDelivery: true,
    minDeliveryHours: 3, maxDeliveryHours: 6, expressDeliveryHours: 2,
    deliveryWindows: [{ label: 'عصر' }], isActive: true, isVerified: true,
  };
  const product = {
    id: 1, name: 'محصول', slug: 'product', mainImage: '/product.jpg',
    quantity: 5, price: 10000, discountPrice: null, categoryId: 1,
    isPurchasable: true, isArchived: false, publicationStatus: 'PUBLISHED',
    minDeliveryHours: null, maxDeliveryHours: null, hasExpressDelivery: null,
    expressDeliveryHours: null, maxAdvanceOrderDays: 5, store,
  };
  const items = [{ productId: 1, quantity: 1 }];
  const stopAfterPolicy = new Error('Pricing reached after checkout policy validation');
  let service: OrderService;
  let prisma: {
    product: { findMany: jest.Mock };
    userAddress: { findUnique: jest.Mock };
    cart: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let pricing: { resolveCartPricing: jest.Mock };

  beforeEach(async () => {
    prisma = {
      product: { findMany: jest.fn().mockResolvedValue([product]) },
      userAddress: { findUnique: jest.fn().mockResolvedValue({ id: 1, userId: user.id }) },
      cart: { findUnique: jest.fn().mockResolvedValue({ id: 1, items: [{ ...items[0], product }] }) },
      $transaction: jest.fn(),
    };
    pricing = { resolveCartPricing: jest.fn().mockRejectedValue(stopAfterPolicy) };
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: prisma },
        { provide: DomainEventsService, useValue: {} },
        { provide: AbilityFactory, useValue: { createForUser: jest.fn().mockResolvedValue({ can: () => true }) } },
        { provide: PricingService, useValue: pricing },
        { provide: FinanceService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();
    service = module.get(OrderService);
  });

  it('rejects direct COD orders before product lookup or inventory mutation', async () => {
    await expect(service.create(user, { items, paymentMethod: PaymentMethod.COD }))
      .rejects.toThrow('ثبت سفارش فقط با پرداخت آنلاین امکان‌پذیر است');
    expect(prisma.product.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects COD from the cart before inventory mutation', async () => {
    await expect(service.createFromCart(user, {
      addressId: 1, nationalId: '0012345678', paymentMethod: PaymentMethod.COD,
    })).rejects.toThrow(BadRequestException);
    expect(prisma.product.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('defaults direct orders to online payment', async () => {
    await expect(service.create(user, { items })).rejects.toBe(stopAfterPolicy);
    expect(pricing.resolveCartPricing).toHaveBeenCalledTimes(1);
  });

  it('keeps express delivery available for immediate online orders', async () => {
    await expect(service.create(user, { items, deliveryType: DeliveryType.EXPRESS }))
      .rejects.toBe(stopAfterPolicy);
  });

  it('uses normal preparation time when a scheduled order omits delivery type', async () => {
    await expect(service.create(user, {
      items, scheduledDeliveryAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    })).rejects.toBe(stopAfterPolicy);
  });

  it('rejects express scheduled orders before pricing or inventory mutation', async () => {
    await expect(service.create(user, {
      items, deliveryType: DeliveryType.EXPRESS,
      scheduledDeliveryAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    })).rejects.toThrow('ارسال فوری برای سفارش زمان‌بندی‌شده قابل انتخاب نیست');
    expect(pricing.resolveCartPricing).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a separate delivery window on a scheduled order', async () => {
    await expect(service.create(user, {
      items, deliveryWindowLabel: 'عصر',
      scheduledDeliveryAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    })).rejects.toThrow('برای سفارش زمان‌بندی‌شده، بازه ارسال جداگانه قابل انتخاب نیست');
    expect(pricing.resolveCartPricing).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('advertises online payment in the checkout preview', async () => {
    pricing.resolveCartPricing.mockResolvedValue({ items: [], coupon: null, pricing: { totalAmount: 10000 } });
    const preview = await service.previewFromCart(user, { addressId: 1 });
    expect(preview.payment.paymentMethod).toBe(PaymentMethod.ONLINE);
  });
});

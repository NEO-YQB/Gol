import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DomainEventType,
  DeliveryType,
  OrderActorType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SettlementStatus,
  UserAddress,
} from '@prisma/client';
import { DomainEventsService } from '../../common/services/domain-events.service';
import { subject } from '@casl/ability';
import { PrismaService } from '../../prisma/prisma.service';
import { AbilityFactory } from '../auth/ability.factory';
import { PricingService } from '../discount/pricing.service';
import { FinanceService } from '../finance/finance.service';
import { CheckoutPreviewDto } from './dto/checkout-preview.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderFromCartDto } from './dto/create-order-from-cart.dto';
import { OptionalOrderReasonDto } from './dto/optional-order-reason.dto';
import { OrderActionNoteDto } from './dto/order-action-note.dto';
import { OrderReasonDto } from './dto/order-reason.dto';

type AuthenticatedUser = {
  id: number;
  roles: string[];
};

type OrderExpiryCheckShape = {
  id: number;
  status: OrderStatus;
  storeId: number | null;
  payment: {
    id: number;
    status: PaymentStatus;
    expiresAt: Date | null;
  } | null;
  orderItems: Array<{ productId: number; quantity: number }>;
};

type ProductSnapshot = {
  id: number;
  name: string;
  slug: string;
  mainImage: string;
  quantity: number;
  price: number;
  discountPrice: number | null;
  categoryId: number;
  store: {
    id: number;
    name: string;
    slug: string;
    ownerId: number;
    sameDayDelivery: boolean;
    hasExpressDelivery: boolean;
    minDeliveryHours: number | null;
    maxDeliveryHours: number | null;
    expressDeliveryHours: number | null;
    deliveryWindows: Prisma.JsonValue | null;
    isActive: boolean;
    isVerified: boolean;
  };
};

type RequestedOrderItem = {
  productId: number;
  quantity: number;
};

type HistoryPayload = {
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  actorType: OrderActorType;
  actorUserId?: number | null;
  reason?: string;
  note?: string;
};

const INTERACTIVE_TX_OPTIONS = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
    private readonly abilityFactory: AbilityFactory,
    private readonly pricingService: PricingService,
    private readonly financeService: FinanceService,
  ) {}

  async previewFromCart(user: AuthenticatedUser, dto: CheckoutPreviewDto) {
    await this.assertOrderAbility(user, 'create', user.id);
    await this.assertCartReadable(user);

    const address = await this.getOwnedAddress(user.id, dto.addressId);
    const cart = await this.getCartWithProducts(user.id);

    if (cart.items.length === 0) {
      throw new BadRequestException('سبد خرید خالی است و امکان checkout وجود ندارد');
    }
    this.assertProductsAvailableForNewOrder(
      cart.items.map((item) => item.product),
    );

    const pricing = await this.pricingService.resolveCartPricing({
      userId: user.id,
      items: cart.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: item.product,
      })),
      couponCode: dto.couponCode,
    });
    const store = this.extractSingleStore(cart.items.map((item) => item.product));

    return {
      cartId: cart.id,
      store,
      delivery: this.buildDeliveryPreview(store),
      address: this.mapAddress(address),
      payment: {
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.PENDING,
      },
      items: pricing.items,
      coupon: pricing.coupon,
      ...pricing.pricing,
    };
  }

  async createFromCart(user: AuthenticatedUser, dto: CreateOrderFromCartDto) {
    await this.assertOrderAbility(user, 'create', user.id);
    await this.assertCartReadable(user);

    const address = await this.getOwnedAddress(user.id, dto.addressId);
    const cart = await this.getCartWithProducts(user.id);

    if (cart.items.length === 0) {
      throw new BadRequestException('سبد خرید خالی است و امکان ایجاد سفارش وجود ندارد');
    }

    const requestedItems = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    return this.createOrderRecord(user, requestedItems, {
      address,
      paymentMethod: dto.paymentMethod,
      deliveryType: dto.deliveryType,
      deliveryWindowLabel: dto.deliveryWindowLabel,
      couponCode: dto.couponCode,
      nationalId: dto.nationalId,
      clearCartId: cart.id,
    });
  }

  async create(user: AuthenticatedUser, dto: CreateOrderDto) {
    await this.assertOrderAbility(user, 'create', user.id);

    const address = dto.addressId
      ? await this.getOwnedAddress(user.id, dto.addressId)
      : null;

    return this.createOrderRecord(user, dto.items, {
      address,
      paymentMethod: dto.paymentMethod ?? PaymentMethod.COD,
      deliveryType: dto.deliveryType,
      deliveryWindowLabel: dto.deliveryWindowLabel,
      couponCode: dto.couponCode,
    });
  }

  async findAll(user: AuthenticatedUser) {
    await this.assertOrderAbility(user, 'read', user.id);

    const orders = await this.prisma.order.findMany({
      where: { userId: user.id },
      include: this.getOrderListInclude(),
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    return this.syncExpiredPaymentsAndRefetch(orders, {
      where: { userId: user.id },
      include: this.getOrderListInclude(),
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async findVendorOrders(user: AuthenticatedUser) {
    await this.assertVendorRole(user);

    const store = await this.prisma.store.findFirst({
      where: { ownerId: user.id },
      select: { isActive: true },
    });
    const currentOrderStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.PAID,
      OrderStatus.ACCEPTED,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
    ];
    const orders = await this.prisma.order.findMany({
      where: {
        store: {
          ownerId: user.id,
        },
        ...(store?.isActive === false
          ? { status: { in: currentOrderStatuses } }
          : {}),
      },
      include: this.getOrderListInclude(),
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    return this.syncExpiredPaymentsAndRefetch(orders, {
      where: {
        store: {
          ownerId: user.id,
        },
        ...(store?.isActive === false
          ? { status: { in: currentOrderStatuses } }
          : {}),
      },
      include: this.getOrderListInclude(),
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async findAdminOrders(user: AuthenticatedUser) {
    await this.assertAdminRole(user);

    const orders = await this.prisma.order.findMany({
      include: this.getOrderListInclude(),
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    return this.syncExpiredPaymentsAndRefetch(orders, {
      include: this.getOrderListInclude(),
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async findOne(user: AuthenticatedUser, id: number) {
    const order = await this.getOrderOrThrow(id);
    await this.assertCanViewOrder(user, order);
    this.assertSuspendedVendorCanViewOrder(user, order);
    return this.attachOperationalView(order);
  }

  async accept(user: AuthenticatedUser, id: number, dto: OrderActionNoteDto) {
    const order = await this.getOrderOrThrow(id);
    await this.assertCanManageVendorOrder(user, order);

    const acceptableStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.PAID,
    ];
    if (!acceptableStatuses.includes(order.status)) {
      throw new BadRequestException('فقط سفارش در وضعیت انتظار یا پرداخت‌شده قابل پذیرش است');
    }

    if (
      order.paymentMethod === PaymentMethod.ONLINE &&
      order.paymentStatus !== PaymentStatus.PAID
    ) {
      throw new BadRequestException('سفارش آنلاین فقط بعد از پرداخت موفق قابل پذیرش است');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        include: this.getOrderInclude(),
      });

      await this.createHistory(tx, order.id, {
        fromStatus: order.status,
        toStatus: OrderStatus.ACCEPTED,
        actorType: this.isAdmin(user) ? OrderActorType.ADMIN : OrderActorType.VENDOR,
        actorUserId: user.id,
        note: dto.note,
      });
      await this.domainEvents.record(tx, {
        eventType: DomainEventType.ORDER_ACCEPTED,
        aggregateType: 'order',
        aggregateId: order.id,
        actorUserId: user.id,
        storeId: order.storeId,
        orderId: order.id,
        summary: `سفارش #${order.id} پذیرفته شد`,
        payload: { fromStatus: order.status, toStatus: OrderStatus.ACCEPTED, note: dto.note ?? null },
      });

      return updatedOrder;
    }, INTERACTIVE_TX_OPTIONS);
  }

  async ship(user: AuthenticatedUser, id: number, dto: OrderActionNoteDto) {
    const order = await this.getOrderOrThrow(id);
    await this.assertCanManageVendorOrder(user, order);

    const shippableStatuses: OrderStatus[] = [
      OrderStatus.ACCEPTED,
      OrderStatus.PROCESSING,
    ];
    if (!shippableStatuses.includes(order.status)) {
      throw new BadRequestException('فقط سفارش پذیرفته شده قابل ثبت به عنوان ارسال شده است');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.SHIPPED,
          shippedAt: new Date(),
        },
        include: this.getOrderInclude(),
      });

      await this.createHistory(tx, order.id, {
        fromStatus: order.status,
        toStatus: OrderStatus.SHIPPED,
        actorType: this.isAdmin(user) ? OrderActorType.ADMIN : OrderActorType.VENDOR,
        actorUserId: user.id,
        note: dto.note,
      });
      await this.domainEvents.record(tx, {
        eventType: DomainEventType.ORDER_SHIPPED,
        aggregateType: 'order',
        aggregateId: order.id,
        actorUserId: user.id,
        storeId: order.storeId,
        orderId: order.id,
        summary: `سفارش #${order.id} ارسال شد`,
        payload: { fromStatus: order.status, toStatus: OrderStatus.SHIPPED, note: dto.note ?? null },
      });

      return updatedOrder;
    }, INTERACTIVE_TX_OPTIONS);
  }

  async deliver(user: AuthenticatedUser, id: number, dto: OrderActionNoteDto) {
    const order = await this.getOrderOrThrow(id);
    await this.assertCanManageVendorOrder(user, order);

    if (order.status !== OrderStatus.SHIPPED) {
      throw new BadRequestException('فقط سفارش ارسال شده قابل ثبت به عنوان تحویل داده شده است');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.DELIVERED,
          deliveredAt: new Date(),
        },
        include: this.getOrderInclude(),
      });

      await this.createHistory(tx, order.id, {
        fromStatus: order.status,
        toStatus: OrderStatus.DELIVERED,
        actorType: this.isAdmin(user) ? OrderActorType.ADMIN : OrderActorType.VENDOR,
        actorUserId: user.id,
        note: dto.note,
      });
      await this.domainEvents.record(tx, {
        eventType: DomainEventType.ORDER_DELIVERED,
        aggregateType: 'order',
        aggregateId: order.id,
        actorUserId: user.id,
        storeId: order.storeId,
        orderId: order.id,
        summary: `سفارش #${order.id} تحویل شد`,
        payload: { fromStatus: order.status, toStatus: OrderStatus.DELIVERED, note: dto.note ?? null },
      });

      return updatedOrder;
    }, INTERACTIVE_TX_OPTIONS).then(async (updatedOrder) => {
      await this.financeService.holdOrderVendorEarning(updatedOrder.id);
      return this.getOrderOrThrow(updatedOrder.id);
    });
  }

  async vendorCancel(user: AuthenticatedUser, id: number, dto: OrderReasonDto) {
    const order = await this.getOrderOrThrow(id);
    await this.assertCanManageVendorOrder(user, order);

    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.ACCEPTED,
      OrderStatus.PROCESSING,
    ];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('فقط سفارش های در انتظار یا پذیرفته شده قابل لغو توسط فروشنده هستند');
    }

    return this.cancelWithInventoryRestore(order, {
      status: OrderStatus.REJECTED_BY_VENDOR,
      actorType: this.isAdmin(user) ? OrderActorType.ADMIN : OrderActorType.VENDOR,
      actorUserId: user.id,
      reason: dto.reason,
      note: dto.note,
    });
  }

  async cancel(user: AuthenticatedUser, id: number, dto: OptionalOrderReasonDto) {
    const order = await this.getOrderOrThrow(id);

    if (this.isAdmin(user)) {
      if (this.isTerminalStatus(order.status)) {
        throw new BadRequestException('این سفارش دیگر قابل لغو نیست');
      }

      return this.cancelWithInventoryRestore(order, {
        status: OrderStatus.CANCELLED_BY_ADMIN,
        actorType: OrderActorType.ADMIN,
        actorUserId: user.id,
        reason: dto.reason,
        note: dto.note,
      });
    }

    await this.assertOrderAbility(user, 'update', order.userId);

    if (order.userId !== user.id) {
      throw new ForbiddenException('شما فقط می‌توانید سفارش خودتان را لغو کنید');
    }

    const customerCancellableStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.ACCEPTED,
    ];
    if (!customerCancellableStatuses.includes(order.status)) {
      throw new BadRequestException('این سفارش در وضعیت قابل لغو توسط مشتری نیست');
    }

    return this.cancelWithInventoryRestore(order, {
      status: OrderStatus.CANCELLED_BY_CUSTOMER,
      actorType: OrderActorType.CUSTOMER,
      actorUserId: user.id,
      reason: dto.reason,
      note: dto.note,
    });
  }

  private async createOrderRecord(
    user: AuthenticatedUser,
    items: RequestedOrderItem[],
    options: {
      address: UserAddress | null;
      paymentMethod: PaymentMethod;
      deliveryType?: DeliveryType;
      deliveryWindowLabel?: string;
      couponCode?: string;
      nationalId?: string;
      clearCartId?: number;
    },
  ) {
    if (items.length === 0) {
      throw new BadRequestException('حداقل یک آیتم برای ثبت سفارش لازم است');
    }

    const normalizedItems = this.normalizeItems(items);
    const products = await this.getProductSnapshots(
      normalizedItems.map((item) => item.productId),
    );
    const productMap = new Map(products.map((product) => [product.id, product]));
    const store = this.extractSingleStore(products);
    const deliverySelection = this.resolveDeliverySelection(store, {
      deliveryType: options.deliveryType,
      deliveryWindowLabel: options.deliveryWindowLabel,
    });

    for (const item of normalizedItems) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`محصول ${item.productId} برای سفارش یافت نشد`);
      }

      if (product.quantity < item.quantity) {
        throw new BadRequestException(
          `موجودی محصول ${item.productId} برای این سفارش کافی نیست`,
        );
      }
    }

    const pricing = await this.pricingService.resolveCartPricing({
      userId: user.id,
      items: normalizedItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        product: productMap.get(item.productId)!,
      })),
      couponCode: options.couponCode,
    });

    const subtotalAmount = pricing.pricing.subtotalAfterLineDiscounts;
    const deliveryFee = pricing.pricing.deliveryFee;
    const discountAmount = pricing.pricing.discountAmount;
    const totalAmount = pricing.pricing.totalAmount;
    const pricedItemMap = new Map(
      pricing.items.map((item) => [item.productId, item]),
    );
    const finance = await this.financeService.resolveOrderFinance({
      storeId: store.id,
      discountedItemSubtotal: pricing.pricing.subtotalAfterLineDiscounts,
      pricing: pricing.pricing as unknown as Record<string, unknown>,
      coupon: pricing.coupon as Record<string, unknown> | null,
    });

    if (options.nationalId?.trim()) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          nationalId: options.nationalId.trim(),
          id: { not: user.id },
        },
        select: { id: true },
      });

      if (existingUser) {
        throw new BadRequestException('این کد ملی قبلاً برای حساب دیگری ثبت شده است');
      }
    }

    const orderCreateInput: Prisma.OrderUncheckedCreateInput = {
      userId: user.id,
      totalAmount: new Prisma.Decimal(totalAmount),
      subtotalBaseAmount: new Prisma.Decimal(pricing.pricing.subtotalBaseAmount),
      subtotalAmount: new Prisma.Decimal(subtotalAmount),
      subtotalAfterLineDiscounts: new Prisma.Decimal(
        pricing.pricing.subtotalAfterLineDiscounts,
      ),
      deliveryFee: new Prisma.Decimal(deliveryFee),
      lineDiscountAmount: new Prisma.Decimal(
        pricing.pricing.lineDiscountAmount,
      ),
      couponDiscountAmount: new Prisma.Decimal(
        pricing.pricing.couponDiscountAmount,
      ),
      discountAmount: new Prisma.Decimal(discountAmount),
      commissionRuleId: finance.commissionRuleId,
      settlementStatus: finance.settlementStatus,
      commissionRate: new Prisma.Decimal(finance.commissionRate),
      commissionBaseAmount: new Prisma.Decimal(finance.commissionBaseAmount),
      platformCommissionAmount: new Prisma.Decimal(
        finance.platformCommissionAmount,
      ),
      systemServiceFeeAmount: new Prisma.Decimal(
        finance.systemServiceFeeAmount,
      ),
      platformTotalShareAmount: new Prisma.Decimal(
        finance.platformTotalShareAmount,
      ),
      vendorShareAmount: new Prisma.Decimal(finance.vendorShareAmount),
      settlementHoldDays: finance.settlementHoldDays,
      complaintWindowHours: finance.complaintWindowHours,
      settlementAutoReleaseEnabled: finance.autoReleaseEnabled,
      couponCode: pricing.coupon?.code ?? null,
      couponTitle: pricing.coupon?.title ?? null,
      couponApplyOn: pricing.coupon?.applyOn ?? null,
      pricingSnapshot: this.buildOrderPricingSnapshot(pricing),
      financialSnapshot: finance.financialSnapshot,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: options.paymentMethod,
      shippingAddressId: options.address?.id ?? null,
      shippingAddressTitle: options.address?.title ?? null,
      shippingAddressText: options.address?.address ?? null,
      shippingCity: options.address?.city ?? null,
      shippingLat: options.address?.lat ?? null,
      shippingLng: options.address?.lng ?? null,
      customerNationalId: options.nationalId?.trim() || null,
      storeId: store.id,
      storeName: store.name,
      storeSlug: store.slug,
      deliveryType: deliverySelection.deliveryType,
      deliveryWindowLabel: deliverySelection.deliveryWindowLabel,
      estimatedDeliveryMinHours: deliverySelection.estimatedDeliveryMinHours,
      estimatedDeliveryMaxHours: deliverySelection.estimatedDeliveryMaxHours,
      orderItems: {
        create: normalizedItems.map((item) => {
          const product = productMap.get(item.productId)!;
          const pricedItem = pricedItemMap.get(item.productId);
          return {
            productId: item.productId,
            quantity: item.quantity,
            price: new Prisma.Decimal(
              pricedItem?.pricing.finalUnitPriceBeforeCoupon ??
                this.getEffectiveProductPrice(product),
            ),
            pricingSnapshot: pricedItem
              ? this.buildOrderItemPricingSnapshot(pricedItem)
              : undefined,
            productName: product.name,
            productSlug: product.slug,
            productImage: product.mainImage,
            storeId: product.store.id,
            storeName: product.store.name,
            storeSlug: product.store.slug,
          };
        }),
      },
    };

    return this.prisma.$transaction(async (tx) => {
      if (options.nationalId?.trim()) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            nationalId: options.nationalId.trim(),
          },
        });
      }

      const order = await tx.order.create({
        data: orderCreateInput,
        include: this.getOrderInclude(),
      });

      if (pricing.coupon) {
        await tx.couponRedemption.create({
          data: {
            couponId: pricing.coupon.id,
            userId: user.id,
            orderId: order.id,
          },
        });
      }

      await this.createHistory(tx, order.id, {
        toStatus: OrderStatus.PENDING,
        actorType: OrderActorType.CUSTOMER,
        actorUserId: user.id,
        note: 'سفارش ایجاد شد',
      });
      await this.domainEvents.record(tx, {
        eventType: DomainEventType.ORDER_CREATED,
        aggregateType: 'order',
        aggregateId: order.id,
        actorUserId: user.id,
        storeId: order.storeId,
        orderId: order.id,
        summary: `سفارش #${order.id} ایجاد شد`,
        payload: {
          paymentMethod: order.paymentMethod,
          totalAmount: Number(order.totalAmount),
          itemCount: normalizedItems.length,
        },
      });

      for (const item of normalizedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      if (options.clearCartId) {
        await tx.cartItem.deleteMany({
          where: { cartId: options.clearCartId },
        });
      }

      return order;
    }, INTERACTIVE_TX_OPTIONS);
  }

  private async cancelWithInventoryRestore(
    order: Awaited<ReturnType<OrderService['getOrderOrThrow']>>,
    payload: {
      status: OrderStatus;
      actorType: OrderActorType;
      actorUserId: number;
      reason?: string;
      note?: string;
    },
  ) {
    if (this.isTerminalStatus(order.status)) {
      throw new BadRequestException('این سفارش دیگر قابل لغو نیست');
    }

    const restoredQuantities = new Map<number, number>();
    for (const item of order.orderItems) {
      restoredQuantities.set(
        item.productId,
        (restoredQuantities.get(item.productId) ?? 0) + item.quantity,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: payload.status,
          paymentStatus:
            order.paymentStatus === PaymentStatus.PAID
              ? PaymentStatus.REFUNDED
              : PaymentStatus.CANCELLED,
          settlementStatus: SettlementStatus.REVERSED,
          cancelledAt: new Date(),
        },
        include: this.getOrderInclude(),
      });

      await tx.payment.updateMany({
        where: { orderId: order.id },
        data: {
          status:
            order.paymentStatus === PaymentStatus.PAID
              ? PaymentStatus.REFUNDED
              : PaymentStatus.CANCELLED,
          failureReason:
            order.paymentStatus === PaymentStatus.PAID
              ? 'سفارش پس از پرداخت لغو شد و نیاز به بازگشت وجه دارد'
              : 'سفارش قبل از پرداخت نهایی لغو شد',
        },
      });

      await tx.couponRedemption.deleteMany({
        where: { orderId: order.id },
      });

      for (const [productId, quantity] of restoredQuantities.entries()) {
        await tx.product.update({
          where: { id: productId },
          data: {
            quantity: {
              increment: quantity,
            },
          },
        });
      }

      await this.createHistory(tx, order.id, {
        fromStatus: order.status,
        toStatus: payload.status,
        actorType: payload.actorType,
        actorUserId: payload.actorUserId,
        reason: payload.reason,
        note: payload.note,
      });
      await this.domainEvents.record(tx, {
        eventType: DomainEventType.ORDER_CANCELLED,
        aggregateType: 'order',
        aggregateId: order.id,
        actorUserId: payload.actorUserId,
        storeId: order.storeId,
        orderId: order.id,
        summary: `سفارش #${order.id} لغو شد`,
        payload: {
          fromStatus: order.status,
          toStatus: payload.status,
          reason: payload.reason ?? null,
          note: payload.note ?? null,
        },
      });

      return updatedOrder;
    }, INTERACTIVE_TX_OPTIONS).then(async (updatedOrder) => {
      await this.financeService.reverseOrderSettlement(order.id, payload.actorUserId);
      return this.getOrderOrThrow(updatedOrder.id);
    });
  }

  private extractSingleStore(products: ProductSnapshot[]) {
    const stores = new Map(products.map((product) => [product.store.id, product.store]));
    if (stores.size !== 1) {
      throw new BadRequestException('هر سفارش فقط می‌تواند شامل محصولات یک فروشگاه باشد');
    }

    const [store] = stores.values();
    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      ownerId: store.ownerId,
      sameDayDelivery: store.sameDayDelivery,
      hasExpressDelivery: store.hasExpressDelivery,
      minDeliveryHours: store.minDeliveryHours,
      maxDeliveryHours: store.maxDeliveryHours,
      expressDeliveryHours: store.expressDeliveryHours,
      deliveryWindows: store.deliveryWindows,
    };
  }

  private buildDeliveryPreview(store: ReturnType<OrderService['extractSingleStore']>) {
    return {
      sameDayDelivery: store.sameDayDelivery,
      hasExpressDelivery: store.hasExpressDelivery,
      minDeliveryHours: store.minDeliveryHours,
      maxDeliveryHours: store.maxDeliveryHours,
      expressDeliveryHours: store.expressDeliveryHours,
      deliveryWindows: store.deliveryWindows ?? [],
      availableDeliveryTypes: [
        DeliveryType.STANDARD,
        ...(store.hasExpressDelivery ? [DeliveryType.EXPRESS] : []),
      ],
    };
  }

  private resolveDeliverySelection(
    store: ReturnType<OrderService['extractSingleStore']>,
    selection: {
      deliveryType?: DeliveryType;
      deliveryWindowLabel?: string;
    },
  ) {
    const deliveryType = selection.deliveryType ?? DeliveryType.STANDARD;

    if (deliveryType === DeliveryType.EXPRESS && !store.hasExpressDelivery) {
      throw new BadRequestException('این فروشگاه در حال حاضر ارسال فوری ندارد');
    }

    const availableWindows = Array.isArray(store.deliveryWindows)
      ? store.deliveryWindows
      : [];

    if (selection.deliveryWindowLabel) {
      const matchingWindow = availableWindows.find((window) => {
        if (!window || typeof window !== 'object' || Array.isArray(window)) {
          return false;
        }

        const record = window as Record<string, unknown>;
        return (
          record.label === selection.deliveryWindowLabel ||
          record.key === selection.deliveryWindowLabel
        );
      });

      if (!matchingWindow) {
        throw new BadRequestException('بازه زمانی انتخاب‌شده برای این فروشگاه معتبر نیست');
      }
    }

    if (deliveryType === DeliveryType.EXPRESS) {
      const expressHours = store.expressDeliveryHours ?? store.minDeliveryHours ?? 1;
      return {
        deliveryType,
        deliveryWindowLabel: selection.deliveryWindowLabel ?? null,
        estimatedDeliveryMinHours: expressHours,
        estimatedDeliveryMaxHours: expressHours,
      };
    }

    return {
      deliveryType,
      deliveryWindowLabel: selection.deliveryWindowLabel ?? null,
      estimatedDeliveryMinHours: store.minDeliveryHours ?? null,
      estimatedDeliveryMaxHours: store.maxDeliveryHours ?? null,
    };
  }

  private async getProductSnapshots(productIds: number[]) {
    const uniqueProductIds = [...new Set(productIds)];

    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueProductIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        mainImage: true,
        quantity: true,
        price: true,
        discountPrice: true,
        isPurchasable: true,
        isArchived: true,
        publicationStatus: true,
        categoryId: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
            sameDayDelivery: true,
            hasExpressDelivery: true,
            minDeliveryHours: true,
            maxDeliveryHours: true,
            expressDeliveryHours: true,
            deliveryWindows: true,
            isActive: true,
            isVerified: true,
          },
        },
      },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new NotFoundException('یک یا چند محصول سفارش وجود ندارند');
    }

    this.assertProductsAvailableForNewOrder(products);

    return products;
  }

  private assertProductsAvailableForNewOrder(
    products: Array<{
      isPurchasable: boolean;
      isArchived: boolean;
      publicationStatus: string;
      store: {
        isActive: boolean;
        isVerified: boolean;
      };
    }>,
  ) {
    if (
      products.some(
        (product) =>
          !product.isPurchasable ||
          product.isArchived ||
          product.publicationStatus !== 'PUBLISHED' ||
          !product.store.isActive ||
          !product.store.isVerified,
      )
    ) {
      throw new BadRequestException('یک یا چند محصول انتخاب‌شده فعلاً قابل خرید نیستند');
    }
  }

  private async getOwnedAddress(userId: number, addressId: number) {
    const address = await this.prisma.userAddress.findUnique({
      where: { id: addressId },
    });

    if (!address || address.userId !== userId) {
      throw new NotFoundException('آدرس انتخابی برای این کاربر یافت نشد');
    }

    return address;
  }

  private async getCartWithProducts(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                mainImage: true,
                quantity: true,
                price: true,
                discountPrice: true,
                isPurchasable: true,
                isArchived: true,
                publicationStatus: true,
                categoryId: true,
                store: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    ownerId: true,
                    sameDayDelivery: true,
                    hasExpressDelivery: true,
                    minDeliveryHours: true,
                    maxDeliveryHours: true,
                    expressDeliveryHours: true,
                    deliveryWindows: true,
                    isActive: true,
                    isVerified: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      throw new BadRequestException('سبد خریدی برای این کاربر پیدا نشد');
    }

    return cart;
  }

  private normalizeItems(items: RequestedOrderItem[]) {
    const quantities = new Map<number, number>();

    for (const item of items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) + item.quantity,
      );
    }

    return [...quantities.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
  }

  private mapAddress(address: UserAddress) {
    return {
      id: address.id,
      title: address.title,
      address: address.address,
      city: address.city,
      lat: address.lat,
      lng: address.lng,
    };
  }

  private getEffectiveProductPrice(product: {
    price: number;
    discountPrice?: number | null;
  }) {
    return product.discountPrice ?? product.price;
  }

  private buildOrderPricingSnapshot(
    pricing: Awaited<ReturnType<PricingService['resolveCartPricing']>>,
  ) {
    return {
      pricing: pricing.pricing,
      coupon: pricing.coupon,
      items: pricing.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        pricing: item.pricing,
      })),
    } as Prisma.InputJsonValue;
  }

  private buildOrderItemPricingSnapshot(
    item: Awaited<ReturnType<PricingService['resolveCartPricing']>>['items'][number],
  ) {
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      pricing: item.pricing,
    } as Prisma.InputJsonValue;
  }

  private isAdmin(user: AuthenticatedUser) {
    return user.roles.includes('ADMIN');
  }

  private isVendor(user: AuthenticatedUser) {
    return user.roles.includes('VENDOR');
  }

  private isTerminalStatus(status: OrderStatus) {
    const terminalStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.REJECTED_BY_VENDOR,
      OrderStatus.CANCELLED,
      OrderStatus.CANCELLED_BY_ADMIN,
      OrderStatus.CANCELLED_BY_CUSTOMER,
    ];

    return terminalStatuses.includes(status);
  }

  private assertSuspendedVendorCanViewOrder(
    user: AuthenticatedUser,
    order: {
      status: OrderStatus;
      store: { ownerId: number; isActive: boolean } | null;
    },
  ) {
    if (
      this.isVendor(user) &&
      !this.isAdmin(user) &&
      order.store?.ownerId === user.id &&
      order.store.isActive === false &&
      this.isTerminalStatus(order.status)
    ) {
      throw new ForbiddenException(
        'در زمان غیرفعال بودن فروشگاه فقط سفارش‌های جاری قابل دسترسی هستند',
      );
    }
  }

  private getOrderInclude() {
    return {
      payment: true,
      user: {
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          nationalId: true,
        },
      },
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          ownerId: true,
          isActive: true,
        },
      },
      orderItems: {
        include: {
          product: true,
        },
      },
      couponRedemptions: {
        include: {
          coupon: true,
        },
      },
      statusHistories: {
        orderBy: {
          createdAt: 'desc' as const,
        },
      },
      domainEvents: {
        orderBy: {
          createdAt: 'desc' as const,
        },
      },
    };
  }

  /**
   * Lighter relation set for list endpoints (findAll/findVendorOrders/findAdminOrders).
   * Avoids pulling full Product rows, coupon details, status history and domain events
   * for every order on every list load — those are only needed on the single-order
   * detail view (see getOrderInclude/getOrderOrThrow), while still including everything
   * expirePaymentIfNeeded() needs to detect and reconcile expired pending payments.
   */
  private getOrderListInclude() {
    return {
      payment: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
        },
      },
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          ownerId: true,
          isActive: true,
        },
      },
      orderItems: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          price: true,
          productName: true,
          productImage: true,
        },
      },
    };
  }

  private attachOperationalView(
    order: Awaited<ReturnType<OrderService['getOrderOrThrow']>>,
  ) {
    const latestOperationalFlags = [
      ...(order.paymentMethod === PaymentMethod.ONLINE &&
      order.paymentStatus === PaymentStatus.EXPIRED
        ? ['PAYMENT_EXPIRED']
        : []),
      ...(order.status === OrderStatus.DELIVERED &&
      order.settlementStatus === SettlementStatus.PENDING
        ? ['SETTLEMENT_NOT_HELD']
        : []),
      ...(order.settlementStatus === SettlementStatus.ON_HOLD &&
      order.settlementEligibleAt &&
      !order.earningsReleasedAt &&
      order.settlementEligibleAt.getTime() < Date.now()
        ? ['SETTLEMENT_OVERDUE']
        : []),
    ];

    return {
      ...order,
      customerName: order.user?.fullName ?? null,
      customerPhoneNumber: order.user?.phoneNumber ?? null,
      customerNationalId: order.customerNationalId ?? order.user?.nationalId ?? null,
      timeline: order.statusHistories,
      auditTrail: order.domainEvents,
      latestOperationalFlags,
      availableActions: {
        canAccept:
          order.status === OrderStatus.PENDING || order.status === OrderStatus.PAID,
        canShip:
          order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.PROCESSING,
        canDeliver: order.status === OrderStatus.SHIPPED,
        canCancel: !this.isTerminalStatus(order.status),
        canInitiatePayment:
          order.paymentMethod === PaymentMethod.ONLINE &&
          !this.isTerminalStatus(order.status) &&
          order.paymentStatus !== PaymentStatus.PAID &&
          order.paymentStatus !== PaymentStatus.EXPIRED,
      },
    };
  }

  private async getOrderOrThrow(id: number) {
    let order = await this.prisma.order.findUnique({
      where: { id },
      include: this.getOrderInclude(),
    });

    if (!order) {
      throw new NotFoundException('سفارش یافت نشد');
    }

    const hasChanged = await this.expirePaymentIfNeeded(order);
    if (hasChanged) {
      order = await this.prisma.order.findUnique({
        where: { id },
        include: this.getOrderInclude(),
      });
    }

    if (!order) {
      throw new NotFoundException('سفارش یافت نشد');
    }

    return order;
  }

  private async syncExpiredPaymentsAndRefetch(
    orders: OrderExpiryCheckShape[],
    query: Prisma.OrderFindManyArgs,
  ) {
    let hasChanged = false;

    for (const order of orders) {
      const changed = await this.expirePaymentIfNeeded(order);
      hasChanged = hasChanged || changed;
    }

    if (!hasChanged) {
      return orders;
    }

    return this.prisma.order.findMany(query);
  }

  private async expirePaymentIfNeeded(
    order: OrderExpiryCheckShape,
  ) {
    const payment = order.payment;

    if (
      !payment ||
      payment.status !== PaymentStatus.PENDING ||
      !payment.expiresAt ||
      payment.expiresAt.getTime() > Date.now()
    ) {
      return false;
    }

    const restoredQuantities = new Map<number, number>();
    for (const item of order.orderItems) {
      restoredQuantities.set(
        item.productId,
        (restoredQuantities.get(item.productId) ?? 0) + item.quantity,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.EXPIRED,
          failureReason: 'مهلت پرداخت به پایان رسید',
          rawVerifyData: {
            expiredAt: new Date().toISOString(),
            reason: 'payment window expired',
          } as Prisma.InputJsonValue,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.EXPIRED,
          settlementStatus: SettlementStatus.REVERSED,
          cancelledAt: new Date(),
        },
      });

      await tx.couponRedemption.deleteMany({
        where: { orderId: order.id },
      });

      for (const [productId, quantity] of restoredQuantities.entries()) {
        await tx.product.update({
          where: { id: productId },
          data: {
            quantity: {
              increment: quantity,
            },
          },
        });
      }

      await this.createHistory(tx, order.id, {
        fromStatus: order.status,
        toStatus: OrderStatus.CANCELLED,
        actorType: OrderActorType.SYSTEM,
        reason: 'مهلت پرداخت سفارش به پایان رسید',
        note: 'به علت انقضای payment، موجودی رزروشده آزاد شد',
      });
      await this.domainEvents.record(tx, {
        eventType: DomainEventType.PAYMENT_EXPIRED,
        aggregateType: 'payment',
        aggregateId: payment.id,
        storeId: order.storeId,
        orderId: order.id,
        paymentId: payment.id,
        summary: `پرداخت سفارش #${order.id} منقضی شد`,
        payload: {
          fromOrderStatus: order.status,
          toOrderStatus: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.EXPIRED,
        },
      });
    }, INTERACTIVE_TX_OPTIONS);

    await this.financeService.reverseOrderSettlement(order.id);

    return true;
  }

  private async createHistory(
    tx: Prisma.TransactionClient,
    orderId: number,
    payload: HistoryPayload,
  ) {
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: payload.fromStatus ?? null,
        toStatus: payload.toStatus,
        actorType: payload.actorType,
        actorUserId: payload.actorUserId ?? null,
        reason: payload.reason,
        note: payload.note,
      },
    });
  }

  private async assertCanViewOrder(
    user: AuthenticatedUser,
    order: Awaited<ReturnType<OrderService['getOrderOrThrow']>>,
  ) {
    if (this.isAdmin(user)) {
      return;
    }

    if (order.userId === user.id) {
      await this.assertOrderAbility(user, 'read', order.userId);
      return;
    }

    if (this.isVendor(user) && order.store?.ownerId === user.id) {
      return;
    }

    throw new ForbiddenException('شما اجازه مشاهده این سفارش را ندارید');
  }

  private async assertCanManageVendorOrder(
    user: AuthenticatedUser,
    order: Awaited<ReturnType<OrderService['getOrderOrThrow']>>,
  ) {
    if (this.isAdmin(user)) {
      return;
    }

    if (this.isVendor(user) && order.store?.ownerId === user.id) {
      return;
    }

    throw new ForbiddenException('شما اجازه مدیریت این سفارش را ندارید');
  }

  private async assertCartReadable(user: AuthenticatedUser) {
    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can('read', subject('Cart', { userId: user.id }))) {
      throw new ForbiddenException('شما اجازه دسترسی به سبد خرید خود را ندارید');
    }
  }

  private async assertOrderAbility(
    user: AuthenticatedUser,
    action: 'create' | 'read' | 'update',
    ownerUserId: number,
  ) {
    const ability = await this.abilityFactory.createForUser(user);
    if (!ability.can(action, subject('Order', { userId: ownerUserId }))) {
      throw new ForbiddenException('شما اجازه دسترسی به سفارش را ندارید');
    }
  }

  private async assertVendorRole(user: AuthenticatedUser) {
    if (!this.isVendor(user)) {
      throw new ForbiddenException('این endpoint فقط برای فروشنده مجاز است');
    }
  }

  private async assertAdminRole(user: AuthenticatedUser) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('این endpoint فقط برای ادمین مجاز است');
    }
  }
}

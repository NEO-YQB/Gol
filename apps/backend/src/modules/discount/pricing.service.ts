import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Coupon,
  CouponApplyOn,
  DiscountValueType,
  OrderStatus,
  PlatformPromotion,
  VendorDiscount,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type PriceableStore = {
  id: number;
  name: string;
  slug: string;
  ownerId: number;
};

type PriceableProduct = {
  id: number;
  name: string;
  slug: string;
  mainImage: string;
  quantity: number;
  price: number;
  discountPrice: number | null;
  categoryId: number;
  store: PriceableStore;
};

type RequestedItem = {
  id?: number;
  productId: number;
  quantity: number;
  product: PriceableProduct;
};

type ResolvedRule = {
  sourceType: 'vendor' | 'promotion';
  sourceId: number;
  title: string;
  valueType: DiscountValueType;
  value: number;
  priority: number;
  isExclusive: boolean;
  allowCouponStacking: boolean;
};

type ResolvedLine = {
  id: number | null;
  productId: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    slug: string;
    mainImage: string;
    quantity: number;
    categoryId: number;
    store: {
      id: number;
      name: string;
      slug: string;
    };
  };
  pricing: {
    baseUnitPrice: number;
    lineBaseTotal: number;
    finalUnitPriceBeforeCoupon: number;
    finalLineTotalBeforeCoupon: number;
    lineDiscountAmount: number;
    legacyDiscountApplied: boolean;
    appliedRules: Array<{
      sourceType: 'vendor' | 'promotion';
      sourceId: number;
      title: string;
      valueType: DiscountValueType;
      value: number;
      priority: number;
      allowCouponStacking: boolean;
      discountAmount: number;
    }>;
    blockedCouponReason: string | null;
    couponEligible: boolean;
    couponBaseAmount: number;
  };
};

type CouponWithScopes = Coupon & {
  products: Array<{ productId: number }>;
  stores: Array<{ storeId: number }>;
  categories: Array<{ categoryId: number }>;
};

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveCartPricing(input: {
    userId: number;
    items: RequestedItem[];
    couponCode?: string;
  }) {
    if (input.items.length === 0) {
      throw new BadRequestException('حداقل یک آیتم برای محاسبه قیمت لازم است');
    }

    const productIds = input.items.map((item) => item.productId);
    const storeIds = input.items.map((item) => item.product.store.id);
    const categoryIds = input.items.map((item) => item.product.categoryId);

    const [vendorDiscounts, promotions, coupon] = await Promise.all([
      this.findActiveVendorDiscounts(productIds),
      this.findActivePlatformPromotions(productIds, storeIds, categoryIds),
      input.couponCode
        ? this.findCouponOrThrow(this.normalizeCouponCode(input.couponCode))
        : Promise.resolve(null),
    ]);

    const lines = input.items.map((item) =>
      this.resolveLine({
        item,
        vendorDiscount: vendorDiscounts.find(
          (discount) => discount.productId === item.productId,
        ) ?? null,
        promotions: promotions.filter((promotion) =>
          this.promotionMatchesProduct(promotion, item.product),
        ),
      }),
    );

    const subtotalBaseAmount = this.roundMoney(
      lines.reduce((sum, line) => sum + line.pricing.lineBaseTotal, 0),
    );
    const subtotalAfterLineDiscounts = this.roundMoney(
      lines.reduce((sum, line) => sum + line.pricing.finalLineTotalBeforeCoupon, 0),
    );
    const lineDiscountAmount = this.roundMoney(
      subtotalBaseAmount - subtotalAfterLineDiscounts,
    );

    const couponResolution = coupon
      ? await this.resolveCoupon({
          userId: input.userId,
          coupon,
          lines,
          subtotalBaseAmount,
          subtotalAfterLineDiscounts,
        })
      : null;

    const couponDiscountAmount = couponResolution?.discountAmount ?? 0;
    const discountAmount = this.roundMoney(lineDiscountAmount + couponDiscountAmount);
    const deliveryFee = 0;
    const totalAmount = this.roundMoney(
      subtotalAfterLineDiscounts + deliveryFee - couponDiscountAmount,
    );

    return {
      items: lines.map((line) => ({
        id: line.id,
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.pricing.finalUnitPriceBeforeCoupon,
        lineTotal: line.pricing.finalLineTotalBeforeCoupon,
        product: line.product,
        pricing: line.pricing,
      })),
      pricing: {
        subtotalBaseAmount,
        subtotalAfterLineDiscounts,
        deliveryFee,
        lineDiscountAmount,
        couponDiscountAmount,
        discountAmount,
        totalAmount,
        totalItems: lines.reduce((sum, line) => sum + line.quantity, 0),
      },
      coupon: couponResolution
        ? {
            id: couponResolution.coupon.id,
            code: couponResolution.coupon.code,
            title: couponResolution.coupon.title,
            applyOn: couponResolution.coupon.applyOn,
            discountAmount: couponResolution.discountAmount,
            eligibleSubtotal: couponResolution.eligibleSubtotal,
            eligibleItemProductIds: couponResolution.eligibleItemProductIds,
          }
        : null,
    };
  }

  private resolveLine(input: {
    item: RequestedItem;
    vendorDiscount: VendorDiscount | null;
    promotions: Array<PlatformPromotion & {
      products: Array<{ productId: number }>;
      stores: Array<{ storeId: number }>;
      categories: Array<{ categoryId: number }>;
    }>;
  }): ResolvedLine {
    const baseUnitPrice = this.roundMoney(input.item.product.price);
    const lineBaseTotal = this.roundMoney(baseUnitPrice * input.item.quantity);
    const legacyUnitPrice = this.resolveLegacyUnitPrice(input.item.product);
    const promotion = this.pickBestPromotion(input.promotions, baseUnitPrice);

    const vendorRule = input.vendorDiscount
      ? this.mapVendorRule(input.vendorDiscount)
      : null;
    const promotionRule = promotion ? this.mapPromotionRule(promotion) : null;

    let resolvedUnitPrice = baseUnitPrice;
    let appliedRules: ResolvedRule[] = [];

    if (vendorRule && promotionRule) {
      const canStack =
        !vendorRule.isExclusive &&
        !promotionRule.isExclusive &&
        !!promotion?.allowVendorDiscountStacking;

      if (canStack) {
        const stacked = this.applyStackedRules(baseUnitPrice, [vendorRule, promotionRule]);
        resolvedUnitPrice = stacked.finalUnitPrice;
        appliedRules = stacked.appliedRules;
      } else {
        const vendorOnly = this.applyRule(baseUnitPrice, vendorRule);
        const promotionOnly = this.applyRule(baseUnitPrice, promotionRule);
        const winner = this.pickBestNonStacked(baseUnitPrice, [vendorOnly, promotionOnly]);
        resolvedUnitPrice = winner.finalUnitPrice;
        appliedRules = winner.appliedRules;
      }
    } else if (vendorRule) {
      const vendorOnly = this.applyRule(baseUnitPrice, vendorRule);
      resolvedUnitPrice = vendorOnly.finalUnitPrice;
      appliedRules = vendorOnly.appliedRules;
    } else if (promotionRule) {
      const promotionOnly = this.applyRule(baseUnitPrice, promotionRule);
      resolvedUnitPrice = promotionOnly.finalUnitPrice;
      appliedRules = promotionOnly.appliedRules;
    }

    let legacyDiscountApplied = false;
    if (legacyUnitPrice !== null && legacyUnitPrice < resolvedUnitPrice) {
      resolvedUnitPrice = legacyUnitPrice;
      appliedRules = [];
      legacyDiscountApplied = true;
    }

    const finalUnitPriceBeforeCoupon = this.roundMoney(
      Math.max(0, resolvedUnitPrice),
    );
    const finalLineTotalBeforeCoupon = this.roundMoney(
      finalUnitPriceBeforeCoupon * input.item.quantity,
    );
    const lineDiscountAmount = this.roundMoney(
      lineBaseTotal - finalLineTotalBeforeCoupon,
    );

    return {
      id: input.item.id ?? null,
      productId: input.item.productId,
      quantity: input.item.quantity,
      product: {
        id: input.item.product.id,
        name: input.item.product.name,
        slug: input.item.product.slug,
        mainImage: input.item.product.mainImage,
        quantity: input.item.product.quantity,
        categoryId: input.item.product.categoryId,
        store: {
          id: input.item.product.store.id,
          name: input.item.product.store.name,
          slug: input.item.product.store.slug,
        },
      },
      pricing: {
        baseUnitPrice,
        lineBaseTotal,
        finalUnitPriceBeforeCoupon,
        finalLineTotalBeforeCoupon,
        lineDiscountAmount,
        legacyDiscountApplied,
        appliedRules: appliedRules.map((rule) => ({
          sourceType: rule.sourceType,
          sourceId: rule.sourceId,
          title: rule.title,
          valueType: rule.valueType,
          value: rule.value,
          priority: rule.priority,
          allowCouponStacking: rule.allowCouponStacking,
          discountAmount: this.roundMoney(
            baseUnitPrice - this.applyRule(baseUnitPrice, rule).finalUnitPrice,
          ),
        })),
        blockedCouponReason: null,
        couponEligible: true,
        couponBaseAmount: 0,
      },
    };
  }

  private async resolveCoupon(input: {
    userId: number;
    coupon: CouponWithScopes;
    lines: ResolvedLine[];
    subtotalBaseAmount: number;
    subtotalAfterLineDiscounts: number;
  }) {
    const coupon = input.coupon;
    const now = new Date();

    if (!coupon.isActive) {
      throw new BadRequestException('این کوپن فعال نیست');
    }

    if (coupon.startAt && coupon.startAt > now) {
      throw new BadRequestException('زمان شروع این کوپن هنوز نرسیده است');
    }

    if (coupon.endAt && coupon.endAt < now) {
      throw new BadRequestException('مهلت استفاده از این کوپن به پایان رسیده است');
    }

    if (
      coupon.minOrderAmount !== null &&
      input.subtotalAfterLineDiscounts < Number(coupon.minOrderAmount)
    ) {
      throw new BadRequestException('حداقل مبلغ لازم برای استفاده از این کوپن تامین نشده است');
    }

    const [totalUsageCount, userUsageCount, priorOrderCount] = await Promise.all([
      coupon.usageLimit
        ? this.prisma.couponRedemption.count({ where: { couponId: coupon.id } })
        : Promise.resolve(0),
      coupon.perUserUsageLimit
        ? this.prisma.couponRedemption.count({
            where: { couponId: coupon.id, userId: input.userId },
          })
        : Promise.resolve(0),
      coupon.firstOrderOnly
        ? this.prisma.order.count({
            where: {
              userId: input.userId,
              status: {
                notIn: [
                  OrderStatus.REJECTED_BY_VENDOR,
                  OrderStatus.CANCELLED,
                  OrderStatus.CANCELLED_BY_CUSTOMER,
                  OrderStatus.CANCELLED_BY_ADMIN,
                ],
              },
            },
          })
        : Promise.resolve(0),
    ]);

    if (coupon.usageLimit && totalUsageCount >= coupon.usageLimit) {
      throw new BadRequestException('ظرفیت استفاده از این کوپن تمام شده است');
    }

    if (coupon.perUserUsageLimit && userUsageCount >= coupon.perUserUsageLimit) {
      throw new BadRequestException('سقف استفاده شما از این کوپن تکمیل شده است');
    }

    if (coupon.firstOrderOnly && priorOrderCount > 0) {
      throw new BadRequestException('این کوپن فقط برای اولین خرید کاربر مجاز است');
    }

    const eligibleLines = input.lines.filter((line) =>
      this.couponMatchesLine(coupon, line),
    );

    if (eligibleLines.length === 0) {
      throw new BadRequestException('این کوپن روی آیتم‌های فعلی سفارش قابل اعمال نیست');
    }

    let eligibleSubtotal = 0;
    const eligibleItemProductIds: number[] = [];

    for (const line of input.lines) {
      const matchesScope = this.couponMatchesLine(coupon, line);
      let blockedCouponReason: string | null = null;

      if (matchesScope) {
        const hasVendorDiscount = line.pricing.appliedRules.some(
          (rule) => rule.sourceType === 'vendor',
        );
        const hasPromotion = line.pricing.appliedRules.some(
          (rule) => rule.sourceType === 'promotion',
        );
        const vendorAllowsCoupon = line.pricing.appliedRules
          .filter((rule) => rule.sourceType === 'vendor')
          .every((rule) => rule.allowCouponStacking);
        const promotionAllowsCoupon = line.pricing.appliedRules
          .filter((rule) => rule.sourceType === 'promotion')
          .every((rule) => rule.allowCouponStacking);

        if (
          hasVendorDiscount &&
          (!coupon.allowVendorDiscountStacking || !vendorAllowsCoupon)
        ) {
          blockedCouponReason = 'coupon-vendor-stacking-disabled';
        }

        if (
          hasPromotion &&
          (!coupon.allowPlatformPromotionStacking || !promotionAllowsCoupon)
        ) {
          blockedCouponReason = 'coupon-promotion-stacking-disabled';
        }
      }

      line.pricing.blockedCouponReason = blockedCouponReason;
      line.pricing.couponEligible = matchesScope && !blockedCouponReason;
      line.pricing.couponBaseAmount = line.pricing.couponEligible
        ? this.roundMoney(
            (coupon.applyOn === CouponApplyOn.BASE_SUBTOTAL
              ? line.pricing.baseUnitPrice
              : line.pricing.finalUnitPriceBeforeCoupon) * line.quantity,
          )
        : 0;

      if (line.pricing.couponEligible) {
        eligibleSubtotal += line.pricing.couponBaseAmount;
        eligibleItemProductIds.push(line.productId);
      }
    }

    eligibleSubtotal = this.roundMoney(eligibleSubtotal);
    if (eligibleSubtotal <= 0) {
      throw new BadRequestException(
        'این کوپن با تنظیمات stacking فعلی روی آیتم‌های سفارش قابل اعمال نیست',
      );
    }

    let discountAmount = 0;
    if (coupon.valueType === DiscountValueType.PERCENTAGE) {
      discountAmount = eligibleSubtotal * (Number(coupon.value) / 100);
    } else {
      discountAmount = Number(coupon.value);
    }

    discountAmount = this.roundMoney(Math.min(discountAmount, eligibleSubtotal));

    return {
      coupon,
      eligibleSubtotal,
      eligibleItemProductIds,
      discountAmount,
    };
  }

  private async findActiveVendorDiscounts(productIds: number[]) {
    const now = new Date();
    return this.prisma.vendorDiscount.findMany({
      where: {
        productId: { in: [...new Set(productIds)] },
        isActive: true,
      },
    }).then((items) =>
      items.filter((item) => this.isActiveInWindow(item.startAt, item.endAt, now)),
    );
  }

  private async findActivePlatformPromotions(
    productIds: number[],
    storeIds: number[],
    categoryIds: number[],
  ) {
    const now = new Date();
    return this.prisma.platformPromotion.findMany({
      where: {
        isActive: true,
        OR: [
          { products: { some: { productId: { in: [...new Set(productIds)] } } } },
          { stores: { some: { storeId: { in: [...new Set(storeIds)] } } } },
          { categories: { some: { categoryId: { in: [...new Set(categoryIds)] } } } },
        ],
      },
      include: {
        products: { select: { productId: true } },
        stores: { select: { storeId: true } },
        categories: { select: { categoryId: true } },
      },
      orderBy: [{ priority: 'asc' }, { id: 'desc' }],
    }).then((items) =>
      items.filter((item) => this.isActiveInWindow(item.startAt, item.endAt, now)),
    );
  }

  private async findCouponOrThrow(code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
      include: {
        products: { select: { productId: true } },
        stores: { select: { storeId: true } },
        categories: { select: { categoryId: true } },
      },
    });

    if (!coupon) {
      throw new NotFoundException('کوپن مورد نظر یافت نشد');
    }

    return coupon;
  }

  private pickBestPromotion(
    promotions: Array<PlatformPromotion & {
      products: Array<{ productId: number }>;
      stores: Array<{ storeId: number }>;
      categories: Array<{ categoryId: number }>;
    }>,
    baseUnitPrice: number,
  ) {
    if (promotions.length === 0) {
      return null;
    }

    const evaluated = promotions.map((promotion) => ({
      promotion,
      discountedPrice: this.applyDiscount(baseUnitPrice, promotion.valueType, Number(promotion.value)),
    }));

    evaluated.sort((a, b) => {
      if (a.promotion.priority !== b.promotion.priority) {
        return a.promotion.priority - b.promotion.priority;
      }

      if (a.discountedPrice !== b.discountedPrice) {
        return a.discountedPrice - b.discountedPrice;
      }

      return b.promotion.id - a.promotion.id;
    });

    return evaluated[0].promotion;
  }

  private promotionMatchesProduct(
    promotion: PlatformPromotion & {
      products: Array<{ productId: number }>;
      stores: Array<{ storeId: number }>;
      categories: Array<{ categoryId: number }>;
    },
    product: PriceableProduct,
  ) {
    return (
      promotion.products.some((item) => item.productId === product.id) ||
      promotion.stores.some((item) => item.storeId === product.store.id) ||
      promotion.categories.some((item) => item.categoryId === product.categoryId)
    );
  }

  private couponMatchesLine(coupon: CouponWithScopes, line: ResolvedLine) {
    const hasScopes =
      coupon.products.length > 0 ||
      coupon.stores.length > 0 ||
      coupon.categories.length > 0;

    if (!hasScopes) {
      return true;
    }

    return (
      coupon.products.some((item) => item.productId === line.productId) ||
      coupon.stores.some((item) => item.storeId === line.product.store.id) ||
      coupon.categories.some(
        (item) => item.categoryId === line.product.categoryId,
      )
    );
  }

  private mapVendorRule(discount: VendorDiscount): ResolvedRule {
    return {
      sourceType: 'vendor',
      sourceId: discount.id,
      title: discount.title,
      valueType: discount.valueType,
      value: Number(discount.value),
      priority: discount.priority,
      isExclusive: discount.isExclusive,
      allowCouponStacking: discount.allowCouponStacking,
    };
  }

  private mapPromotionRule(promotion: PlatformPromotion): ResolvedRule {
    return {
      sourceType: 'promotion',
      sourceId: promotion.id,
      title: promotion.title,
      valueType: promotion.valueType,
      value: Number(promotion.value),
      priority: promotion.priority,
      isExclusive: promotion.isExclusive,
      allowCouponStacking: promotion.allowCouponStacking,
    };
  }

  private applyRule(baseUnitPrice: number, rule: ResolvedRule) {
    const finalUnitPrice = this.applyDiscount(
      baseUnitPrice,
      rule.valueType,
      rule.value,
    );

    return {
      finalUnitPrice,
      appliedRules: [rule],
    };
  }

  private applyStackedRules(baseUnitPrice: number, rules: ResolvedRule[]) {
    const orders = this.buildStackOrders(rules);
    const evaluated = orders.map((order) => {
      let currentPrice = baseUnitPrice;
      for (const rule of order) {
        currentPrice = this.applyDiscount(currentPrice, rule.valueType, rule.value);
      }

      return {
        finalUnitPrice: this.roundMoney(currentPrice),
        appliedRules: order,
      };
    });

    evaluated.sort((a, b) => a.finalUnitPrice - b.finalUnitPrice);
    return evaluated[0];
  }

  private buildStackOrders(rules: ResolvedRule[]) {
    if (rules.length <= 1) {
      return [rules];
    }

    const [first, second] = rules;
    if (first.priority === second.priority) {
      return [rules, [second, first]];
    }

    return [
      [...rules].sort((a, b) => a.priority - b.priority),
    ];
  }

  private pickBestNonStacked(
    _baseUnitPrice: number,
    candidates: Array<{ finalUnitPrice: number; appliedRules: ResolvedRule[] }>,
  ) {
    return [...candidates].sort((a, b) => {
      const aPriority = a.appliedRules[0]?.priority ?? Number.MAX_SAFE_INTEGER;
      const bPriority = b.appliedRules[0]?.priority ?? Number.MAX_SAFE_INTEGER;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return a.finalUnitPrice - b.finalUnitPrice;
    })[0];
  }

  private resolveLegacyUnitPrice(product: PriceableProduct) {
    if (
      product.discountPrice === null ||
      product.discountPrice <= 0 ||
      product.discountPrice >= product.price
    ) {
      return null;
    }

    return this.roundMoney(product.discountPrice);
  }

  private applyDiscount(
    baseUnitPrice: number,
    valueType: DiscountValueType,
    value: number,
  ) {
    if (valueType === DiscountValueType.PERCENTAGE) {
      return this.roundMoney(
        Math.max(0, baseUnitPrice - baseUnitPrice * (value / 100)),
      );
    }

    return this.roundMoney(Math.max(0, baseUnitPrice - value));
  }

  private isActiveInWindow(
    startAt: Date | null,
    endAt: Date | null,
    now: Date,
  ) {
    if (startAt && startAt > now) {
      return false;
    }

    if (endAt && endAt < now) {
      return false;
    }

    return true;
  }

  private normalizeCouponCode(code: string) {
    return code.trim().toUpperCase();
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}

import { BadRequestException } from '@nestjs/common';

type DeliveryHours = {
  minDeliveryHours?: number | null;
  maxDeliveryHours?: number | null;
  hasExpressDelivery?: boolean | null;
  expressDeliveryHours?: number | null;
};

type DeliveryProduct = DeliveryHours & {
  maxAdvanceOrderDays?: number;
  store: DeliveryHours;
};

export function assertProductDeliveryHours(settings: DeliveryHours & { maxAdvanceOrderDays?: number | null }) {
  if (
    settings.maxAdvanceOrderDays !== undefined &&
    (settings.maxAdvanceOrderDays === null ||
      !Number.isInteger(settings.maxAdvanceOrderDays) ||
      settings.maxAdvanceOrderDays < 0 ||
      settings.maxAdvanceOrderDays > 5)
  ) {
    throw new BadRequestException('مهلت پیش‌سفارش باید عدد صحیح بین صفر و ۵ روز باشد');
  }
  if (
    settings.minDeliveryHours != null &&
    settings.maxDeliveryHours != null &&
    settings.minDeliveryHours > settings.maxDeliveryHours
  ) {
    throw new BadRequestException('حداقل زمان تحویل نمی‌تواند از حداکثر آن بیشتر باشد');
  }
}

export function buildProductDeliveryPolicy(products: DeliveryProduct[], now = new Date()) {
  const settings = products.map((product) => {
    const minimum = product.minDeliveryHours ?? product.store.minDeliveryHours ?? 0;
    const maximum = product.maxDeliveryHours ?? product.store.maxDeliveryHours ?? minimum;
    return {
      minimum,
      maximum: Math.max(minimum, maximum),
      express: product.hasExpressDelivery ?? product.store.hasExpressDelivery ?? false,
      expressHours: product.expressDeliveryHours ?? product.store.expressDeliveryHours ?? (minimum || 1),
      advanceDays: product.maxAdvanceOrderDays ?? 5,
    };
  });
  const minDeliveryHours = Math.max(0, ...settings.map((setting) => setting.minimum));
  const maxDeliveryHours = Math.max(0, ...settings.map((setting) => setting.maximum));
  const hasExpressDelivery = settings.length > 0 && settings.every((setting) => setting.express);
  const expressDeliveryHours = hasExpressDelivery
    ? Math.max(...settings.map((setting) => setting.expressHours))
    : null;
  const maxAdvanceOrderDays = Math.min(5, ...settings.map((setting) => setting.advanceDays));
  const tehranDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const datePart = (type: Intl.DateTimeFormatPartTypes) => tehranDate.find((part) => part.type === type)!.value;
  const lastDay = new Date(`${datePart('year')}-${datePart('month')}-${datePart('day')}T23:59:59.999+03:30`);
  lastDay.setTime(lastDay.getTime() + maxAdvanceOrderDays * 86_400_000);

  return {
    minDeliveryHours,
    maxDeliveryHours,
    hasExpressDelivery,
    expressDeliveryHours,
    maxAdvanceOrderDays,
    timeZone: 'Asia/Tehran',
    earliestStandardDeliveryAt: new Date(now.getTime() + maxDeliveryHours * 3_600_000).toISOString(),
    earliestExpressDeliveryAt: expressDeliveryHours === null
      ? null
      : new Date(now.getTime() + expressDeliveryHours * 3_600_000).toISOString(),
    latestScheduledDeliveryAt: lastDay.toISOString(),
  };
}

export function resolveScheduledDelivery(
  policy: ReturnType<typeof buildProductDeliveryPolicy>,
  deliveryType: string,
  scheduledDeliveryAt?: string,
) {
  if (!scheduledDeliveryAt) return null;
  if (deliveryType === 'EXPRESS') {
    throw new BadRequestException('ارسال فوری برای سفارش زمان‌بندی‌شده قابل انتخاب نیست');
  }
  const selected = new Date(scheduledDeliveryAt);
  const earliest = policy.earliestStandardDeliveryAt;
  if (
    !Number.isFinite(selected.getTime()) ||
    !earliest ||
    selected.getTime() < new Date(earliest).getTime() ||
    selected.getTime() > new Date(policy.latestScheduledDeliveryAt).getTime()
  ) {
    throw new BadRequestException('زمان تحویل باید پس از آماده‌سازی محصولات و در محدوده روزهای مجاز باشد');
  }
  return selected;
}

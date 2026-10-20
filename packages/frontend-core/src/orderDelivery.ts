const deliveryHoursFormatter = new Intl.NumberFormat('fa-IR')
const scheduledDeliveryFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: 'Asia/Tehran',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function readDeliveryText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readPositiveHours(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  const hours = Number(value)
  return Number.isFinite(hours) && hours > 0 ? hours : null
}

export function formatRequestedOrderDelivery(order: Record<string, unknown>) {
  const scheduledDeliveryAt = readDeliveryText(order.scheduledDeliveryAt)
  if (scheduledDeliveryAt) {
    const date = new Date(scheduledDeliveryAt)
    const dateLabel = Number.isNaN(date.getTime())
      ? 'تاریخ نامعتبر'
      : scheduledDeliveryFormatter.format(date)
    return `تحویل زمان‌بندی‌شده · ${dateLabel}`
  }

  const deliveryType = readDeliveryText(order.deliveryType).toUpperCase()
  const deliveryLabel = deliveryType === 'STANDARD'
    ? 'ارسال استاندارد'
    : deliveryType === 'EXPRESS'
      ? 'ارسال فوری'
      : 'نوع ارسال مشخص نشده'
  const minimumHours = readPositiveHours(order.estimatedDeliveryMinHours)
  const maximumHours = readPositiveHours(order.estimatedDeliveryMaxHours)
  const windowLabel = readDeliveryText(order.deliveryWindowLabel)
    .replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])
  let hoursLabel = ''

  if (minimumHours !== null && maximumHours !== null && minimumHours < maximumHours) {
    hoursLabel = `${deliveryHoursFormatter.format(minimumHours)} تا ${deliveryHoursFormatter.format(maximumHours)} ساعت`
  } else if (maximumHours !== null) {
    hoursLabel = `حداکثر ${deliveryHoursFormatter.format(maximumHours)} ساعت`
  } else if (minimumHours !== null) {
    hoursLabel = `حداقل ${deliveryHoursFormatter.format(minimumHours)} ساعت`
  }

  return [
    deliveryLabel,
    ...(windowLabel ? [`بازه انتخابی: ${windowLabel}`] : []),
    ...(hoursLabel ? [hoursLabel] : []),
  ].join(' · ')
}

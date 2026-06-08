export function translateOrderStatus(status?: string | null) {
  switch ((status || '').toUpperCase()) {
    case 'PENDING':
      return 'در انتظار بررسی'
    case 'ACCEPTED':
      return 'تایید شده'
    case 'PAID':
      return 'پرداخت‌شده'
    case 'PROCESSING':
      return 'در حال آماده‌سازی'
    case 'SHIPPED':
      return 'ارسال شده'
    case 'DELIVERED':
      return 'تحویل شده'
    case 'REJECTED_BY_VENDOR':
      return 'رد شده توسط فروشنده'
    case 'CANCELLED':
      return 'لغو شده'
    case 'CANCELLED_BY_CUSTOMER':
      return 'لغو شده توسط مشتری'
    case 'CANCELLED_BY_ADMIN':
      return 'لغو شده توسط ادمین'
    default:
      return status || '—'
  }
}

export function translatePaymentStatus(status?: string | null) {
  switch ((status || '').toUpperCase()) {
    case 'PENDING':
      return 'در انتظار پرداخت'
    case 'PAID':
      return 'پرداخت موفق'
    case 'FAILED':
      return 'پرداخت ناموفق'
    case 'EXPIRED':
      return 'منقضی شده'
    case 'PARTIALLY_REFUNDED':
      return 'بازگشت وجه جزئی'
    case 'REFUNDED':
      return 'بازگشت وجه'
    case 'CANCELLED':
      return 'لغو شده'
    default:
      return status || '—'
  }
}

export function translatePaymentMethod(method?: string | null) {
  switch ((method || '').toUpperCase()) {
    case 'ONLINE':
      return 'پرداخت آنلاین'
    case 'COD':
      return 'پرداخت در محل'
    default:
      return method || '—'
  }
}

export function translateDeliveryType(type?: string | null) {
  switch ((type || '').toUpperCase()) {
    case 'STANDARD':
      return 'ارسال استاندارد'
    case 'EXPRESS':
      return 'ارسال فوری'
    default:
      return type || '—'
  }
}

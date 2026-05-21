export const vendorRouteOrder = [
  'overview',
  'orders',
  'order-workspace',
  'store',
  'products',
  'discounts',
  'wallet',
  'support',
  'reviews',
  'notifications',
] as const

export type VendorRoute = (typeof vendorRouteOrder)[number]

export const vendorRouteLabels: Record<VendorRoute, string> = {
  overview: 'نمای کلی',
  orders: 'سفارش‌ها',
  'order-workspace': 'میزکار سفارش',
  store: 'پروفایل فروشگاه',
  products: 'محصولات',
  discounts: 'تخفیف‌ها و پروموشن‌ها',
  wallet: 'کیف پول و تسویه',
  support: 'پشتیبانی',
  reviews: 'کیفیت و سلامت',
  notifications: 'اعلان‌ها',
}

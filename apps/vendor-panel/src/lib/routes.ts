export const vendorRouteOrder = [
  'overview',
  'orders',
  'wallet',
  'support',
  'reviews',
  'notifications',
] as const

export type VendorRoute = (typeof vendorRouteOrder)[number]

export const vendorRouteLabels: Record<VendorRoute, string> = {
  overview: 'نمای کلی',
  orders: 'سفارش‌ها',
  wallet: 'کیف پول و تسویه',
  support: 'پشتیبانی',
  reviews: 'کیفیت و سلامت',
  notifications: 'اعلان‌ها',
}

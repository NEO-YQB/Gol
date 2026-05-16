export const adminRouteOrder = [
  'dashboard',
  'orders',
  'settlements',
  'support',
  'vendors',
  'content',
  'alerts',
] as const

export type AdminRoute = (typeof adminRouteOrder)[number]

export const adminRouteLabels: Record<AdminRoute, string> = {
  dashboard: 'داشبورد',
  orders: 'سفارش‌ها',
  settlements: 'تسویه و مالی',
  support: 'پشتیبانی',
  vendors: 'فروشنده‌ها و ریسک',
  content: 'محتوا و سئو',
  alerts: 'هشدارها و اعلان‌ها',
}

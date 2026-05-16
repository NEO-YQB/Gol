export const adminRouteOrder = [
  'dashboard',
  'orders',
  'settlements',
  'support',
  'supportWorkspace',
  'vendors',
  'vendorWorkspace',
  'content',
  'contentWorkspace',
  'alerts',
] as const

export type AdminRoute = (typeof adminRouteOrder)[number]

export const adminRouteLabels: Record<AdminRoute, string> = {
  dashboard: 'داشبورد',
  orders: 'سفارش‌ها',
  settlements: 'تسویه و مالی',
  support: 'پشتیبانی',
  supportWorkspace: 'workspace پشتیبانی',
  vendors: 'فروشنده‌ها و ریسک',
  vendorWorkspace: 'workspace فروشنده',
  content: 'محتوا و سئو',
  contentWorkspace: 'editor محتوایی',
  alerts: 'هشدارها و اعلان‌ها',
}

export const adminRouteOrder = [
  'dashboard',
  'orders',
  'ordersWorkspace',
  'settlements',
  'financeWorkspace',
  'support',
  'supportWorkspace',
  'vendors',
  'vendorWorkspace',
  'content',
  'contentWorkspace',
  'alerts',
  'accessControl',
  'accessControlWorkspace',
] as const

export type AdminRoute = (typeof adminRouteOrder)[number]

export const adminRouteLabels: Record<AdminRoute, string> = {
  dashboard: 'داشبورد',
  orders: 'سفارش ها',
  ordersWorkspace: 'میزکار سفارش',
  settlements: 'تسویه و مالی',
  financeWorkspace: 'میزکار مالی',
  support: 'پشتیبانی',
  supportWorkspace: 'میزکار پشتیبانی',
  vendors: 'فروشنده ها و ریسک',
  vendorWorkspace: 'میزکار فروشنده',
  content: 'محتوا و سئو',
  contentWorkspace: 'ویرایشگر محتوایی',
  alerts: 'هشدارها و اعلان ها',
  accessControl: 'کاربران و دسترسی',
  accessControlWorkspace: 'میزکار دسترسی',
}

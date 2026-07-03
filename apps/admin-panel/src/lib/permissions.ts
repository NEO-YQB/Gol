import type { AdminRoute } from './routes'
import type { AuthSession } from './session'

export type EffectivePermission = {
  action: string
  subject: string
}

export type SessionBootstrap = {
  effectivePermissions: EffectivePermission[]
}

export type AccessRequirement = {
  anyOf?: Array<{ action: string; subject: string }>
  roles?: string[]
}

const routeRequirements: Partial<Record<AdminRoute, AccessRequirement>> = {
  dashboard: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'Order' },
      { action: 'read', subject: 'SupportTicket' },
      { action: 'read', subject: 'AdminUser' },
      { action: 'create', subject: 'AdminUser' },
      { action: 'read', subject: 'Product' },
      { action: 'create', subject: 'Product' },
      { action: 'read', subject: 'Article' },
    ],
  },
  orders: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'Order' },
    ],
  },
  ordersWorkspace: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'Order' },
      { action: 'update', subject: 'Order' },
    ],
  },
  financeWorkspace: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'StoreWallet' },
      { action: 'update', subject: 'StoreWallet' },
      { action: 'read', subject: 'WalletTransaction' },
      { action: 'read', subject: 'CommissionRule' },
    ],
  },
  settlements: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'StoreWallet' },
      { action: 'read', subject: 'WalletTransaction' },
      { action: 'read', subject: 'CommissionRule' },
    ],
  },
  support: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'SupportTicket' },
    ],
  },
  supportWorkspace: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'SupportTicket' },
      { action: 'update', subject: 'SupportTicket' },
    ],
  },
  vendors: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'VendorOnboardingRequest' },
    ],
  },
  vendorWorkspace: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'VendorOnboardingRequest' },
      { action: 'review', subject: 'VendorOnboardingRequest' },
    ],
  },
  vendorOnboarding: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'VendorOnboardingRequest' },
    ],
  },
  vendorOnboardingWorkspace: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'VendorOnboardingRequest' },
      { action: 'review', subject: 'VendorOnboardingRequest' },
    ],
  },
  products: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'Product' },
      { action: 'create', subject: 'Product' },
      { action: 'update', subject: 'Product' },
    ],
  },
  productWorkspace: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'create', subject: 'Product' },
      { action: 'update', subject: 'Product' },
    ],
  },
  categoryWorkspace: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'Product' },
      { action: 'create', subject: 'Product' },
      { action: 'update', subject: 'Product' },
    ],
  },
  productTypeWorkspace: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'Product' },
      { action: 'create', subject: 'Product' },
      { action: 'update', subject: 'Product' },
    ],
  },
  pageBuilder: {
    roles: ['ADMIN'],
  },
  pageBuilderWorkspace: {
    roles: ['ADMIN'],
  },
  settings: {
    roles: ['ADMIN'],
  },
  storefrontInfoPagesWorkspace: {
    roles: ['ADMIN'],
  },
  content: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'Article' },
    ],
  },
  contentWorkspace: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'create', subject: 'Article' },
      { action: 'update', subject: 'Article' },
    ],
  },
  seoLandings: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'Article' },
    ],
  },
  seoLandingWorkspace: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'create', subject: 'Article' },
      { action: 'update', subject: 'Article' },
    ],
  },
  alerts: {
    roles: ['ADMIN'],
  },
  accessControl: {
    anyOf: [
      { action: 'manage', subject: 'all' },
      { action: 'read', subject: 'AdminUser' },
      { action: 'create', subject: 'AdminUser' },
      { action: 'read', subject: 'AdminRole' },
      { action: 'read', subject: 'AdminPermission' },
    ],
  },
}

function normalizePermissionKey(action: string, subject: string) {
  return `${action}:${subject}`
}

export function getPermissionKeys(session: AuthSession | null) {
  const permissions = session?.bootstrap?.effectivePermissions ?? []
  return new Set(permissions.map((item) => normalizePermissionKey(item.action, item.subject)))
}

export function hasPermission(session: AuthSession | null, action: string, subject: string) {
  const keys = getPermissionKeys(session)
  return keys.has('manage:all') || keys.has(normalizePermissionKey(action, subject))
}

export function hasRole(session: AuthSession | null, role: string) {
  return session?.user.roles.includes(role) ?? false
}

export function canAccessRoute(session: AuthSession | null, route: AdminRoute) {
  if (!session) return false
  const requirement = routeRequirements[route]
  if (!requirement) return true
  if (requirement.roles?.some((role) => hasRole(session, role))) return true
  if (requirement.anyOf?.some((entry) => hasPermission(session, entry.action, entry.subject))) return true
  return false
}

export function getFirstAccessibleRoute(session: AuthSession | null, routes: readonly AdminRoute[]) {
  return routes.find((route) => canAccessRoute(session, route)) ?? null
}

export function describeScope(session: AuthSession | null) {
  if (!session) return 'بدون نشست فعال'
  if (hasPermission(session, 'manage', 'all')) return 'دسترسی کامل ادمین'
  if (hasPermission(session, 'read', 'AdminUser')) return 'مدیریت دسترسی و کاربران'
  if (hasPermission(session, 'read', 'VendorOnboardingRequest')) return 'بررسی درخواست فروشنده'
  if (hasPermission(session, 'read', 'Product') || hasPermission(session, 'create', 'Product')) return 'مدیریت محصولات و کیفیت محتوایی'
  if (hasPermission(session, 'read', 'Article')) return 'تحریریه و عملیات محتوا'
  if (hasPermission(session, 'read', 'StoreWallet')) return 'عملیات مالی و تسویه'
  if (hasPermission(session, 'read', 'SupportTicket')) return 'رسیدگی به پشتیبانی'
  if (hasPermission(session, 'read', 'Order')) return 'عملیات سفارش'
  return 'دسترسی محدود عملیاتی'
}

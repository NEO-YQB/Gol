export type SessionUser = {
  id: number
  phoneNumber: string
  fullName?: string | null
  roles: string[]
}

export type VendorBootstrap = {
  roles?: string[]
  effectivePermissions?: Array<{
    action: string
    subject: string
  }>
  vendorOnboarding?: {
    applicationStatus: string
    productStatus: string
    storeActivatedAt?: string | null
  } | null
}

export type AuthSession = {
  accessToken: string
  user: SessionUser
  bootstrap?: VendorBootstrap
}

const SESSION_KEY = 'flower-marketplace.vendor.session'

export function loadSession(): AuthSession | null {
  const raw = window.localStorage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    window.localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function saveSession(session: AuthSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY)
}

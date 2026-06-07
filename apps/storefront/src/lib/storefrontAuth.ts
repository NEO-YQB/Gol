'use client'

export const STOREFRONT_TOKEN_KEY = 'golino.storefront.token'
export const STOREFRONT_SELECTED_ADDRESS_KEY = 'golino.storefront.selected-address'

export type StorefrontUser = {
  id: number
  phoneNumber: string
  fullName?: string | null
  roles: string[]
  needsProfileCompletion?: boolean
}

export type StorefrontAccountSummary = {
  profile: {
    id: number
    phoneNumber: string
    fullName?: string | null
    createdAt: string
  }
  stats: {
    orderCount: number
    activeOrderCount: number
    deliveredOrderCount: number
    addressCount: number
    defaultAddressTitle?: string | null
    latestOrderStatus?: string | null
  }
  recentOrders: Array<{
    id: number
    status: string
    paymentStatus: string
    totalAmount: number
    createdAt: string
    storeName?: string | null
    itemCount: number
  }>
  addresses: Array<{
    id: number
    title: string
    city: string
    address: string
    isDefault: boolean
  }>
}

export type StorefrontAddress = {
  id: number
  title: string
  city: string
  address: string
  lat: number
  lng: number
  isDefault: boolean
  userId?: number
  createdAt?: string
  updatedAt?: string
}

export type StorefrontSelectedAddressLocation = {
  id: number
  title: string
  lat: number
  lng: number
  isDefault: boolean
}

export type CreateStorefrontAddressInput = {
  title: string
  city: string
  address: string
  lat: number
  lng: number
  isDefault?: boolean
}

export type SendOtpResponse = {
  message: string
  expiresAt: string
}

export type VerifyOtpResponse = {
  access_token: string
  user: StorefrontUser
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = 'درخواست با خطا مواجه شد'
    try {
      const payload = (await response.json()) as { message?: string | string[] }
      if (Array.isArray(payload.message)) message = payload.message[0] || message
      else if (payload.message) message = payload.message
    } catch {}
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export function readStoredToken() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(STOREFRONT_TOKEN_KEY) || ''
}

export function writeStoredToken(token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STOREFRONT_TOKEN_KEY, token)
}

export function clearStoredToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STOREFRONT_TOKEN_KEY)
}

export function readStoredSelectedAddress() {
  if (typeof window === 'undefined') return null

  try {
    const rawValue = window.localStorage.getItem(STOREFRONT_SELECTED_ADDRESS_KEY)
    if (!rawValue) return null

    const payload = JSON.parse(rawValue) as Partial<StorefrontSelectedAddressLocation>
    if (
      typeof payload.id !== 'number' ||
      typeof payload.title !== 'string' ||
      typeof payload.lat !== 'number' ||
      typeof payload.lng !== 'number'
    ) {
      return null
    }

    return {
      id: payload.id,
      title: payload.title,
      lat: payload.lat,
      lng: payload.lng,
      isDefault: payload.isDefault === true,
    } satisfies StorefrontSelectedAddressLocation
  } catch {
    return null
  }
}

export function writeStoredSelectedAddress(address: StorefrontAddress | StorefrontSelectedAddressLocation) {
  if (typeof window === 'undefined') return

  const payload: StorefrontSelectedAddressLocation = {
    id: address.id,
    title: address.title,
    lat: address.lat,
    lng: address.lng,
    isDefault: address.isDefault === true,
  }

  window.localStorage.setItem(STOREFRONT_SELECTED_ADDRESS_KEY, JSON.stringify(payload))
}

export function clearStoredSelectedAddress() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STOREFRONT_SELECTED_ADDRESS_KEY)
}

export async function sendOtp(phoneNumber: string) {
  return request<SendOtpResponse>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  })
}

export async function verifyOtp(phoneNumber: string, code: string) {
  return request<VerifyOtpResponse>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, code }),
  })
}

export async function getCurrentUser(token: string) {
  return request<StorefrontUser>('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })
}

export async function completeProfile(token: string, fullName: string) {
  return request<StorefrontUser>('/auth/complete-profile', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fullName }),
  })
}

export async function getAccountSummary(token: string) {
  return request<StorefrontAccountSummary>('/auth/account-summary', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })
}

export async function getAddresses(token: string) {
  return request<StorefrontAddress[]>('/addresses', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })
}

export async function createAddress(token: string, payload: CreateStorefrontAddressInput) {
  return request<StorefrontAddress>('/addresses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function deleteAddress(token: string, id: number) {
  return request<StorefrontAddress>(`/addresses/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function setDefaultAddress(token: string, id: number) {
  return request<StorefrontAddress>(`/addresses/${id}/default`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

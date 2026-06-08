'use client'

import { emitStorefrontCartUpdated } from './storefrontCartEvents'

export const STOREFRONT_TOKEN_KEY = 'golino.storefront.token'
export const STOREFRONT_SELECTED_ADDRESS_KEY = 'golino.storefront.selected-address'

export type StorefrontUser = {
  id: number
  phoneNumber: string
  fullName?: string | null
  nationalId?: string | null
  roles: string[]
  needsProfileCompletion?: boolean
}

export type StorefrontAccountSummary = {
  profile: {
    id: number
    phoneNumber: string
    fullName?: string | null
    nationalId?: string | null
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

export type StorefrontCartItem = {
  id: number
  productId: number
  quantity: number
  unitPrice: number
  lineTotal: number
  product: {
    id: number
    name: string
    slug: string
    mainImage: string
    quantity: number
    price: number
    discountPrice?: number | null
    store?: {
      id: number
      name: string
      slug: string
    } | null
  }
  pricing?: {
    lineBaseTotal: number
    finalUnitPriceBeforeCoupon: number
    finalLineTotalBeforeCoupon: number
    lineDiscountAmount: number
    appliedRules?: Array<{
      sourceType: 'vendor' | 'promotion'
      sourceId: number
      title: string
      amount: number
      priority: number
      isExclusive?: boolean
      couponCombinable?: boolean
    }>
  }
}

export type StorefrontCart = {
  id: number
  userId: number
  items: StorefrontCartItem[]
  pricing: {
    subtotalBaseAmount: number
    subtotalAfterLineDiscounts: number
    deliveryFee: number
    lineDiscountAmount: number
    couponDiscountAmount: number
    discountAmount: number
    totalAmount: number
    totalItems: number
  }
  totalItems: number
  totalAmount: number
  createdAt: string
  updatedAt: string
}

export type StorefrontOrderDetail = {
  id: number
  status: string
  paymentStatus: string
  paymentMethod?: string | null
  totalAmount: number | string
  subtotalAmount?: number | string
  deliveryFee?: number | string
  discountAmount?: number | string
  couponCode?: string | null
  couponTitle?: string | null
  customerName?: string | null
  customerPhoneNumber?: string | null
  customerNationalId?: string | null
  shippingAddressTitle?: string | null
  shippingAddressText?: string | null
  shippingCity?: string | null
  deliveryType?: string | null
  deliveryWindowLabel?: string | null
  estimatedDeliveryMinHours?: number | null
  estimatedDeliveryMaxHours?: number | null
  createdAt?: string
  storeName?: string | null
  storeSlug?: string | null
  timeline?: Array<{
    id: number
    fromStatus?: string | null
    toStatus: string
    actorType?: string | null
    reason?: string | null
    note?: string | null
    createdAt: string
  }>
  orderItems: Array<{
    id: number
    quantity: number
    price: number | string
    productName?: string | null
    productSlug?: string | null
    productImage?: string | null
    storeName?: string | null
  }>
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

export async function getCart(token: string) {
  return request<StorefrontCart>('/cart', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })
}

export async function addCartItem(token: string, payload: { productId: number; quantity: number }) {
  const cart = await request<StorefrontCart>('/cart/items', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  emitStorefrontCartUpdated(cart)
  return cart
}

export async function updateCartItem(token: string, itemId: number, payload: { quantity: number }) {
  const cart = await request<StorefrontCart>(`/cart/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  emitStorefrontCartUpdated(cart)
  return cart
}

export async function removeCartItem(token: string, itemId: number) {
  const cart = await request<StorefrontCart>(`/cart/items/${itemId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  emitStorefrontCartUpdated(cart)
  return cart
}

export async function clearCart(token: string) {
  const cart = await request<StorefrontCart>('/cart', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  emitStorefrontCartUpdated(cart)
  return cart
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

export async function completeProfile(token: string, fullName: string, nationalId?: string) {
  return request<StorefrontUser>('/auth/complete-profile', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fullName, nationalId }),
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

export async function getOrderDetail(token: string, orderId: number | string) {
  return request<StorefrontOrderDetail>(`/orders/${orderId}`, {
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

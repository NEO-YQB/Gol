import type { AuthSession } from './session'

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export type OtpSendResponse = {
  message: string
  expiresAt: string
}

export type VerifyOtpResponse = {
  access_token: string
  user: {
    id: number
    phoneNumber: string
    fullName?: string | null
    roles: string[]
  }
}

export type VendorDiscountPayload = {
  productId: number
  title: string
  description?: string
  valueType: 'PERCENTAGE' | 'FIXED'
  value: number
  priority?: number
  isActive?: boolean
  isExclusive?: boolean
  allowCouponStacking?: boolean
  startAt?: string
  endAt?: string
  metadata?: Record<string, unknown>
}

export type VendorProductPayload = {
  name: string
  description?: string
  shortDescription?: string
  price: number
  discountPrice?: number
  quantity: number
  mainImage: string
  images?: string[]
  videoUrl?: string
  categoryId: number
  storeId: number
  productTypeId: number
  metaTitle?: string
  metaDescription?: string
}

export type DeliveryWindowPayload = {
  key: string
  label: string
  startTime: string
  endTime: string
}

export type VendorStorePayload = {
  name: string
  slug: string
  description?: string
  logo?: string
  address?: string
  lat?: number
  lng?: number
  sameDayDelivery?: boolean
  hasExpressDelivery?: boolean
  minDeliveryHours?: number
  maxDeliveryHours?: number
  expressDeliveryHours?: number
  deliveryWindows?: DeliveryWindowPayload[]
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3000/v1'

const API_ORIGIN = new URL(API_BASE_URL).origin

async function readJson(response: Response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  const payload = await readJson(response)

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? Array.isArray(payload.message)
          ? payload.message.join(' / ')
          : String(payload.message)
        : 'درخواست به backend با خطا مواجه شد'

    throw new ApiError(message, response.status)
  }

  return payload as T
}

async function uploadRequest<T>(path: string, formData: FormData, token?: string): Promise<T> {
  const headers = new Headers()

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  const payload = await readJson(response)

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? Array.isArray(payload.message)
          ? payload.message.join(' / ')
          : String(payload.message)
        : 'آپلود فایل با خطا مواجه شد'

    throw new ApiError(message, response.status)
  }

  return payload as T
}

function resolveAssetUrl(path: string) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${API_ORIGIN}${path}`
}

export const apiConfig = {
  baseUrl: API_BASE_URL,
  origin: API_ORIGIN,
}

export const vendorApi = {
  sendOtp(phoneNumber: string) {
    return request<OtpSendResponse>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    })
  },
  verifyOtp(phoneNumber: string, code: string) {
    return request<VerifyOtpResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code }),
    })
  },
  getVendorOrders(session: AuthSession) {
    return request<unknown[]>('/orders/vendor', {}, session.accessToken)
  },
  getProducts(session: AuthSession, query: { storeId: number; search?: string; limit?: number }) {
    const params = new URLSearchParams()
    params.set('storeId', String(query.storeId))
    params.set('limit', String(query.limit ?? 50))
    if (query.search?.trim()) {
      params.set('search', query.search.trim())
    }

    return request<unknown>(`/products?${params.toString()}`, {}, session.accessToken)
  },
  getStoreBySlug(slug: string) {
    return request<unknown>(`/stores/${slug}`)
  },
  createStore(session: AuthSession, payload: VendorStorePayload) {
    return request<unknown>('/stores', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, session.accessToken)
  },
  updateStore(session: AuthSession, storeId: number, payload: Partial<VendorStorePayload>) {
    return request<unknown>(`/stores/${storeId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, session.accessToken)
  },
  getCategories() {
    return request<unknown>('/categories')
  },
  getProductTypes() {
    return request<unknown>('/product-types')
  },
  createProduct(session: AuthSession, payload: VendorProductPayload) {
    return request<unknown>('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, session.accessToken)
  },
  async uploadProductImage(session: AuthSession, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const payload = await uploadRequest<{ url: string }>('/files/upload-product-image', formData, session.accessToken)
    return { ...payload, url: resolveAssetUrl(payload.url) }
  },
  async uploadGalleryImages(session: AuthSession, files: File[]) {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    const payload = await uploadRequest<Array<{ url: string }>>('/files/upload-gallery-images', formData, session.accessToken)
    return payload.map((item) => ({ ...item, url: resolveAssetUrl(item.url) }))
  },
  updateProduct(session: AuthSession, productId: number, payload: Partial<VendorProductPayload>) {
    return request<unknown>(`/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, session.accessToken)
  },
  deleteProduct(session: AuthSession, productId: number) {
    return request<unknown>(`/products/${productId}`, {
      method: 'DELETE',
    }, session.accessToken)
  },
  getVendorDiscounts(
    session: AuthSession,
    query: { isActive?: boolean; productId?: number; limit?: number } = {},
  ) {
    const params = new URLSearchParams()
    params.set('limit', String(query.limit ?? 50))
    if (query.isActive !== undefined) {
      params.set('isActive', String(query.isActive))
    }
    if (query.productId !== undefined) {
      params.set('productId', String(query.productId))
    }

    return request<unknown>(`/vendor-discounts/mine?${params.toString()}`, {}, session.accessToken)
  },
  createVendorDiscount(session: AuthSession, payload: VendorDiscountPayload) {
    return request<unknown>('/vendor-discounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, session.accessToken)
  },
  updateVendorDiscount(session: AuthSession, discountId: number, payload: Partial<VendorDiscountPayload>) {
    return request<unknown>(`/vendor-discounts/${discountId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, session.accessToken)
  },
  deleteVendorDiscount(session: AuthSession, discountId: number) {
    return request<unknown>(`/vendor-discounts/${discountId}`, {
      method: 'DELETE',
    }, session.accessToken)
  },
  getWalletSummary(session: AuthSession) {
    return request<unknown>('/vendor-dashboard/wallet-summary', {}, session.accessToken)
  },
  getSettlementsSummary(session: AuthSession) {
    return request<unknown>('/vendor-dashboard/settlements-summary', {}, session.accessToken)
  },
  getTicketsSummary(session: AuthSession) {
    return request<unknown>('/vendor-dashboard/tickets-summary', {}, session.accessToken)
  },
  getHealthSummary(session: AuthSession) {
    return request<unknown>('/vendor-dashboard/health-summary', {}, session.accessToken)
  },
  getPolicyRestrictions(session: AuthSession) {
    return request<unknown>('/vendor-dashboard/policy-restrictions', {}, session.accessToken)
  },
  getPolicyTimeline(session: AuthSession) {
    return request<unknown>('/vendor-dashboard/policy-timeline', {}, session.accessToken)
  },
  getNotifications(session: AuthSession) {
    return request<unknown>('/notifications/vendor/me', {}, session.accessToken)
  },
}

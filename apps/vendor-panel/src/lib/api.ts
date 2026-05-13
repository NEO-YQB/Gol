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

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3000/v1'

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

export const apiConfig = {
  baseUrl: API_BASE_URL,
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

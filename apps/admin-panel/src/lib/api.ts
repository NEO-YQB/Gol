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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/v1'

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

export const adminApi = {
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
  getAdminOrders(session: AuthSession) {
    return request<unknown[]>('/orders/admin', {}, session.accessToken)
  },
  getOrderExceptions(session: AuthSession) {
    return request<unknown[]>('/admin/operations/orders/exceptions', {}, session.accessToken)
  },
  getSettlementExceptions(session: AuthSession) {
    return request<unknown[]>('/admin/operations/settlements/exceptions', {}, session.accessToken)
  },
  getSupportTickets(session: AuthSession) {
    return request<unknown[]>('/support/admin/tickets', {}, session.accessToken)
  },
  getSupportFollowUps(session: AuthSession) {
    return request<unknown[]>('/admin/operations/support/follow-ups', {}, session.accessToken)
  },
  getAlerts(session: AuthSession) {
    return request<unknown[]>('/admin/operations/alerts', {}, session.accessToken)
  },
  getWallets(session: AuthSession) {
    return request<unknown[]>('/finance/admin/wallets', {}, session.accessToken)
  },
  getFinanceSummary(session: AuthSession) {
    return request<unknown>('/admin-reports/finance/wallets-settlements-summary', {}, session.accessToken)
  },
  getRefundSummary(session: AuthSession) {
    return request<unknown>('/admin-reports/finance/refunds-summary', {}, session.accessToken)
  },
  getVendorRiskSummary(session: AuthSession) {
    return request<unknown>('/admin-reports/vendors/risk-summary', {}, session.accessToken)
  },
  getArticles(session: AuthSession) {
    return request<unknown>('/content/articles', {}, session.accessToken)
  },
  getArticleCategories(session: AuthSession) {
    return request<unknown[]>('/content/article-categories', {}, session.accessToken)
  },
  getArticleTags(session: AuthSession) {
    return request<unknown>('/content/article-tags', {}, session.accessToken)
  },
  getContentAudits(session: AuthSession) {
    return request<unknown[]>('/content/articles/audits/list', {}, session.accessToken)
  },
  getNotifications(session: AuthSession) {
    return request<unknown>('/notifications/admin', {}, session.accessToken)
  },
}

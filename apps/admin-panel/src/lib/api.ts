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
  getOrderDetail(session: AuthSession, orderId: string) {
    return request<unknown>(`/orders/${orderId}`, {}, session.accessToken)
  },
  acceptOrder(
    session: AuthSession,
    orderId: string,
    body: {
      note?: string
    },
  ) {
    return request<unknown>(`/orders/${orderId}/accept`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  shipOrder(
    session: AuthSession,
    orderId: string,
    body: {
      note?: string
    },
  ) {
    return request<unknown>(`/orders/${orderId}/ship`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  deliverOrder(
    session: AuthSession,
    orderId: string,
    body: {
      note?: string
    },
  ) {
    return request<unknown>(`/orders/${orderId}/deliver`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  cancelOrder(
    session: AuthSession,
    orderId: string,
    body: {
      reason?: string
      note?: string
    },
  ) {
    return request<unknown>(`/orders/${orderId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  vendorCancelOrder(
    session: AuthSession,
    orderId: string,
    body: {
      reason: string
      note?: string
    },
  ) {
    return request<unknown>(`/orders/${orderId}/vendor-cancel`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  getOrderExceptions(session: AuthSession) {
    return request<unknown[]>('/admin/operations/orders/exceptions', {}, session.accessToken)
  },
  getPaymentExceptions(session: AuthSession) {
    return request<unknown[]>('/admin/operations/payments/exceptions', {}, session.accessToken)
  },
  getPaymentDetail(session: AuthSession, paymentId: string) {
    return request<unknown>(`/payments/${paymentId}`, {}, session.accessToken)
  },
  initiatePayment(
    session: AuthSession,
    body: {
      orderId: number
      gatewayConfigId?: number
      gatewayKey?: string
    },
  ) {
    return request<unknown>('/payments/initiate', {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  updatePaymentReview(
    session: AuthSession,
    paymentId: string,
    body: {
      reviewStatus: string
      reviewReason?: string
      reviewNote?: string
    },
  ) {
    return request<unknown>(`/payments/admin/${paymentId}/review`, {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  manualRefundPayment(
    session: AuthSession,
    paymentId: string,
    body: {
      reason: string
      note?: string
    },
  ) {
    return request<unknown>(`/payments/admin/${paymentId}/manual-refund`, {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  getSettlementExceptions(session: AuthSession) {
    return request<unknown[]>('/admin/operations/settlements/exceptions', {}, session.accessToken)
  },
  getSupportTickets(session: AuthSession) {
    return request<unknown[]>('/support/admin/tickets', {}, session.accessToken)
  },
  getSupportTicketDetail(session: AuthSession, ticketId: string) {
    return request<unknown>(`/support/tickets/${ticketId}`, {}, session.accessToken)
  },
  addSupportTicketNote(
    session: AuthSession,
    ticketId: string,
    body: {
      message: string
      isInternal?: boolean
    },
  ) {
    return request<unknown>(`/support/tickets/${ticketId}/notes`, {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  updateSupportTicketStatus(
    session: AuthSession,
    ticketId: string,
    body: {
      status: string
      note?: string
      internalNote?: string
    },
  ) {
    return request<unknown>(`/support/admin/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  applySupportFinanceDecision(
    session: AuthSession,
    ticketId: string,
    body: {
      outcome: string
      amount?: number
      extendHoldDays?: number
      note?: string
      refundReason?: string
      refundNote?: string
    },
  ) {
    return request<unknown>(`/support/admin/tickets/${ticketId}/finance-decision`, {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  getSupportFollowUps(session: AuthSession) {
    return request<unknown[]>('/admin/operations/support/follow-ups', {}, session.accessToken)
  },
  getVendorPolicyTimeline(session: AuthSession, storeId: string) {
    return request<unknown>(`/admin/operations/vendors/${storeId}/policy-timeline`, {}, session.accessToken)
  },
  getVendorHealthDetail(session: AuthSession, storeId: string) {
    return request<unknown>(`/stores/admin/${storeId}/vendor-health`, {}, session.accessToken)
  },
  recalculateVendorHealth(session: AuthSession, storeId: string) {
    return request<unknown>(`/stores/admin/${storeId}/vendor-health/recalculate`, {
      method: 'POST',
    }, session.accessToken)
  },
  updateVendorRiskPolicy(
    session: AuthSession,
    storeId: string,
    body: {
      autoSettlementHoldEnabled?: boolean
      settlementHoldDaysOverride?: number
      manualReviewRequired?: boolean
      blockNewDiscounts?: boolean
      note?: string
      metadata?: Record<string, unknown>
    },
  ) {
    return request<unknown>(`/stores/admin/${storeId}/risk-policy`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  getAlerts(session: AuthSession) {
    return request<unknown[]>('/admin/operations/alerts', {}, session.accessToken)
  },
  getWallets(session: AuthSession) {
    return request<unknown[]>('/finance/admin/wallets', {}, session.accessToken)
  },
  getWalletByStore(session: AuthSession, storeId: string) {
    return request<unknown>(`/finance/admin/wallets/store/${storeId}`, {}, session.accessToken)
  },
  adjustWallet(
    session: AuthSession,
    storeId: string,
    body: {
      direction: string
      type?: string
      amount: number
      title: string
      description?: string
      batchKey?: string
      metadata?: Record<string, unknown>
    },
  ) {
    return request<unknown>(`/finance/admin/wallets/store/${storeId}/adjustments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  releaseOrderSettlement(session: AuthSession, orderId: string) {
    return request<unknown>(`/finance/admin/orders/${orderId}/release-settlement`, {
      method: 'POST',
    }, session.accessToken)
  },
  releaseDueSettlements(session: AuthSession) {
    return request<unknown>('/finance/admin/settlements/release-due', {
      method: 'POST',
    }, session.accessToken)
  },
  getFinanceSummary(session: AuthSession) {
    return request<unknown>('/admin-reports/finance/wallets-settlements-summary', {}, session.accessToken)
  },
  getRefundSummary(session: AuthSession) {
    return request<unknown>('/admin-reports/finance/refunds-summary', {}, session.accessToken)
  },
  getVendorRiskSummary(
    session: AuthSession,
    query?: {
      page?: number
      limit?: number
      status?: string
    },
  ) {
    const params = new URLSearchParams()

    if (query?.page) params.set('page', String(query.page))
    if (query?.limit) params.set('limit', String(query.limit))
    if (query?.status) params.set('status', query.status)

    const search = params.toString()
    return request<unknown>(
      `/admin-reports/vendors/risk-summary${search ? `?${search}` : ''}`,
      {},
      session.accessToken,
    )
  },
  getArticles(
    session: AuthSession,
    query?: {
      status?: string
      authorId?: number
      categoryId?: number
      tagId?: number
      page?: number
      limit?: number
    },
  ) {
    const params = new URLSearchParams()

    if (query?.status) params.set('status', query.status)
    if (query?.authorId) params.set('authorId', String(query.authorId))
    if (query?.categoryId) params.set('categoryId', String(query.categoryId))
    if (query?.tagId) params.set('tagId', String(query.tagId))
    if (query?.page) params.set('page', String(query.page))
    if (query?.limit) params.set('limit', String(query.limit))

    const search = params.toString()
    return request<unknown>(`/content/articles${search ? `?${search}` : ''}`, {}, session.accessToken)
  },
  getArticleDetail(session: AuthSession, articleId: string) {
    return request<unknown>(`/content/articles/${articleId}`, {}, session.accessToken)
  },
  createArticle(session: AuthSession, body: Record<string, unknown>) {
    return request<unknown>('/content/articles', {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  updateArticle(session: AuthSession, articleId: string, body: Record<string, unknown>) {
    return request<unknown>(`/content/articles/${articleId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  getArticleCategories(session: AuthSession) {
    return request<unknown[]>('/content/article-categories', {}, session.accessToken)
  },
  getArticleCategoryDetail(session: AuthSession, categoryId: string) {
    return request<unknown>(`/content/article-categories/${categoryId}`, {}, session.accessToken)
  },
  createArticleCategory(session: AuthSession, body: Record<string, unknown>) {
    return request<unknown>('/content/article-categories', {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  updateArticleCategory(session: AuthSession, categoryId: string, body: Record<string, unknown>) {
    return request<unknown>(`/content/article-categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  getArticleTags(session: AuthSession) {
    return request<unknown>('/content/article-tags', {}, session.accessToken)
  },
  createArticleTag(session: AuthSession, body: Record<string, unknown>) {
    return request<unknown>('/content/article-tags', {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  updateArticleTag(session: AuthSession, tagId: string, body: Record<string, unknown>) {
    return request<unknown>(`/content/article-tags/${tagId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  getAuthors(session: AuthSession) {
    return request<unknown[]>('/content/authors', {}, session.accessToken)
  },
  getAuthorDetail(session: AuthSession, authorId: string) {
    return request<unknown>(`/content/authors/${authorId}`, {}, session.accessToken)
  },
  createAuthor(session: AuthSession, body: Record<string, unknown>) {
    return request<unknown>('/content/authors', {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  updateAuthor(session: AuthSession, authorId: string, body: Record<string, unknown>) {
    return request<unknown>(`/content/authors/${authorId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  getContentAudits(session: AuthSession) {
    return request<unknown[]>('/content/articles/audits/list', {}, session.accessToken)
  },
  getNotifications(session: AuthSession) {
    return request<unknown>('/notifications/admin', {}, session.accessToken)
  },
}

import type { AuthSession } from './session'
import { getApiErrorMessage } from './apiMessages'

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

export type SessionBootstrapResponse = {
  effectivePermissions: Array<{
    action: string
    subject: string
  }>
  vendorOnboarding?: {
    applicationStatus: string
    productStatus: string
    storeActivatedAt?: string | null
  } | null
}

export type SmsSettingsResponse = {
  apiKey?: string
  templateId?: string
  lineNumber?: string
  hasApiKey?: boolean
}

export type StorefrontInfoPagesSettingsResponse = {
  about: {
    enabled: boolean
    heroTitle: string
    heroSubtitle: string
    desktopHeroImageUrl: string
    mobileHeroImageUrl: string
    introTitle: string
    introHtml: string
    storyTitle: string
    storyHtml: string
    valuesTitle: string
    valuesHtml: string
  }
  contact: {
    enabled: boolean
    heroTitle: string
    heroSubtitle: string
    desktopHeroImageUrl: string
    mobileHeroImageUrl: string
    phone: string
    email: string
    address: string
    workingHours: string
    mapEmbedHtml: string
    contactIntroHtml: string
  }
  terms: {
    enabled: boolean
    heroTitle: string
    heroSubtitle: string
    desktopHeroImageUrl: string
    mobileHeroImageUrl: string
    bodyHtml: string
    updatedAtLabel: string
  }
}

export type SeoSettingsResponse = {
  siteUrl: string
  siteName: string
  googleSearchConsoleVerification: string
  googleTagManagerId: string
  googleAnalyticsId: string
  robotsTxt: string
  sitemapEnabled: boolean
  sitemapChangeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  sitemapPriority: string
}

export type PaymentGatewayConfigResponse = {
  id: number
  key: string
  displayName: string
  driver: string
  isActive: boolean
  isDefault: boolean
  sandboxMode: boolean
  priority: number
  merchantConfig?: Record<string, unknown> | null
  callbackUrl?: string | null
  returnUrl?: string | null
  notes?: string | null
}

export type StorefrontPagePayload = {
  id: string
  title: string
  slug: string
  pageType: 'HOME' | 'LANDING' | 'CAMPAIGN' | 'STATIC'
  isActive: boolean
  cacheEnabled?: boolean
  headerConfig?: Record<string, unknown> | null
  metaTitle?: string | null
  metaDescription?: string | null
  keywords?: string[]
  ogImage?: string | null
  canonicalUrl?: string | null
  noIndex?: boolean
  blocks?: Array<Record<string, unknown>>
  updatedAt?: string
  publishedAt?: string | null
}

export type UploadedImagePayload = {
  url: string
  width?: number | null
  height?: number | null
  contentType?: string
  variants?: {
    original?: { url: string; width?: number; height?: number; key?: string } | null
    large?: { url: string; width?: number; height?: number; key?: string } | null
    medium?: { url: string; width?: number; height?: number; key?: string } | null
    thumbnail?: { url: string; width?: number; height?: number; key?: string } | null
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3000/v1'

const API_ORIGIN = new URL(API_BASE_URL).origin
const MAP_REVERSE_GEOCODE_URL =
  import.meta.env.VITE_MAP_REVERSE_GEOCODE_URL || 'https://map.ir/reverse'
const MAP_REVERSE_GEOCODE_KEY = import.meta.env.VITE_MAP_REVERSE_GEOCODE_KEY || import.meta.env.VITE_MAP_IR_API_KEY || ''

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
    const message = getApiErrorMessage(payload, response.status)

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
    const message = getApiErrorMessage(payload, response.status)

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

  getSessionBootstrap(session: AuthSession) {
    return request<SessionBootstrapResponse>('/auth/session-bootstrap', {}, session.accessToken)
  },
  getSmsSettings(session: AuthSession) {
    return request<SmsSettingsResponse>('/admin/settings/sms', {}, session.accessToken)
  },
  updateSmsSettings(session: AuthSession, body: { apiKey?: string; templateId?: string; lineNumber?: string }) {
    return request<SmsSettingsResponse>('/admin/settings/sms', {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  testSmsSettings(session: AuthSession, phoneNumber: string) {
    return request<{ message: string; expiresAt: string }>('/admin/settings/sms/test', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    }, session.accessToken)
  },
  getSeoSettings(session: AuthSession) {
    return request<SeoSettingsResponse>('/admin/settings/seo', {}, session.accessToken)
  },
  updateSeoSettings(session: AuthSession, body: Partial<SeoSettingsResponse>) {
    return request<SeoSettingsResponse>('/admin/settings/seo', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  getPaymentGateways(session: AuthSession) {
    return request<PaymentGatewayConfigResponse[]>('/payments/gateways/admin', {}, session.accessToken)
  },
  createPaymentGateway(session: AuthSession, body: {
    key: string
    displayName: string
    driver: string
    sandboxMode?: boolean
    isActive?: boolean
    isDefault?: boolean
    priority?: number
    merchantConfig?: Record<string, unknown>
    callbackUrl?: string
    returnUrl?: string
    notes?: string
  }) {
    return request<PaymentGatewayConfigResponse>('/payments/gateways/admin', {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  updatePaymentGateway(session: AuthSession, id: number, body: {
    key?: string
    displayName?: string
    driver?: string
    sandboxMode?: boolean
    isActive?: boolean
    isDefault?: boolean
    priority?: number
    merchantConfig?: Record<string, unknown>
    callbackUrl?: string
    returnUrl?: string
    notes?: string
  }) {
    return request<PaymentGatewayConfigResponse>(`/payments/gateways/admin/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },

  createAccessControlUser(session: AuthSession, body: {
    phoneNumber: string
    fullName?: string
    email?: string
    isActive?: boolean
    roleIds?: number[]
  }) {
    return request<unknown>('/admin/access-control/users', {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  getAccessControlUsers(
    session: AuthSession,
    query?: {
      page?: number
      limit?: number
      search?: string
      status?: string
      role?: string
      hasRoles?: boolean
    },
  ) {
    const params = new URLSearchParams()

    if (query?.page) params.set('page', String(query.page))
    if (query?.limit) params.set('limit', String(query.limit))
    if (query?.search) params.set('search', query.search)
    if (query?.status) params.set('status', query.status)
    if (query?.role) params.set('role', query.role)
    if (typeof query?.hasRoles === 'boolean') params.set('hasRoles', String(query.hasRoles))

    const search = params.toString()
    return request<unknown>(`/admin/access-control/users${search ? `?${search}` : ''}`, {}, session.accessToken)
  },
  getAccessControlUserDetail(session: AuthSession, userId: string) {
    return request<unknown>(`/admin/access-control/users/${userId}`, {}, session.accessToken)
  },
  updateAccessControlUserStatus(session: AuthSession, userId: string, body: { isActive: boolean }) {
    return request<unknown>(`/admin/access-control/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  updateAccessControlUserRoles(session: AuthSession, userId: string, body: { roleIds: number[] }) {
    return request<unknown>(`/admin/access-control/users/${userId}/roles`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  getAccessControlRoles(session: AuthSession) {
    return request<unknown[]>('/admin/access-control/roles', {}, session.accessToken)
  },
  getAccessControlRoleDetail(session: AuthSession, roleId: string) {
    return request<unknown>(`/admin/access-control/roles/${roleId}`, {}, session.accessToken)
  },
  createAccessControlRole(session: AuthSession, body: Record<string, unknown>) {
    return request<unknown>('/admin/access-control/roles', {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  updateAccessControlRole(session: AuthSession, roleId: string, body: Record<string, unknown>) {
    return request<unknown>(`/admin/access-control/roles/${roleId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  updateAccessControlRolePermissions(session: AuthSession, roleId: string, body: { permissionIds: number[] }) {
    return request<unknown>(`/admin/access-control/roles/${roleId}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  getAccessControlPermissions(
    session: AuthSession,
    query?: {
      page?: number
      limit?: number
      action?: string
      subject?: string
      search?: string
    },
  ) {
    const params = new URLSearchParams()

    if (query?.page) params.set('page', String(query.page))
    if (query?.limit) params.set('limit', String(query.limit))
    if (query?.action) params.set('action', query.action)
    if (query?.subject) params.set('subject', query.subject)
    if (query?.search) params.set('search', query.search)

    const search = params.toString()
    return request<unknown>(`/admin/access-control/permissions${search ? `?${search}` : ''}`, {}, session.accessToken)
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
  updateStore(session: AuthSession, storeId: string, body: { isVerified?: boolean; address?: string; lat?: number; lng?: number }) {
    return request<unknown>(`/stores/${storeId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  getMapReverseUrl(lat: number, lng: number) {
    const url = new URL(MAP_REVERSE_GEOCODE_URL)
    url.searchParams.set('lat', String(lat))
    url.searchParams.set('lon', String(lng))
    return url.toString()
  },
  getMapReverseHeaders() {
    if (!MAP_REVERSE_GEOCODE_KEY) {
      return {} as Record<string, string>
    }

    return {
      'x-api-key': MAP_REVERSE_GEOCODE_KEY,
    } satisfies Record<string, string>
  },
  getVendorOnboardingRequests(
    session: AuthSession,
    query?: {
      status?: string
      page?: number
      limit?: number
    },
  ) {
    const params = new URLSearchParams()
    if (query?.status) params.set('status', query.status)
    if (query?.page) params.set('page', String(query.page))
    if (query?.limit) params.set('limit', String(query.limit))
    const search = params.toString()
    return request<unknown>(`/vendor-onboarding/admin/requests${search ? `?${search}` : ''}`, {}, session.accessToken)
  },
  getVendorOnboardingRequestDetail(session: AuthSession, requestId: string) {
    return request<unknown>(`/vendor-onboarding/admin/requests/${requestId}`, {}, session.accessToken)
  },
  reviewVendorOnboardingApplication(
    session: AuthSession,
    requestId: string,
    body: { approved: boolean; reviewNote?: string },
  ) {
    return request<unknown>(`/vendor-onboarding/admin/requests/${requestId}/application`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  reviewVendorOnboardingProduct(
    session: AuthSession,
    requestId: string,
    body: { approved: boolean; reviewNote?: string },
  ) {
    return request<unknown>(`/vendor-onboarding/admin/requests/${requestId}/product`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
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
  getProducts(
    session: AuthSession,
    query?: {
      page?: number
      limit?: number
      search?: string
      categoryId?: number
      categoryIds?: number[]
      storeId?: number
      productTypeId?: number
      publicationStatus?: string
      isPurchasable?: boolean
      isArchived?: boolean
      ids?: number[]
      minPrice?: number
      maxPrice?: number
    },
  ) {
    const params = new URLSearchParams()

    if (query?.page) params.set('page', String(query.page))
    if (query?.limit) params.set('limit', String(query.limit))
    if (query?.search) params.set('search', query.search)
    if (query?.categoryId) params.set('categoryId', String(query.categoryId))
    if (query?.categoryIds?.length) params.set('categoryIds', query.categoryIds.join(','))
    if (query?.storeId) params.set('storeId', String(query.storeId))
    if (query?.productTypeId) params.set('productTypeId', String(query.productTypeId))
    if (query?.publicationStatus) params.set('publicationStatus', query.publicationStatus)
    if (typeof query?.isPurchasable === 'boolean') params.set('isPurchasable', String(query.isPurchasable))
    if (typeof query?.isArchived === 'boolean') params.set('isArchived', String(query.isArchived))
    if (query?.ids?.length) params.set('ids', query.ids.join(','))
    if (typeof query?.minPrice === 'number') params.set('minPrice', String(query.minPrice))
    if (typeof query?.maxPrice === 'number') params.set('maxPrice', String(query.maxPrice))

    const search = params.toString()
    return request<unknown>(`/products${search ? `?${search}` : ''}`, {}, session.accessToken)
  },
  getProductDetail(session: AuthSession, slug: string) {
    return request<unknown>(`/products/${slug}`, {}, session.accessToken)
  },
  createProduct(session: AuthSession, body: Record<string, unknown>) {
    return request<unknown>('/products', {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  updateProduct(session: AuthSession, productId: string, body: Record<string, unknown>) {
    return request<unknown>(`/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  reviewProduct(session: AuthSession, productId: string, body: { approved?: boolean; requestChanges?: boolean; reviewNote?: string }) {
    return request<unknown>(`/products/${productId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  publishProduct(session: AuthSession, productId: string, body: { publish?: boolean; note?: string }) {
    return request<unknown>(`/products/${productId}/publish`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  toggleProductPurchasable(session: AuthSession, productId: string, body: { isPurchasable: boolean; isArchived?: boolean; note?: string }) {
    return request<unknown>(`/products/${productId}/purchasable`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  async uploadProductImage(session: AuthSession, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const payload = await uploadRequest<UploadedImagePayload>('/files/upload-product-image', formData, session.accessToken)
    return {
      ...payload,
      url: resolveAssetUrl(payload.url),
      variants: payload.variants
        ? {
            original: payload.variants.original ? { ...payload.variants.original, url: resolveAssetUrl(payload.variants.original.url) } : null,
            large: payload.variants.large ? { ...payload.variants.large, url: resolveAssetUrl(payload.variants.large.url) } : null,
            medium: payload.variants.medium ? { ...payload.variants.medium, url: resolveAssetUrl(payload.variants.medium.url) } : null,
            thumbnail: payload.variants.thumbnail ? { ...payload.variants.thumbnail, url: resolveAssetUrl(payload.variants.thumbnail.url) } : null,
          }
        : undefined,
    }
  },
  async uploadSiteImage(session: AuthSession, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const payload = await uploadRequest<UploadedImagePayload>('/files/upload-site-image', formData, session.accessToken)
    return {
      ...payload,
      url: resolveAssetUrl(payload.url),
      variants: payload.variants
        ? {
            original: payload.variants.original ? { ...payload.variants.original, url: resolveAssetUrl(payload.variants.original.url) } : null,
            large: payload.variants.large ? { ...payload.variants.large, url: resolveAssetUrl(payload.variants.large.url) } : null,
            medium: payload.variants.medium ? { ...payload.variants.medium, url: resolveAssetUrl(payload.variants.medium.url) } : null,
            thumbnail: payload.variants.thumbnail ? { ...payload.variants.thumbnail, url: resolveAssetUrl(payload.variants.thumbnail.url) } : null,
          }
        : undefined,
    }
  },
  async uploadGalleryImages(session: AuthSession, files: File[]) {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    const payload = await uploadRequest<Array<{ url: string }>>('/files/upload-gallery-images', formData, session.accessToken)
    return payload.map((item) => ({ ...item, url: resolveAssetUrl(item.url) }))
  },
  getProductTypes(session: AuthSession) {
    return request<unknown[]>('/product-types', {}, session.accessToken)
  },
  getProductTypeDetail(session: AuthSession, productTypeId: string) {
    return request<unknown>(`/product-types/${productTypeId}`, {}, session.accessToken)
  },
  createProductType(session: AuthSession, body: Record<string, unknown>) {
    return request<unknown>('/product-types', {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  updateProductType(session: AuthSession, productTypeId: string, body: Record<string, unknown>) {
    return request<unknown>(`/product-types/${productTypeId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  deleteProductType(session: AuthSession, productTypeId: string) {
    return request<unknown>(`/product-types/${productTypeId}`, {
      method: 'DELETE',
    }, session.accessToken)
  },
  getCategories(session: AuthSession) {
    return request<unknown[]>('/categories', {}, session.accessToken)
  },
  getCategoryDetail(session: AuthSession, categoryId: string) {
    return request<unknown>(`/categories/${categoryId}`, {}, session.accessToken)
  },
  createCategory(session: AuthSession, body: Record<string, unknown>) {
    return request<unknown>('/categories', {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  updateCategory(session: AuthSession, categoryId: string, body: Record<string, unknown>) {
    return request<unknown>(`/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  deleteCategory(session: AuthSession, categoryId: string) {
    return request<unknown>(`/categories/${categoryId}`, {
      method: 'DELETE',
    }, session.accessToken)
  },
  getStores(session: AuthSession) {
    return request<unknown[]>('/stores', {}, session.accessToken)
  },
  getProductElements(session: AuthSession) {
    return request<unknown[]>('/products/elements', {}, session.accessToken)
  },
  createProductElement(
    session: AuthSession,
    body: {
      name: string
      type: 'FLOWER' | 'FILLER' | 'BASE' | 'ACCESSORY'
      unit?: string
      image?: string
    },
  ) {
    return request<unknown>('/products/elements', {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  removeProductElement(session: AuthSession, elementId: string) {
    return request<unknown>(`/products/elements/${elementId}`, {
      method: 'DELETE',
    }, session.accessToken)
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
  getStorefrontPages(session: AuthSession) {
    return request<StorefrontPagePayload[]>('/admin/pages', {}, session.accessToken)
  },
  getStorefrontPageDetail(session: AuthSession, pageId: string) {
    return request<StorefrontPagePayload>(`/admin/pages/${pageId}`, {}, session.accessToken)
  },
  createStorefrontPage(session: AuthSession, body: Record<string, unknown>) {
    return request<StorefrontPagePayload>('/admin/pages', {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  updateStorefrontPage(session: AuthSession, pageId: string, body: Record<string, unknown>) {
    return request<StorefrontPagePayload>(`/admin/pages/${pageId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  deleteStorefrontPage(session: AuthSession, pageId: string) {
    return request<void>(`/admin/pages/${pageId}`, {
      method: 'DELETE',
    }, session.accessToken)
  },
  getStorefrontInfoPagesSettings(session: AuthSession) {
    return request<StorefrontInfoPagesSettingsResponse>('/admin/settings/storefront-info-pages', {}, session.accessToken)
  },
  updateStorefrontInfoPagesSettings(session: AuthSession, body: StorefrontInfoPagesSettingsResponse) {
    return request<StorefrontInfoPagesSettingsResponse>('/admin/settings/storefront-info-pages', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  getNotifications(session: AuthSession) {
    return request<unknown>('/notifications/admin', {}, session.accessToken)
  },
  dispatchNotification(session: AuthSession, notificationId: string, body: Record<string, unknown>) {
    return request<unknown>(`/notifications/admin/${notificationId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
  createPushNotification(session: AuthSession, body: Record<string, unknown>) {
    return request<unknown>('/notifications/admin/push', {
      method: 'POST',
      body: JSON.stringify(body),
    }, session.accessToken)
  },
}

import { AppShell, Pill, type NavSection } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { useNoticeEffect } from './components/NoticeCenter'
import { adminApi, ApiError } from './lib/api'
import { readText } from './lib/normalize'
import {
  canAccessRoute,
  describeScope,
  getFirstAccessibleRoute,
  hasPermission,
  hasRole,
  type SessionBootstrap,
} from './lib/permissions'
import { adminRouteLabels, adminRouteOrder, type AdminRoute } from './lib/routes'
import { clearSession, loadSession, saveSession, type AuthSession } from './lib/session'
import { AccessControlPage } from './pages/AccessControlPage'
import { AccessControlWorkspacePage } from './pages/AccessControlWorkspacePage'
import { AlertsPage } from './pages/AlertsPage'
import { ContentPage } from './pages/ContentPage'
import { ContentWorkspacePage } from './pages/ContentWorkspacePage'
import { CategoryWorkspacePage } from './pages/CategoryWorkspacePage'
import { ProductTypeWorkspacePage } from './pages/ProductTypeWorkspacePage'
import { DashboardPage } from './pages/DashboardPage'
import { FinanceWorkspacePage } from './pages/FinanceWorkspacePage'
import { LoginPage } from './pages/LoginPage'
import { OrdersPage } from './pages/OrdersPage'
import { OrdersWorkspacePage } from './pages/OrdersWorkspacePage'
import { PageBuilderPage } from './pages/PageBuilderPage'
import { PageBuilderWorkspacePage } from './pages/PageBuilderWorkspacePage'
import { PaymentGatewayWorkspacePage } from './pages/PaymentGatewayWorkspacePage'
import { SeoSettingsWorkspacePage } from './pages/SeoSettingsWorkspacePage'
import { PushNotificationWorkspacePage } from './pages/PushNotificationWorkspacePage'
import { SeoLandingsPage } from './pages/SeoLandingsPage'
import { SeoLandingWorkspacePage } from './pages/SeoLandingWorkspacePage'
import { SettingsPage } from './pages/SettingsPage'
import { SmsSettingsWorkspacePage } from './pages/SmsSettingsWorkspacePage'
import { StorefrontInfoPagesWorkspacePage } from './pages/StorefrontInfoPagesWorkspacePage'
import { ProductsPage } from './pages/ProductsPage'
import { ProductWorkspacePage } from './pages/ProductWorkspacePage'
import { SettlementsPage } from './pages/SettlementsPage'
import { SupportPage } from './pages/SupportPage'
import { SupportWorkspacePage } from './pages/SupportWorkspacePage'
import { VendorOnboardingPage } from './pages/VendorOnboardingPage'
import { VendorOnboardingWorkspacePage } from './pages/VendorOnboardingWorkspacePage'
import { VendorsPage } from './pages/VendorsPage'
import { VendorWorkspacePage } from './pages/VendorWorkspacePage'

const defaultRoute: AdminRoute = 'dashboard'

function buildNav(currentRoute: AdminRoute, session: AuthSession): NavSection[] {
  const isAccessOnly = hasRole(session, 'ACCESS_MANAGER') && !hasPermission(session, 'manage', 'all')
  const isSeoOnly = (hasRole(session, 'SEO_MANAGER') || hasRole(session, 'CONTENT_EDITOR') || hasRole(session, 'CONTENT_WRITER')) && !hasPermission(session, 'manage', 'all')
  const isFinanceOnly = hasRole(session, 'FINANCE_OPERATOR') && !hasPermission(session, 'manage', 'all')
  const isSupportOnly = hasRole(session, 'SUPPORT_AGENT') && !hasPermission(session, 'manage', 'all')
  const sections: Array<NavSection & { requirements: AdminRoute[] }> = [
    {
      title: isFinanceOnly ? 'عملیات مالی' : isSupportOnly ? 'رسیدگی پشتیبانی' : isSeoOnly ? 'تحریریه و سئو' : isAccessOnly ? 'کنترل کاربران و دسترسی' : 'عملیات اصلی',
      requirements: ['dashboard', 'orders', 'settlements', 'support', 'vendors', 'vendorOnboarding', 'products'],
      items: [
        { key: 'dashboard', label: 'داشبورد', hint: 'نمای نقش محور از وضعیت کلی', active: currentRoute === 'dashboard' },
        { key: 'orders', label: 'سفارش ها', hint: 'کارتابل عملیات سفارش و صف استثناها', active: currentRoute === 'orders' || currentRoute === 'ordersWorkspace' },
        { key: 'settlements', label: 'تسویه و مالی', hint: 'کارتابل triage مالی، کیف پول و صف استثناها', active: currentRoute === 'settlements' || currentRoute === 'financeWorkspace' },
        { key: 'support', label: 'پشتیبانی', hint: 'تیکت ها، noteها و رسیدگی بعدی', active: currentRoute === 'support' || currentRoute === 'supportWorkspace' },
        { key: 'vendors', label: 'فروشنده ها و ریسک', hint: 'visibility ریسک، policy و سلامت فروشنده', active: currentRoute === 'vendors' || currentRoute === 'vendorWorkspace' },
        { key: 'vendorOnboarding', label: 'درخواست فروشندگی', hint: 'بررسی متقاضی', active: currentRoute === 'vendorOnboarding' || currentRoute === 'vendorOnboardingWorkspace' },
        { key: 'products', label: 'محصولات', hint: 'کارتابل catalog، کیفیت محتوا و سئوی محصول', active: currentRoute === 'products' || currentRoute === 'productWorkspace' },
      ],
    },
    {
      title: isAccessOnly ? 'پیکربندی دسترسی' : isSeoOnly ? 'کیفیت محتوا' : 'رشد و کنترل',
      requirements: ['content', 'seoLandings', 'pageBuilder', 'alerts', 'accessControl'],
      items: [
        { key: 'content', label: 'محتوا و سئو', hint: 'تحریریه، taxonomy و auditهای محتوا', active: currentRoute === 'content' || currentRoute === 'contentWorkspace' },
        { key: 'seoLandings', label: 'لندینگ‌های ترکیبی (SEO)', hint: 'لندینگ‌های سئو شده از ترکیب دسته و فیلتر', active: currentRoute === 'seoLandings' || currentRoute === 'seoLandingWorkspace' },
        { key: 'pageBuilder', label: 'صفحه‌ساز استور', hint: 'landing pageها، homepage و چیدمان بلاک‌های storefront', active: currentRoute === 'pageBuilder' || currentRoute === 'pageBuilderWorkspace' },
        { key: 'alerts', label: 'هشدارها و اعلان ها', hint: 'outbox و رخدادهای مهم عملیاتی', active: currentRoute === 'alerts' },
        { key: 'accessControl', label: 'کاربران و دسترسی', hint: 'مدیریت user، role و permission', active: currentRoute === 'accessControl' || currentRoute === 'accessControlWorkspace', badge: hasPermission(session, 'assignPermissions', 'AdminRole') ? 'قابل ویرایش' : 'فقط مشاهده' },
        { key: 'settings', label: 'تنظیمات', hint: 'تنظیمات سراسری سرویس‌ها و یکپارچه‌سازی‌ها', active: currentRoute === 'settings' || currentRoute === 'smsSettingsWorkspace' || currentRoute === 'storefrontInfoPagesWorkspace' || currentRoute === 'seoSettingsWorkspace' || currentRoute === 'paymentGatewayWorkspace' || currentRoute === 'pushNotificationWorkspace' },
      ],
    },
  ]

  return sections
    .map((section) => ({
      title: section.title,
      items: section.items.filter((item) => canAccessRoute(session, item.key as AdminRoute)),
    }))
    .filter((section) => section.items.length > 0)
}

function getPageMeta(route: AdminRoute) {
  switch (route) {
    case 'orders':
      return {
        eyebrow: 'کارتابل سفارش ها',
        title: 'سفارش‌ها',
        description: '',
      }
    case 'settlements':
      return {
        eyebrow: 'کارتابل مالی',
        title: 'مالی و تسویه',
        description: '',
      }
    case 'financeWorkspace':
      return {
        eyebrow: 'میزکار مالی',
        title: 'میزکار مالی',
        description: '',
      }
    case 'ordersWorkspace':
      return {
        eyebrow: 'میزکار سفارش',
        title: 'میزکار سفارش',
        description: '',
      }
    case 'support':
      return {
        eyebrow: 'کارتابل پشتیبانی',
        title: 'پشتیبانی',
        description: '',
      }
    case 'supportWorkspace':
      return {
        eyebrow: 'میزکار پشتیبانی',
        title: 'میزکار پشتیبانی',
        description: '',
      }
    case 'vendors':
      return {
        eyebrow: 'کارتابل فروشنده ها',
        title: 'فروشنده‌ها',
        description: '',
      }
    case 'vendorWorkspace':
      return {
        eyebrow: 'میزکار فروشنده',
        title: 'میزکار فروشنده',
        description: '',
      }
    case 'vendorOnboarding':
      return {
        eyebrow: 'درخواست‌های فروشندگی',
        title: 'درخواست‌های فروشندگی',
        description: '',
      }
    case 'vendorOnboardingWorkspace':
      return {
        eyebrow: 'میزکار درخواست فروشنده',
        title: 'بررسی فروشنده',
        description: '',
      }
    case 'products':
      return {
        eyebrow: 'کارتابل محصولات',
        title: 'محصولات',
        description: '',
      }
    case 'productWorkspace':
      return {
        eyebrow: 'میزکار محصول',
        title: 'میزکار محصول',
        description: '',
      }
    case 'categoryWorkspace':
      return {
        eyebrow: 'دسته‌بندی',
        title: 'دسته‌بندی‌ها',
        description: '',
      }
    case 'productTypeWorkspace':
      return {
        eyebrow: 'نوع محصول',
        title: 'نوع محصول',
        description: '',
      }
    case 'content':
      return {
        eyebrow: 'کارتابل محتوا',
        title: 'محتوا و سئو',
        description: '',
      }
    case 'seoLandings':
      return {
        eyebrow: 'لندینگ‌های سئو',
        title: 'لندینگ‌های ترکیبی',
        description: '',
      }
    case 'seoLandingWorkspace':
      return {
        eyebrow: 'میزکار لندینگ سئو',
        title: 'ویرایش لندینگ سئو',
        description: '',
      }
    case 'pageBuilder':
      return {
        eyebrow: 'صفحه‌ساز',
        title: 'صفحه‌ساز',
        description: '',
      }
    case 'pageBuilderWorkspace':
      return {
        eyebrow: 'صفحه‌ساز',
        title: 'ویرایش صفحه',
        description: '',
      }
    case 'settings':
      return {
        eyebrow: 'تنظیمات',
        title: 'تنظیمات',
        description: '',
      }
    case 'seoSettingsWorkspace':
      return {
        eyebrow: 'سئو',
        title: 'تنظیمات سئو',
        description: '',
      }
    case 'smsSettingsWorkspace':
      return {
        eyebrow: 'پیامک',
        title: 'پیامک',
        description: '',
      }
    case 'storefrontInfoPagesWorkspace':
      return {
        eyebrow: 'صفحات سایت',
        title: 'صفحات سایت',
        description: '',
      }
    case 'paymentGatewayWorkspace':
      return {
        eyebrow: 'پرداخت',
        title: 'درگاه پرداخت',
        description: '',
      }
    case 'contentWorkspace':
      return {
        eyebrow: 'ویرایشگر محتوایی',
        title: 'ویرایش محتوا',
        description: '',
      }
    case 'alerts':
      return {
        eyebrow: 'کارتابل هشدارها',
        title: 'هشدارها',
        description: '',
      }
    case 'pushNotificationWorkspace':
      return {
        eyebrow: 'پوش',
        title: 'ارسال پوش نوتیفیکیشن',
        description: '',
      }
    case 'accessControl':
      return {
        eyebrow: 'کنترل دسترسی',
        title: 'کاربران و دسترسی',
        description: '',
      }
    case 'accessControlWorkspace':
      return {
        eyebrow: 'میزکار دسترسی',
        title: 'مدیریت دسترسی',
        description: '',
      }
    case 'dashboard':
    default:
      return {
        eyebrow: 'داشبورد',
        title: 'داشبورد ادمین',
        description: '',
      }
  }
}

function renderRoute(
  route: AdminRoute,
  session: AuthSession,
  options: {
    ordersWorkspaceOrder: Record<string, unknown> | null
    onOpenOrdersWorkspace: (order: Record<string, unknown>) => void
    onBackToOrders: () => void
    supportWorkspaceTicket: Record<string, unknown> | null
    onOpenSupportWorkspace: (ticket: Record<string, unknown>) => void
    onBackToSupport: () => void
    vendorWorkspaceStore: Record<string, unknown> | null
    vendorOnboardingRequest: Record<string, unknown> | null
    financeWorkspaceSettlement: Record<string, unknown> | null
    onOpenVendorWorkspace: (store: Record<string, unknown>) => void
    onOpenVendorOnboardingWorkspace: (request: Record<string, unknown>) => void
    onBackToVendors: () => void
    onBackToVendorOnboarding: () => void
    onOpenFinanceWorkspace: (item: Record<string, unknown>) => void
    onBackToSettlements: () => void
    contentWorkspaceArticleId: string | null
    contentWorkspaceMode: 'create' | 'edit'
    pageBuilderWorkspacePageId: string | null
    pageBuilderWorkspaceMode: 'create' | 'edit'
    productWorkspaceSlug: string | null
    productWorkspaceMode: 'create' | 'edit'
    onOpenCategoryWorkspace: () => void
    onOpenProductTypeWorkspace: () => void
    onBackToProductsFromCategories: () => void
    onBackToProductsFromProductTypes: () => void
    onOpenProductWorkspaceForCreate: () => void
    onOpenProductWorkspaceForEdit: (product: Record<string, unknown>) => void
    onBackToProducts: () => void
    onOpenContentWorkspaceForCreate: () => void
    onOpenContentWorkspaceForEdit: (articleId: string) => void
    onBackToContent: () => void
    onOpenPageBuilderWorkspaceForCreate: () => void
    onOpenPageBuilderWorkspaceForEdit: (pageId: string) => void
    onBackToPageBuilder: () => void
    onOpenAccessControlWorkspace: () => void
    onBackToAccessControl: () => void
    onOpenSmsWorkspace: () => void
    onOpenStorefrontInfoPagesWorkspace: () => void
    onOpenSeoSettingsWorkspace: () => void
    onOpenPushNotificationWorkspace: () => void
    onOpenPaymentGatewayWorkspace: () => void
    onBackToSettings: () => void
    onBackToAlerts: () => void
    seoLandingWorkspaceId: number | null
    seoLandingWorkspaceMode: 'create' | 'edit'
    onOpenSeoLandingWorkspaceForCreate: () => void
    onOpenSeoLandingWorkspaceForEdit: (landingId: number) => void
    onBackToSeoLandings: () => void
  },
) {
  switch (route) {
    case 'orders':
      return <OrdersPage onOpenOrdersWorkspace={options.onOpenOrdersWorkspace} session={session} />
    case 'ordersWorkspace':
      return <OrdersWorkspacePage onBack={options.onBackToOrders} order={options.ordersWorkspaceOrder} session={session} />
    case 'settlements':
      return <SettlementsPage onOpenFinanceWorkspace={options.onOpenFinanceWorkspace} session={session} />
    case 'financeWorkspace':
      return <FinanceWorkspacePage onBack={options.onBackToSettlements} session={session} settlement={options.financeWorkspaceSettlement} />
    case 'support':
      return <SupportPage onOpenSupportWorkspace={options.onOpenSupportWorkspace} session={session} />
    case 'supportWorkspace':
      return <SupportWorkspacePage onBack={options.onBackToSupport} session={session} ticket={options.supportWorkspaceTicket} />
    case 'vendors':
      return <VendorsPage onOpenVendorWorkspace={options.onOpenVendorWorkspace} session={session} />
    case 'vendorWorkspace':
      return <VendorWorkspacePage onBack={options.onBackToVendors} session={session} store={options.vendorWorkspaceStore} />
    case 'vendorOnboarding':
      return <VendorOnboardingPage onOpenWorkspace={options.onOpenVendorOnboardingWorkspace} session={session} />
    case 'vendorOnboardingWorkspace':
      return <VendorOnboardingWorkspacePage onBack={options.onBackToVendorOnboarding} request={options.vendorOnboardingRequest} session={session} />
    case 'products':
      return <ProductsPage onCreateProduct={options.onOpenProductWorkspaceForCreate} onEditProduct={options.onOpenProductWorkspaceForEdit} onOpenCategoryWorkspace={options.onOpenCategoryWorkspace} onOpenProductTypeWorkspace={options.onOpenProductTypeWorkspace} session={session} />
    case 'productWorkspace':
      return <ProductWorkspacePage mode={options.productWorkspaceMode} onBack={options.onBackToProducts} productSlug={options.productWorkspaceSlug} session={session} />
    case 'categoryWorkspace':
      return <CategoryWorkspacePage onBack={options.onBackToProductsFromCategories} session={session} />
    case 'productTypeWorkspace':
      return <ProductTypeWorkspacePage onBack={options.onBackToProductsFromProductTypes} session={session} />
    case 'content':
      return <ContentPage onCreateArticle={options.onOpenContentWorkspaceForCreate} onEditArticle={options.onOpenContentWorkspaceForEdit} session={session} />
    case 'seoLandings':
      return <SeoLandingsPage onCreateLanding={options.onOpenSeoLandingWorkspaceForCreate} onEditLanding={options.onOpenSeoLandingWorkspaceForEdit} session={session} />
    case 'seoLandingWorkspace':
      return <SeoLandingWorkspacePage landingId={options.seoLandingWorkspaceId} mode={options.seoLandingWorkspaceMode} onBack={options.onBackToSeoLandings} session={session} />
    case 'pageBuilder':
      return <PageBuilderPage onCreatePage={options.onOpenPageBuilderWorkspaceForCreate} onEditPage={options.onOpenPageBuilderWorkspaceForEdit} session={session} />
    case 'settings':
      return <SettingsPage onOpenPaymentGatewayWorkspace={options.onOpenPaymentGatewayWorkspace} onOpenSeoSettingsWorkspace={options.onOpenSeoSettingsWorkspace} onOpenSmsWorkspace={options.onOpenSmsWorkspace} onOpenStorefrontInfoPagesWorkspace={options.onOpenStorefrontInfoPagesWorkspace} />
    case 'smsSettingsWorkspace':
      return <SmsSettingsWorkspacePage onBack={options.onBackToSettings} session={session} />
    case 'storefrontInfoPagesWorkspace':
      return <StorefrontInfoPagesWorkspacePage onBack={options.onBackToSettings} session={session} />
    case 'seoSettingsWorkspace':
      return <SeoSettingsWorkspacePage onBack={options.onBackToSettings} session={session} />
    case 'paymentGatewayWorkspace':
      return <PaymentGatewayWorkspacePage onBack={options.onBackToSettings} session={session} />
    case 'pushNotificationWorkspace':
      return <PushNotificationWorkspacePage onBack={options.onBackToAlerts} session={session} />
    case 'pageBuilderWorkspace':
      return <PageBuilderWorkspacePage mode={options.pageBuilderWorkspaceMode} onBack={options.onBackToPageBuilder} pageId={options.pageBuilderWorkspacePageId} session={session} />
    case 'contentWorkspace':
      return <ContentWorkspacePage articleId={options.contentWorkspaceArticleId} mode={options.contentWorkspaceMode} onBack={options.onBackToContent} session={session} />
    case 'alerts':
      return <AlertsPage onOpenPushNotificationWorkspace={options.onOpenPushNotificationWorkspace} session={session} />
    case 'accessControl':
      return <AccessControlPage onOpenWorkspace={options.onOpenAccessControlWorkspace} session={session} />
    case 'accessControlWorkspace':
      return <AccessControlWorkspacePage onBack={options.onBackToAccessControl} session={session} />
    case 'dashboard':
    default:
      return <DashboardPage session={session} />
  }
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [route, setRoute] = useState<AdminRoute>(defaultRoute)
  const [ordersWorkspaceOrder, setOrdersWorkspaceOrder] = useState<Record<string, unknown> | null>(null)
  const [supportWorkspaceTicket, setSupportWorkspaceTicket] = useState<Record<string, unknown> | null>(null)
  const [vendorWorkspaceStore, setVendorWorkspaceStore] = useState<Record<string, unknown> | null>(null)
  const [vendorOnboardingRequest, setVendorOnboardingRequest] = useState<Record<string, unknown> | null>(null)
  const [financeWorkspaceSettlement, setFinanceWorkspaceSettlement] = useState<Record<string, unknown> | null>(null)
  const [productWorkspaceSlug, setProductWorkspaceSlug] = useState<string | null>(null)
  const [productWorkspaceMode, setProductWorkspaceMode] = useState<'create' | 'edit'>('create')
  const [pageBuilderWorkspacePageId, setPageBuilderWorkspacePageId] = useState<string | null>(null)
  const [pageBuilderWorkspaceMode, setPageBuilderWorkspaceMode] = useState<'create' | 'edit'>('create')
  const [contentWorkspaceArticleId, setContentWorkspaceArticleId] = useState<string | null>(null)
  const [contentWorkspaceMode, setContentWorkspaceMode] = useState<'create' | 'edit'>('create')
  const [seoLandingWorkspaceId, setSeoLandingWorkspaceId] = useState<number | null>(null)
  const [seoLandingWorkspaceMode, setSeoLandingWorkspaceMode] = useState<'create' | 'edit'>('create')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null)
  const [otpCountdown, setOtpCountdown] = useState<string | null>(null)

  useEffect(() => {
    const storedSession = loadSession()
    setSession(storedSession)
  }, [])

  useEffect(() => {
    if (!session) return

    let active = true

    async function bootstrap(currentSession: AuthSession) {
      setBootstrapping(true)
      try {
        const response = await adminApi.getSessionBootstrap(currentSession)
        if (!active) return

        const nextBootstrap: SessionBootstrap = {
          effectivePermissions: response.effectivePermissions ?? [],
        }
        const nextSession = { ...currentSession, bootstrap: nextBootstrap }
        saveSession(nextSession)
        setSession(nextSession)

        const safeRoute = canAccessRoute(nextSession, route)
          ? route
          : getFirstAccessibleRoute(nextSession, adminRouteOrder) ?? defaultRoute
        setRoute(safeRoute)
      } catch (requestError) {
        if (!active) return
        if (requestError instanceof ApiError && requestError.status === 403) {
          const fallbackBootstrap: SessionBootstrap = { effectivePermissions: [] }
          const fallbackSession = { ...currentSession, bootstrap: fallbackBootstrap }
          saveSession(fallbackSession)
          setSession(fallbackSession)
          const firstRoute = getFirstAccessibleRoute(fallbackSession, adminRouteOrder)
          if (firstRoute) {
            setRoute(firstRoute)
          } else {
            clearSession()
            setSession(null)
            setError('این حساب هیچ دسترسی معتبری برای پنل ادمین ندارد.')
          }
          return
        }

        setError(requestError instanceof Error ? requestError.message : 'خطا در bootstrap نشست')
      } finally {
        if (active) setBootstrapping(false)
      }
    }

    if (!session.bootstrap) {
      void bootstrap(session)
      return () => {
        active = false
      }
    }

    const safeRoute = canAccessRoute(session, route)
      ? route
      : getFirstAccessibleRoute(session, adminRouteOrder) ?? defaultRoute

    if (safeRoute !== route) {
      setRoute(safeRoute)
    }

    return () => {
      active = false
    }
  }, [route, session])

  useEffect(() => {
    if (!otpExpiresAt) {
      setOtpCountdown(null)
      return
    }

    const formatter = new Intl.NumberFormat('fa-IR')

    const updateCountdown = () => {
      const diffMs = new Date(otpExpiresAt).getTime() - Date.now()
      if (Number.isNaN(diffMs) || diffMs <= 0) {
        setOtpCountdown(null)
        setOtpExpiresAt(null)
        return
      }

      const totalSeconds = Math.ceil(diffMs / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      if (minutes > 0) {
        setOtpCountdown(`${formatter.format(minutes)} دقیقه و ${formatter.format(seconds)} ثانیه`)
        return
      }

      setOtpCountdown(`${formatter.format(totalSeconds)} ثانیه`)
    }

    updateCountdown()
    const intervalId = window.setInterval(updateCountdown, 1000)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [otpExpiresAt])

  useNoticeEffect(message, 'success')
  useNoticeEffect(error, 'error')

  const pageMeta = useMemo(() => getPageMeta(route), [route])

  async function handleSendOtp() {
    if (!phoneNumber.trim()) {
      setError('شماره موبایل را وارد کن.')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await adminApi.sendOtp(phoneNumber.trim())
      setMessage('کد تایید ارسال شد.')
      setOtpExpiresAt(response.expiresAt)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ارسال OTP ناموفق بود')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp() {
    if (!phoneNumber.trim() || !code.trim()) {
      setError('شماره موبایل و کد تایید الزامی هستند.')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await adminApi.verifyOtp(phoneNumber.trim(), code.trim())
      const nextSession: AuthSession = {
        accessToken: response.access_token,
        user: response.user,
      }

      saveSession(nextSession)
      setSession(nextSession)
      setCode('')
      setOtpExpiresAt(null)
      setOtpCountdown(null)
      setMessage('ورود موفق بود و نشست جدید آغاز شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تایید OTP ناموفق بود')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    clearSession()
    setSession(null)
    setCode('')
    setMessage(null)
    setError(null)
    setOtpExpiresAt(null)
    setOtpCountdown(null)
  }

  function handleNavigate(nextRoute: AdminRoute) {
    if (!session || !canAccessRoute(session, nextRoute)) {
      setError('این بخش برای نقش فعلی شما در دسترس نیست.')
      return
    }
    setRoute(nextRoute)
  }

  function handleOpenOrdersWorkspace(order: Record<string, unknown>) {
    setOrdersWorkspaceOrder(order)
    handleNavigate('ordersWorkspace')
  }

  function handleBackToOrders() {
    handleNavigate('orders')
  }

  function handleOpenVendorWorkspace(store: Record<string, unknown>) {
    setVendorWorkspaceStore(store)
    handleNavigate('vendorWorkspace')
  }

  function handleOpenSupportWorkspace(ticket: Record<string, unknown>) {
    setSupportWorkspaceTicket(ticket)
    handleNavigate('supportWorkspace')
  }

  function handleBackToSupport() {
    handleNavigate('support')
  }

  function handleBackToVendors() {
    handleNavigate('vendors')
  }

  function handleOpenVendorOnboardingWorkspace(request: Record<string, unknown>) {
    setVendorOnboardingRequest(request)
    handleNavigate('vendorOnboardingWorkspace')
  }

  function handleBackToVendorOnboarding() {
    handleNavigate('vendorOnboarding')
  }

  function handleOpenFinanceWorkspace(item: Record<string, unknown>) {
    setFinanceWorkspaceSettlement(item)
    handleNavigate('financeWorkspace')
  }

  function handleBackToSettlements() {
    handleNavigate('settlements')
  }

  function handleOpenContentWorkspaceForCreate() {
    setContentWorkspaceMode('create')
    setContentWorkspaceArticleId(null)
    handleNavigate('contentWorkspace')
  }

  function handleOpenProductWorkspaceForCreate() {
    setProductWorkspaceMode('create')
    setProductWorkspaceSlug(null)
    handleNavigate('productWorkspace')
  }

  function handleOpenProductWorkspaceForEdit(product: Record<string, unknown>) {
    setProductWorkspaceMode('edit')
    setProductWorkspaceSlug(readText(product, ['slug'], ''))
    handleNavigate('productWorkspace')
  }

  function handleBackToProducts() {
    handleNavigate('products')
  }

  function handleOpenCategoryWorkspace() {
    handleNavigate('categoryWorkspace')
  }

  function handleOpenProductTypeWorkspace() {
    handleNavigate('productTypeWorkspace')
  }

  function handleOpenContentWorkspaceForEdit(articleId: string) {
    setContentWorkspaceMode('edit')
    setContentWorkspaceArticleId(articleId)
    handleNavigate('contentWorkspace')
  }

  function handleBackToContent() {
    handleNavigate('content')
  }

  function handleOpenSeoLandingWorkspaceForCreate() {
    setSeoLandingWorkspaceMode('create')
    setSeoLandingWorkspaceId(null)
    handleNavigate('seoLandingWorkspace')
  }

  function handleOpenSeoLandingWorkspaceForEdit(landingId: number) {
    setSeoLandingWorkspaceMode('edit')
    setSeoLandingWorkspaceId(landingId)
    handleNavigate('seoLandingWorkspace')
  }

  function handleBackToSeoLandings() {
    handleNavigate('seoLandings')
  }

  function handleOpenPageBuilderWorkspaceForCreate() {
    setPageBuilderWorkspaceMode('create')
    setPageBuilderWorkspacePageId(null)
    handleNavigate('pageBuilderWorkspace')
  }

  function handleOpenPageBuilderWorkspaceForEdit(pageId: string) {
    setPageBuilderWorkspaceMode('edit')
    setPageBuilderWorkspacePageId(pageId)
    handleNavigate('pageBuilderWorkspace')
  }

  function handleBackToPageBuilder() {
    handleNavigate('pageBuilder')
  }

  function handleOpenAccessControlWorkspace() {
    handleNavigate('accessControlWorkspace')
  }

  function handleBackToAccessControl() {
    handleNavigate('accessControl')
  }

  function handleOpenSmsWorkspace() {
    handleNavigate('smsSettingsWorkspace')
  }

  function handleOpenStorefrontInfoPagesWorkspace() {
    handleNavigate('storefrontInfoPagesWorkspace')
  }

  function handleOpenPushNotificationWorkspace() {
    handleNavigate('pushNotificationWorkspace')
  }

  function handleOpenPaymentGatewayWorkspace() {
    handleNavigate('paymentGatewayWorkspace')
  }

  function handleOpenSeoSettingsWorkspace() {
    handleNavigate('seoSettingsWorkspace')
  }

  function handleBackToSettings() {
    handleNavigate('settings')
  }

  if (!session) {
    return (
      <LoginPage
        code={code}
        loading={loading}
        otpCountdown={otpCountdown}
        onCodeChange={setCode}
        onPhoneChange={setPhoneNumber}
        onSendOtp={handleSendOtp}
        onVerifyOtp={handleVerifyOtp}
        phoneNumber={phoneNumber}
      />
    )
  }

  if (bootstrapping && !session.bootstrap) {
    return (
      <div className="auth-screen" dir="rtl">
        <div className="auth-shell">
          <div className="auth-card auth-card--compact">
            <div className="auth-card__header auth-card__header--compact">
              <h1>در حال آماده سازی دسترسی ها</h1>
              <p>نشست شما تایید شده و سطح دسترسی واقعی پنل در حال بارگذاری است.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const navSections = buildNav(route, session)
  const currentScope = describeScope(session)
  const accountName = session.user.fullName || session.user.phoneNumber
  const accountRole = session.user.roles.join(' / ') || 'کاربر احراز هویت شده'
  const accountActions = [
    canAccessRoute(session, 'accessControl')
      ? { label: 'مشاهده اطلاعات حساب', onClick: () => handleNavigate('accessControl') }
      : null,
    canAccessRoute(session, 'settings')
      ? { label: 'تنظیمات پنل', onClick: () => handleNavigate('settings') }
      : null,
    { label: 'خروج از پنل', onClick: handleLogout, tone: 'danger' as const },
  ].filter((action): action is NonNullable<typeof action> => action !== null)

  return (
    <AppShell
      tone="admin"
      productName="مرکز کنترل ادمین"
      productSubtitle="عملیات بازار گل"
      workspaceLabel="پنل ادمین"
      userName={accountName}
      userRole={accountRole}
      pageEyebrow={pageMeta.eyebrow}
      pageTitle={pageMeta.title}
      pageDescription=""
      navSections={navSections}
      onNavigate={(next) => handleNavigate(next as AdminRoute)}
      actions={[
        { label: adminRouteLabels[route], tone: 'ghost' },
        { label: currentScope, tone: 'secondary' },
      ]}
      accountMenu={{
        profileLabel: 'حساب ادمین',
        storeName: 'مرکز کنترل بازار گل',
        phoneNumber: session.user.phoneNumber,
        statusLabel: 'دسترسی فعال و همگام با نقش‌ها',
        quickStats: [
          { label: 'سطح دسترسی', value: currentScope },
          { label: 'بخش فعلی', value: adminRouteLabels[route] },
        ],
        actions: accountActions,
      }}
    >
      <div className="admin-toolbar-note">
        <Pill>{currentScope}</Pill>
        <Pill tone="success">نشست فعال</Pill>
      </div>
      {renderRoute(route, session, {
        ordersWorkspaceOrder,
        onOpenOrdersWorkspace: handleOpenOrdersWorkspace,
        onBackToOrders: handleBackToOrders,
        supportWorkspaceTicket,
        onOpenSupportWorkspace: handleOpenSupportWorkspace,
        onBackToSupport: handleBackToSupport,
        vendorWorkspaceStore,
        vendorOnboardingRequest,
        onOpenVendorWorkspace: handleOpenVendorWorkspace,
        onOpenVendorOnboardingWorkspace: handleOpenVendorOnboardingWorkspace,
        onBackToVendors: handleBackToVendors,
        onBackToVendorOnboarding: handleBackToVendorOnboarding,
        financeWorkspaceSettlement,
        onOpenFinanceWorkspace: handleOpenFinanceWorkspace,
        onBackToSettlements: handleBackToSettlements,
        productWorkspaceSlug,
        productWorkspaceMode,
              onOpenProductWorkspaceForCreate: handleOpenProductWorkspaceForCreate,
              onOpenCategoryWorkspace: handleOpenCategoryWorkspace,
              onOpenProductTypeWorkspace: handleOpenProductTypeWorkspace,
              onBackToProductsFromCategories: handleBackToProducts,
              onBackToProductsFromProductTypes: handleBackToProducts,
              onOpenProductWorkspaceForEdit: handleOpenProductWorkspaceForEdit,
        onBackToProducts: handleBackToProducts,
        contentWorkspaceArticleId,
        contentWorkspaceMode,
        onOpenContentWorkspaceForCreate: handleOpenContentWorkspaceForCreate,
        onOpenContentWorkspaceForEdit: handleOpenContentWorkspaceForEdit,
        onBackToContent: handleBackToContent,
        pageBuilderWorkspacePageId,
        pageBuilderWorkspaceMode,
        onOpenPageBuilderWorkspaceForCreate: handleOpenPageBuilderWorkspaceForCreate,
        onOpenPageBuilderWorkspaceForEdit: handleOpenPageBuilderWorkspaceForEdit,
        onBackToPageBuilder: handleBackToPageBuilder,
        onOpenAccessControlWorkspace: handleOpenAccessControlWorkspace,
        onBackToAccessControl: handleBackToAccessControl,
        onOpenSmsWorkspace: handleOpenSmsWorkspace,
        onOpenStorefrontInfoPagesWorkspace: handleOpenStorefrontInfoPagesWorkspace,
        onOpenSeoSettingsWorkspace: handleOpenSeoSettingsWorkspace,
        onOpenPushNotificationWorkspace: handleOpenPushNotificationWorkspace,
        onOpenPaymentGatewayWorkspace: handleOpenPaymentGatewayWorkspace,
        onBackToSettings: handleBackToSettings,
        onBackToAlerts: () => handleNavigate('alerts'),
        seoLandingWorkspaceId,
        seoLandingWorkspaceMode,
        onOpenSeoLandingWorkspaceForCreate: handleOpenSeoLandingWorkspaceForCreate,
        onOpenSeoLandingWorkspaceForEdit: handleOpenSeoLandingWorkspaceForEdit,
        onBackToSeoLandings: handleBackToSeoLandings,
      })}
    </AppShell>
  )
}

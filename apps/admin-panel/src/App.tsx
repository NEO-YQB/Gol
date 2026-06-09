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
import { SettingsPage } from './pages/SettingsPage'
import { SmsSettingsWorkspacePage } from './pages/SmsSettingsWorkspacePage'
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
        { key: 'vendorOnboarding', label: 'درخواست‌های فروشندگی', hint: 'مدارک، جواز و تصمیم‌گیری روی فروشنده‌های جدید', active: currentRoute === 'vendorOnboarding' || currentRoute === 'vendorOnboardingWorkspace' },
        { key: 'products', label: 'محصولات', hint: 'کارتابل catalog، کیفیت محتوا و سئوی محصول', active: currentRoute === 'products' || currentRoute === 'productWorkspace' },
      ],
    },
    {
      title: isAccessOnly ? 'پیکربندی دسترسی' : isSeoOnly ? 'کیفیت محتوا' : 'رشد و کنترل',
      requirements: ['content', 'pageBuilder', 'alerts', 'accessControl'],
      items: [
        { key: 'content', label: 'محتوا و سئو', hint: 'تحریریه، taxonomy و auditهای محتوا', active: currentRoute === 'content' || currentRoute === 'contentWorkspace' },
        { key: 'pageBuilder', label: 'صفحه‌ساز استور', hint: 'landing pageها، homepage و چیدمان بلاک‌های storefront', active: currentRoute === 'pageBuilder' || currentRoute === 'pageBuilderWorkspace' },
        { key: 'alerts', label: 'هشدارها و اعلان ها', hint: 'outbox و رخدادهای مهم عملیاتی', active: currentRoute === 'alerts' },
        { key: 'accessControl', label: 'کاربران و دسترسی', hint: 'مدیریت user، role و permission', active: currentRoute === 'accessControl' || currentRoute === 'accessControlWorkspace', badge: hasPermission(session, 'assignPermissions', 'AdminRole') ? 'قابل ویرایش' : 'فقط مشاهده' },
        { key: 'settings', label: 'تنظیمات', hint: 'تنظیمات سراسری سرویس‌ها و یکپارچه‌سازی‌ها', active: currentRoute === 'settings' || currentRoute === 'smsSettingsWorkspace' || currentRoute === 'paymentGatewayWorkspace' },
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
        title: 'سفارش ها و صف استثناهای عملیاتی',
        description: 'این صفحه بر اساس scope نشست فعلی فقط بخش های مجاز عملیات سفارش را برای کاربر باز می کند.',
      }
    case 'settlements':
      return {
        eyebrow: 'کارتابل مالی',
        title: 'تسویه، کیف پول و صف استثناهای مالی',
        description: 'این route برای triage مالی است؛ summary و exceptionها را نشان می دهد و از آن وارد workspace متمرکز مالی می شوی.',
      }
    case 'financeWorkspace':
      return {
        eyebrow: 'میزکار مالی',
        title: 'رسیدگی متمرکز به کیف پول، adjustment و آزادسازی تسویه',
        description: 'تصمیم های واقعی مالی باید در workspace جدا و focused انجام شوند، نه داخل list کارتابل.',
      }
    case 'ordersWorkspace':
      return {
        eyebrow: 'میزکار سفارش',
        title: 'رسیدگی متمرکز به سفارش و استثناهای آن',
        description: 'workspace سفارش از list جدا مانده تا تصمیم و actionهای اصلی در فضای focused انجام شوند.',
      }
    case 'support':
      return {
        eyebrow: 'کارتابل پشتیبانی',
        title: 'تیکت ها و پیگیری های پشتیبانی',
        description: 'این route برای نقش های عملیاتی مرتبط، نمای سریع تیکت و follow-up فراهم می کند.',
      }
    case 'supportWorkspace':
      return {
        eyebrow: 'میزکار پشتیبانی',
        title: 'رسیدگی متمرکز به تیکت و تصمیم های بعدی',
        description: 'تغییر وضعیت، note داخلی و تصمیم مالی باید در یک سطح focused و قابل ردیابی انجام شود.',
      }
    case 'vendors':
      return {
        eyebrow: 'کارتابل فروشنده ها',
        title: 'فروشنده ها، ریسک و گزارش های مالی',
        description: 'این route برای admin با دید عمیق تر روی policy، health و وضعیت فروشنده طراحی شده است.',
      }
    case 'vendorWorkspace':
      return {
        eyebrow: 'میزکار فروشنده',
        title: 'بررسی متمرکز فروشنده و تصمیم های بعدی',
        description: 'اقدام های سنگین روی vendor باید در یک workspace مجزا و متمرکز انجام شوند.',
      }
    case 'vendorOnboarding':
      return {
        eyebrow: 'درخواست‌های فروشندگی',
        title: 'فروشنده‌های جدید، مدارک و جوازهای در انتظار بررسی',
        description: 'این route برای اسکن سریع درخواست‌های تازه و ورود به workspace بررسی مدارک و تصمیم‌گیری ساخته شده است.',
      }
    case 'vendorOnboardingWorkspace':
      return {
        eyebrow: 'میزکار درخواست فروشنده',
        title: 'بررسی هویت، مدارک و محصول اولیه فروشنده',
        description: 'در این workspace ادمین یا اپراتور مجاز می‌تواند مدارک را ببیند و درباره اصل درخواست و محصول اولیه تصمیم بگیرد.',
      }
    case 'products':
      return {
        eyebrow: 'کارتابل محصولات',
        title: 'محصول‌ها، آمادگی محتوایی و عملیات سئوی محصول',
        description: 'این route برای اسکن سریع catalog و ورود به workspace جدا برای ایجاد، ویرایش و بازبینی محصول ساخته شده است.',
      }
    case 'productWorkspace':
      return {
        eyebrow: 'میزکار محصول',
        title: 'workspace متمرکز ایجاد، ویرایش و بازبینی محصول',
        description: 'فرم‌های سنگین، سئو، preview و جزئیات محتوایی محصول باید در این surface focused انجام شوند، نه در کارتابل اصلی.',
      }
    case 'categoryWorkspace':
      return {
        eyebrow: 'taxonomy workspace',
        title: 'میزکار دسته‌بندی با ساختار درختی و مدیریت parent/child',
        description: 'این workspace برای ساخت، ویرایش و حذف دسته‌ها با دید درختی، SEO و سازمان‌دهی taxonomy محصولات طراحی شده است.',
      }
    case 'productTypeWorkspace':
      return {
        eyebrow: 'catalog type workspace',
        title: 'میزکار نوع محصول و تعریف المان‌های مجاز',
        description: 'در این workspace نوع‌های محصول، تصویر، سئو و سازگاری آن‌ها با المان‌های مجاز catalog مدیریت می‌شود.',
      }
    case 'content':
      return {
        eyebrow: 'کارتابل محتوا',
        title: 'محتوا، taxonomy و عملیات سئو',
        description: 'این route بر اساس permission نشست فعلی، سطح دسترسی واقعی تیم محتوا و SEO را نشان می دهد.',
      }
    case 'pageBuilder':
      return {
        eyebrow: 'page builder',
        title: 'صفحه‌ساز storefront و چیدمان کمپین‌ها',
        description: 'از این route می‌توان صفحه اصلی، لندینگ‌ها و بلاک‌های صفحه‌ساز storefront را مدیریت کرد.',
      }
    case 'pageBuilderWorkspace':
      return {
        eyebrow: 'page builder workspace',
        title: 'ویرایشگر متمرکز صفحه‌های storefront',
        description: 'تنظیمات SEO، بلوک‌ها، ترتیب نمایش و وضعیت انتشار هر صفحه storefront در این workspace مدیریت می‌شود.',
      }
    case 'settings':
      return {
        eyebrow: 'system settings',
        title: 'تنظیمات سراسری سرویس‌ها و یکپارچه‌سازی‌ها',
        description: 'پیکربندی سرویس‌های بیرونی مثل OTP واقعی و سایر integrationها از این route انجام می‌شود.',
      }
    case 'smsSettingsWorkspace':
      return {
        eyebrow: 'sms workspace',
        title: 'workspace تنظیمات پیامکی',
        description: 'تنظیمات پنل پیامکی و تست OTP در این workspace مدیریت می‌شود.',
      }
    case 'paymentGatewayWorkspace':
      return {
        eyebrow: 'payment workspace',
        title: 'workspace تنظیمات درگاه پرداخت',
        description: 'تنظیمات زرین‌پال و سایر gatewayها در این workspace نگهداری می‌شود.',
      }
    case 'contentWorkspace':
      return {
        eyebrow: 'ویرایشگر محتوایی',
        title: 'workspace متمرکز نگارش، سئو و taxonomy',
        description: 'create و edit محتوا از کارتابل جدا شده تا سطح focused برای فرم های طولانی و actionهای محتوایی حفظ شود.',
      }
    case 'alerts':
      return {
        eyebrow: 'کارتابل هشدارها',
        title: 'هشدارها، outbox و رخدادهای عملیاتی',
        description: 'این route برای visibility بهتر روی alert lifecycle و notification ops طراحی شده است.',
      }
    case 'accessControl':
      return {
        eyebrow: 'کنترل دسترسی',
        title: 'کاربران، نقش ها و ماتریس permission',
        description: 'نمای کارتابلی access control برای اسکن سریع وضعیت دسترسی ها و ورود به workspace تخصصی مدیریت کاربران.',
      }
    case 'accessControlWorkspace':
      return {
        eyebrow: 'میزکار دسترسی',
        title: 'workspace متمرکز مدیریت user، role و permission',
        description: 'این workspace برای بررسی دقیق کاربر، نقش و permission catalog ساخته شده تا actionهای واقعی بعدی روی همین surface سوار شوند.',
      }
    case 'dashboard':
    default:
      return {
        eyebrow: 'shell نقش محور',
        title: 'داشبورد ادمین حالا بر اساس scope واقعی نشست کار می کند',
        description: 'navigation، routeها و CTAها دیگر برای همه یکسان نیستند و بر اساس permissionهای واقعی نشست bootstrap می شوند.',
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
    onOpenPaymentGatewayWorkspace: () => void
    onBackToSettings: () => void
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
    case 'pageBuilder':
      return <PageBuilderPage onCreatePage={options.onOpenPageBuilderWorkspaceForCreate} onEditPage={options.onOpenPageBuilderWorkspaceForEdit} session={session} />
    case 'settings':
      return <SettingsPage onOpenPaymentGatewayWorkspace={options.onOpenPaymentGatewayWorkspace} onOpenSmsWorkspace={options.onOpenSmsWorkspace} />
    case 'smsSettingsWorkspace':
      return <SmsSettingsWorkspacePage onBack={options.onBackToSettings} session={session} />
    case 'paymentGatewayWorkspace':
      return <PaymentGatewayWorkspacePage onBack={options.onBackToSettings} session={session} />
    case 'pageBuilderWorkspace':
      return <PageBuilderWorkspacePage mode={options.pageBuilderWorkspaceMode} onBack={options.onBackToPageBuilder} pageId={options.pageBuilderWorkspacePageId} session={session} />
    case 'contentWorkspace':
      return <ContentWorkspacePage articleId={options.contentWorkspaceArticleId} mode={options.contentWorkspaceMode} onBack={options.onBackToContent} session={session} />
    case 'alerts':
      return <AlertsPage session={session} />
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

  function handleOpenPaymentGatewayWorkspace() {
    handleNavigate('paymentGatewayWorkspace')
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

  return (
    <AppShell
      tone="admin"
      productName="مرکز کنترل ادمین"
      productSubtitle="عملیات بازار گل"
      workspaceLabel="پنل ادمین"
      userName={session.user.fullName || session.user.phoneNumber}
      userRole={session.user.roles.join(' / ') || 'کاربر احراز هویت شده'}
      pageEyebrow={pageMeta.eyebrow}
      pageTitle={pageMeta.title}
      pageDescription={pageMeta.description}
      navSections={navSections}
      onNavigate={(next) => handleNavigate(next as AdminRoute)}
      actions={[
        { label: adminRouteLabels[route], tone: 'ghost' },
        { label: currentScope, tone: 'secondary' },
        { label: 'permission-aware', tone: 'primary' },
      ]}
    >
      <div className="admin-toolbar-note">
        <Pill tone="success">OTP + JWT</Pill>
        <Pill tone="warning">Bootstrap دسترسی</Pill>
        <Pill>{session.user.phoneNumber}</Pill>
        <Pill>{currentScope}</Pill>
        <button className="admin-logout" onClick={handleLogout} type="button">
          خروج از پنل
        </button>
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
        onOpenPaymentGatewayWorkspace: handleOpenPaymentGatewayWorkspace,
        onBackToSettings: handleBackToSettings,
      })}
    </AppShell>
  )
}

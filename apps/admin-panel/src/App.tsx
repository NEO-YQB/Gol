import { AppShell, Pill, type NavSection } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { useNoticeEffect } from './components/NoticeCenter'
import { adminApi, ApiError } from './lib/api'
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
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { OrdersPage } from './pages/OrdersPage'
import { OrdersWorkspacePage } from './pages/OrdersWorkspacePage'
import { SettlementsPage } from './pages/SettlementsPage'
import { SupportPage } from './pages/SupportPage'
import { SupportWorkspacePage } from './pages/SupportWorkspacePage'
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
      requirements: ['dashboard', 'orders', 'settlements', 'support', 'vendors'],
      items: [
        { key: 'dashboard', label: 'داشبورد', hint: 'نمای نقش محور از وضعیت کلی', active: currentRoute === 'dashboard' },
        { key: 'orders', label: 'سفارش ها', hint: 'کارتابل عملیات سفارش و صف استثناها', active: currentRoute === 'orders' || currentRoute === 'ordersWorkspace' },
        { key: 'settlements', label: 'تسویه و مالی', hint: 'کیف پول، تسویه و summaryهای مالی', active: currentRoute === 'settlements' },
        { key: 'support', label: 'پشتیبانی', hint: 'تیکت ها، noteها و رسیدگی بعدی', active: currentRoute === 'support' || currentRoute === 'supportWorkspace' },
        { key: 'vendors', label: 'فروشنده ها و ریسک', hint: 'visibility ریسک، policy و سلامت فروشنده', active: currentRoute === 'vendors' || currentRoute === 'vendorWorkspace' },
      ],
    },
    {
      title: isAccessOnly ? 'پیکربندی دسترسی' : isSeoOnly ? 'کیفیت محتوا' : 'رشد و کنترل',
      requirements: ['content', 'alerts', 'accessControl'],
      items: [
        { key: 'content', label: 'محتوا و سئو', hint: 'تحریریه، taxonomy و auditهای محتوا', active: currentRoute === 'content' || currentRoute === 'contentWorkspace' },
        { key: 'alerts', label: 'هشدارها و اعلان ها', hint: 'outbox و رخدادهای مهم عملیاتی', active: currentRoute === 'alerts' },
        { key: 'accessControl', label: 'کاربران و دسترسی', hint: 'مدیریت user، role و permission', active: currentRoute === 'accessControl' || currentRoute === 'accessControlWorkspace', badge: hasPermission(session, 'assignPermissions', 'AdminRole') ? 'قابل ویرایش' : 'فقط مشاهده' },
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
        title: 'تسویه، کیف پول و دید مالی',
        description: 'اپراتور مالی یا ادمین از این route تصویر روشن تری از wallet، settlement و exceptionها می گیرد.',
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
    case 'content':
      return {
        eyebrow: 'کارتابل محتوا',
        title: 'محتوا، taxonomy و عملیات سئو',
        description: 'این route بر اساس permission نشست فعلی، سطح دسترسی واقعی تیم محتوا و SEO را نشان می دهد.',
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
    onOpenVendorWorkspace: (store: Record<string, unknown>) => void
    onBackToVendors: () => void
    contentWorkspaceArticleId: string | null
    contentWorkspaceMode: 'create' | 'edit'
    onOpenContentWorkspaceForCreate: () => void
    onOpenContentWorkspaceForEdit: (articleId: string) => void
    onBackToContent: () => void
    onOpenAccessControlWorkspace: () => void
    onBackToAccessControl: () => void
  },
) {
  switch (route) {
    case 'orders':
      return <OrdersPage onOpenOrdersWorkspace={options.onOpenOrdersWorkspace} session={session} />
    case 'ordersWorkspace':
      return <OrdersWorkspacePage onBack={options.onBackToOrders} order={options.ordersWorkspaceOrder} session={session} />
    case 'settlements':
      return <SettlementsPage session={session} />
    case 'support':
      return <SupportPage onOpenSupportWorkspace={options.onOpenSupportWorkspace} session={session} />
    case 'supportWorkspace':
      return <SupportWorkspacePage onBack={options.onBackToSupport} session={session} ticket={options.supportWorkspaceTicket} />
    case 'vendors':
      return <VendorsPage onOpenVendorWorkspace={options.onOpenVendorWorkspace} session={session} />
    case 'vendorWorkspace':
      return <VendorWorkspacePage onBack={options.onBackToVendors} session={session} store={options.vendorWorkspaceStore} />
    case 'content':
      return <ContentPage onCreateArticle={options.onOpenContentWorkspaceForCreate} onEditArticle={options.onOpenContentWorkspaceForEdit} session={session} />
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

  function handleOpenContentWorkspaceForCreate() {
    setContentWorkspaceMode('create')
    setContentWorkspaceArticleId(null)
    handleNavigate('contentWorkspace')
  }

  function handleOpenContentWorkspaceForEdit(articleId: string) {
    setContentWorkspaceMode('edit')
    setContentWorkspaceArticleId(articleId)
    handleNavigate('contentWorkspace')
  }

  function handleBackToContent() {
    handleNavigate('content')
  }

  function handleOpenAccessControlWorkspace() {
    handleNavigate('accessControlWorkspace')
  }

  function handleBackToAccessControl() {
    handleNavigate('accessControl')
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
        onOpenVendorWorkspace: handleOpenVendorWorkspace,
        onBackToVendors: handleBackToVendors,
        contentWorkspaceArticleId,
        contentWorkspaceMode,
        onOpenContentWorkspaceForCreate: handleOpenContentWorkspaceForCreate,
        onOpenContentWorkspaceForEdit: handleOpenContentWorkspaceForEdit,
        onBackToContent: handleBackToContent,
        onOpenAccessControlWorkspace: handleOpenAccessControlWorkspace,
        onBackToAccessControl: handleBackToAccessControl,
      })}
    </AppShell>
  )
}

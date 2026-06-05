import { AppShell, Pill, type NavSection } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { clearSession, loadSession, saveSession, type AuthSession } from './lib/session'
import { vendorApi } from './lib/api'
import { vendorRouteLabels, type VendorRoute } from './lib/routes'
import { LoginPage } from './pages/LoginPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { DiscountsPage } from './pages/DiscountsPage'
import { OrdersPage } from './pages/OrdersPage'
import { OrderWorkspacePage } from './pages/OrderWorkspacePage'
import { OverviewPage } from './pages/OverviewPage'
import { ProductsPage } from './pages/ProductsPage'
import { ReviewsPage } from './pages/ReviewsPage'
import { StoreProfilePage } from './pages/StoreProfilePage'
import { SupportPage } from './pages/SupportPage'
import { WalletPage } from './pages/WalletPage'
import { VendorOnboardingPage } from './pages/VendorOnboardingPage'

type VendorAccessState = 'pending' | 'active'

const defaultRoute: VendorRoute = 'overview'

function buildNav(currentRoute: VendorRoute): NavSection[] {
  return [
    {
      title: 'فروشگاه',
      items: [
        { key: 'overview', label: 'نمای کلی', hint: 'خلاصه فروشگاه و محدودیت‌های موثر', active: currentRoute === 'overview' },
        { key: 'orders', label: 'سفارش‌ها', hint: 'سفارش‌های فروشگاه روی داده واقعی', active: currentRoute === 'orders' || currentRoute === 'order-workspace' },
        { key: 'store', label: 'پروفایل فروشگاه', hint: 'هویت فروشگاه، زمان‌بندی ارسال و تنظیمات profile', active: currentRoute === 'store' },
        { key: 'products', label: 'محصولات', hint: 'موجودی، دسته‌ها و محصول‌های نیازمند توجه', active: currentRoute === 'products' },
        { key: 'discounts', label: 'تخفیف‌ها و پروموشن‌ها', hint: 'vendor discountها و readiness پروموشن', active: currentRoute === 'discounts' },
        { key: 'wallet', label: 'کیف پول و تسویه', hint: 'خلاصه کیف پول و صف تسویه‌ها', active: currentRoute === 'wallet' },
        { key: 'support', label: 'پشتیبانی', hint: 'خلاصه تیکت‌ها و پیگیری‌ها', active: currentRoute === 'support' },
      ],
    },
    {
      title: 'سلامت و ارتباط',
      items: [
        { key: 'reviews', label: 'کیفیت و سلامت', hint: 'امتیازها، health score و policy note', active: currentRoute === 'reviews' },
        { key: 'notifications', label: 'اعلان‌ها', hint: 'اعلان‌های فروشنده و timeline policy', active: currentRoute === 'notifications' },
      ],
    },
  ]
}

function getPageMeta(route: VendorRoute) {
  switch (route) {
    case 'orders':
      return { eyebrow: 'کارتابل سفارش‌ها', title: 'سفارش‌های فروشگاه', description: 'فروشنده از اینجا باید بتواند سفارش‌های خودش را روی داده واقعی backend ببیند و برای اقدام‌های بعدی آماده باشد.' }
    case 'order-workspace':
      return { eyebrow: 'میزکار سفارش', title: 'رسیدگی متمرکز به یک سفارش', description: 'همه dependencyها و actionهای مرتبط با یک سفارش در این workspace جدا جمع می‌شوند تا کاربر بدون اسکرول اضافه روی همان سفارش متمرکز بماند.' }
    case 'wallet':
      return { eyebrow: 'کارتابل مالی', title: 'کیف پول، جریان پول و تسویه‌ها', description: 'این route با خلاصه کیف پول و خلاصه تسویه‌ها پر می‌شود تا وضعیت مالی فروشگاه شفاف و قابل‌پیگیری باشد.' }
    case 'products':
      return { eyebrow: 'کارتابل محصولات', title: 'محصول‌ها، موجودی و readiness فروشگاه', description: 'این route برای دید سریع روی موجودی، دسته‌ها و محصول‌های نیازمند تامین یا promotion ساخته شده است.' }
    case 'store':
      return { eyebrow: 'پروفایل فروشگاه', title: 'هویت فروشگاه، تنظیمات ارسال و کیفیت پروفایل', description: 'این route برای مدیریت کامل هویت فروشگاه، تنظیمات delivery و readiness داده‌های profile ساخته شده است.' }
    case 'discounts':
      return { eyebrow: 'کارتابل تخفیف‌ها', title: 'تخفیف‌ها، وضعیت فعال‌سازی و readiness پروموشن', description: 'این route برای دید سریع روی vendor discountها و محصول‌های دارای تخفیف ساخته شده و پایه domain بعدی promotion است.' }
    case 'support':
      return { eyebrow: 'کارتابل پشتیبانی', title: 'تیکت‌ها و پیگیری‌های مرتبط با فروشگاه', description: 'فروشنده باید با کمترین اصطکاک بداند چه تیکتی باز است و چه چیزی نیازمند پاسخ یا اقدام است.' }
    case 'reviews':
      return { eyebrow: 'کارتابل سلامت', title: 'کیفیت فروشگاه، امتیازها و policy موثر', description: 'health score و محدودیت‌های موثر باید برای فروشنده روشن، انسانی و قابل‌اقدام باشند.' }
    case 'notifications':
      return { eyebrow: 'کارتابل اعلان‌ها', title: 'اعلان‌ها و timeline policy', description: 'این صفحه تاریخچه اعلان‌های فروشنده و timeline رخدادهایی را که روی وضعیت فروشگاه اثر می‌گذارند جمع می‌کند.' }
    case 'overview':
    default:
      return { eyebrow: 'زیربنای فروشنده', title: 'پنل فروشنده حالا به summaryهای واقعی backend متصل است', description: 'از اینجا به بعد فروشنده یک mock dashboard نمی‌بیند؛ بلکه داده واقعی سفارش، پول، سلامت و policy فروشگاهش را می‌بیند.' }
  }
}

function renderRoute(
  route: VendorRoute,
  session: AuthSession,
  onNavigate: (route: VendorRoute) => void,
  selectedOrder: Record<string, unknown> | null,
  onSelectOrder: (order: Record<string, unknown> | null) => void,
) {
  switch (route) {
    case 'orders':
      return <OrdersPage session={session} onNavigate={onNavigate} onSelectOrder={onSelectOrder} />
    case 'order-workspace':
      return <OrderWorkspacePage session={session} order={selectedOrder} onNavigate={onNavigate} onBack={() => onNavigate('orders')} />
    case 'products': return <ProductsPage session={session} />
    case 'store': return <StoreProfilePage session={session} />
    case 'discounts': return <DiscountsPage session={session} />
    case 'wallet': return <WalletPage session={session} />
    case 'support': return <SupportPage session={session} />
    case 'reviews': return <ReviewsPage session={session} />
    case 'notifications': return <NotificationsPage session={session} />
    case 'overview':
    default:
      return <OverviewPage session={session} />
  }
}

function resolveAccessState(session: AuthSession): VendorAccessState {
  const isStoreVerified = session.bootstrap?.store?.isVerified === true
  if (isStoreVerified) return 'active'
  return 'pending'
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [route, setRoute] = useState<VendorRoute>(defaultRoute)
  const [selectedOrder, setSelectedOrder] = useState<Record<string, unknown> | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null)
  const [otpCountdown, setOtpCountdown] = useState<string | null>(null)
  const [accessState, setAccessState] = useState<VendorAccessState>('pending')

  async function refreshSessionBootstrap(baseSession?: AuthSession) {
    const currentSession = baseSession ?? session
    if (!currentSession) return

    const response = await vendorApi.getSessionBootstrap(currentSession)
    const nextSession: AuthSession = {
      ...currentSession,
      bootstrap: response,
      user: {
        ...currentSession.user,
        roles: response.roles ?? currentSession.user.roles,
      },
    }

    saveSession(nextSession)
    setSession(nextSession)
    setAccessState(resolveAccessState(nextSession))
    return nextSession
  }

  useEffect(() => {
    setSession(loadSession())
  }, [])

  useEffect(() => {
    if (!session) return
    setAccessState(resolveAccessState(session))
  }, [session])

  useEffect(() => {
    if (accessState === 'active') {
      setRoute(defaultRoute)
    }
  }, [accessState])

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
    return () => window.clearInterval(intervalId)
  }, [otpExpiresAt])

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
      const response = await vendorApi.sendOtp(phoneNumber.trim())
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
      const response = await vendorApi.verifyOtp(phoneNumber.trim(), code.trim())
      const nextSession: AuthSession = { accessToken: response.access_token, user: response.user }
      saveSession(nextSession)
      setSession(nextSession)
      setRoute(defaultRoute)
      setCode('')
      setOtpExpiresAt(null)
      setOtpCountdown(null)
      setMessage('ورود موفق بود.')
      void refreshSessionBootstrap(nextSession)
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
    setAccessState('pending')
  }

  useEffect(() => {
    if (!session) return

    let active = true

    async function loadBootstrap() {
      try {
        const currentSession = session
        const response = await vendorApi.getSessionBootstrap(currentSession)
        if (!active) return

        const nextSession: AuthSession = {
          ...currentSession,
          bootstrap: response,
          user: {
            ...currentSession.user,
            roles: response.roles ?? currentSession.user.roles,
          },
        }

        saveSession(nextSession)
        setSession(nextSession)
        setAccessState(resolveAccessState(nextSession))
      } catch {
        if (!active) return
        setAccessState(resolveAccessState(currentSession))
      }
    }

    void loadBootstrap()
    return () => {
      active = false
    }
  }, [session?.accessToken])

  if (!session) {
    return (
      <LoginPage
        phoneNumber={phoneNumber}
        code={code}
        loading={loading}
        message={message}
        error={error}
        otpCountdown={otpCountdown}
        onPhoneChange={setPhoneNumber}
        onCodeChange={setCode}
        onSendOtp={handleSendOtp}
        onVerifyOtp={handleVerifyOtp}
      />
    )
  }

  if (accessState === 'pending') {
    return <VendorOnboardingPage onRefreshSession={refreshSessionBootstrap} session={session} />
  }

  return (
    <AppShell
      tone="vendor"
      productName="کارتابل فروشنده"
      productSubtitle="عملیات و رشد فروشگاه"
      workspaceLabel="پنل فروشنده"
      userName={session.user.fullName || session.user.phoneNumber}
      userRole={session.user.roles.join(' / ') || 'کاربر فروشنده'}
      pageEyebrow={pageMeta.eyebrow}
      pageTitle={pageMeta.title}
      pageDescription={pageMeta.description}
      navSections={buildNav(route)}
      onNavigate={(next) => setRoute(next as VendorRoute)}
      actions={[
        { label: vendorRouteLabels[route], tone: 'ghost' },
        { label: 'نشست فعال', tone: 'ghost' },
        { label: 'متصل به بک‌اند فروشنده', tone: 'primary' },
      ]}
    >
      <div className="vendor-toolbar-note">
        <Pill tone="success">OTP + JWT</Pill>
        <Pill tone="warning">خلاصه‌های فروشنده فعال</Pill>
        <Pill>{session.user.phoneNumber}</Pill>
        <button className="vendor-logout" onClick={handleLogout} type="button">خروج از پنل</button>
      </div>
      {renderRoute(route, session, setRoute, selectedOrder, setSelectedOrder)}
    </AppShell>
  )
}

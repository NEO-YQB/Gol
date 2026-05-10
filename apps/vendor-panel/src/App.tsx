import { AppShell, Pill, type NavSection } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { clearSession, loadSession, saveSession, type AuthSession } from './lib/session'
import { vendorApi } from './lib/api'
import { vendorRouteLabels, type VendorRoute } from './lib/routes'
import { LoginPage } from './pages/LoginPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { OrdersPage } from './pages/OrdersPage'
import { OverviewPage } from './pages/OverviewPage'
import { ReviewsPage } from './pages/ReviewsPage'
import { SupportPage } from './pages/SupportPage'
import { WalletPage } from './pages/WalletPage'

const defaultRoute: VendorRoute = 'overview'

function buildNav(currentRoute: VendorRoute): NavSection[] {
  return [
    {
      title: 'فروشگاه',
      items: [
        { key: 'overview', label: 'نمای کلی', hint: 'خلاصه فروشگاه و restrictionها', active: currentRoute === 'overview' },
        { key: 'orders', label: 'سفارش‌ها', hint: 'سفارش‌های فروشگاه از backend', active: currentRoute === 'orders' },
        { key: 'wallet', label: 'کیف پول و تسویه', hint: 'wallet summary و settlements', active: currentRoute === 'wallet' },
        { key: 'support', label: 'پشتیبانی', hint: 'ticket summary و follow-up', active: currentRoute === 'support' },
      ],
    },
    {
      title: 'سلامت و ارتباط',
      items: [
        { key: 'reviews', label: 'کیفیت و سلامت', hint: 'rating, health score, policy note', active: currentRoute === 'reviews' },
        { key: 'notifications', label: 'اعلان‌ها', hint: 'vendor notifications و policy timeline', active: currentRoute === 'notifications' },
      ],
    },
  ]
}

function getPageMeta(route: VendorRoute) {
  switch (route) {
    case 'orders':
      return {
        eyebrow: 'Vendor orders',
        title: 'سفارش‌های فروشگاه',
        description: 'فروشنده از اینجا باید بتواند سفارش‌های خودش را روی داده واقعی backend ببیند و برای actionهای بعدی آماده باشد.',
      }
    case 'wallet':
      return {
        eyebrow: 'Wallet & settlement',
        title: 'کیف پول، جریان پول و تسویه‌ها',
        description: 'این route با wallet summary و settlement summary پر می‌شود تا وضعیت مالی فروشگاه شفاف و قابل‌پیگیری باشد.',
      }
    case 'support':
      return {
        eyebrow: 'Vendor support',
        title: 'تیکت‌ها و پیگیری‌های مرتبط با فروشگاه',
        description: 'فروشنده باید با کمترین اصطکاک بداند چه تیکتی باز است و چه چیزی نیازمند پاسخ یا اقدام است.',
      }
    case 'reviews':
      return {
        eyebrow: 'Health & quality',
        title: 'کیفیت فروشگاه، امتیازها و policy موثر',
        description: 'health score و restrictionهای موثر باید برای فروشنده روشن، انسانی و قابل‌اقدام باشند.',
      }
    case 'notifications':
      return {
        eyebrow: 'Notifications',
        title: 'اعلان‌ها و timeline policy',
        description: 'این صفحه تاریخچه notificationهای فروشنده و timeline eventهایی که روی وضعیت فروشگاه اثر می‌گذارند را جمع می‌کند.',
      }
    case 'overview':
    default:
      return {
        eyebrow: 'Vendor workspace',
        title: 'پنل فروشنده حالا به summaryهای واقعی backend متصل است',
        description: 'از اینجا به بعد فروشنده یک mock dashboard نمی‌بیند؛ بلکه داده واقعی سفارش، پول، سلامت و policy فروشگاهش را می‌بیند.',
      }
  }
}

function renderRoute(route: VendorRoute, session: AuthSession) {
  switch (route) {
    case 'orders':
      return <OrdersPage session={session} />
    case 'wallet':
      return <WalletPage session={session} />
    case 'support':
      return <SupportPage session={session} />
    case 'reviews':
      return <ReviewsPage session={session} />
    case 'notifications':
      return <NotificationsPage session={session} />
    case 'overview':
    default:
      return <OverviewPage session={session} />
  }
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [route, setRoute] = useState<VendorRoute>(defaultRoute)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null)
  const [otpCountdown, setOtpCountdown] = useState<string | null>(null)

  useEffect(() => {
    setSession(loadSession())
  }, [])

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
      const nextSession: AuthSession = {
        accessToken: response.access_token,
        user: response.user,
      }
      saveSession(nextSession)
      setSession(nextSession)
      setRoute(defaultRoute)
      setCode('')
      setOtpExpiresAt(null)
      setOtpCountdown(null)
      setMessage('ورود موفق بود.')
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

  return (
    <AppShell
      tone="vendor"
      productName="Vendor Workspace"
      productSubtitle="Store Operations & Growth"
      workspaceLabel="Vendor panel"
      userName={session.user.fullName || session.user.phoneNumber}
      userRole={session.user.roles.join(' / ') || 'Vendor user'}
      pageEyebrow={pageMeta.eyebrow}
      pageTitle={pageMeta.title}
      pageDescription={pageMeta.description}
      navSections={buildNav(route)}
      onNavigate={(next) => setRoute(next as VendorRoute)}
      actions={[
        { label: vendorRouteLabels[route], tone: 'ghost' },
        { label: 'Session active', tone: 'secondary' },
        { label: 'Vendor backend connected', tone: 'primary' },
      ]}
    >
      <div className="vendor-toolbar-note">
        <Pill tone="success">OTP + JWT</Pill>
        <Pill tone="warning">vendor summaries active</Pill>
        <Pill>{session.user.phoneNumber}</Pill>
        <button className="vendor-logout" onClick={handleLogout} type="button">
          خروج از پنل
        </button>
      </div>
      {renderRoute(route, session)}
    </AppShell>
  )
}

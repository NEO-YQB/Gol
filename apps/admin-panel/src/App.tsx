import {
  AppShell,
  Pill,
  type NavSection,
} from '@frontend-core'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { adminApi } from './lib/api'
import { adminRouteLabels, type AdminRoute } from './lib/routes'
import { clearSession, loadSession, saveSession, type AuthSession } from './lib/session'
import { AlertsPage } from './pages/AlertsPage'
import { ContentPage } from './pages/ContentPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { OrdersPage } from './pages/OrdersPage'
import { SettlementsPage } from './pages/SettlementsPage'
import { SupportPage } from './pages/SupportPage'

const defaultRoute: AdminRoute = 'dashboard'

function buildNav(currentRoute: AdminRoute): NavSection[] {
  return [
    {
      title: 'عملیات اصلی',
      items: [
        { key: 'dashboard', label: 'داشبورد', hint: 'وضعیت کلی عملیات', active: currentRoute === 'dashboard' },
        { key: 'orders', label: 'سفارش‌ها', hint: 'orders/admin و exception flow', active: currentRoute === 'orders' },
        { key: 'settlements', label: 'تسویه و مالی', hint: 'wallets, reports, settlement exceptions', active: currentRoute === 'settlements' },
        { key: 'support', label: 'پشتیبانی', hint: 'tickets و follow-ups', active: currentRoute === 'support' },
      ],
    },
    {
      title: 'رشد و کنترل',
      items: [
        { key: 'content', label: 'محتوا و SEO', hint: 'articles, tags, audits', active: currentRoute === 'content' },
        { key: 'alerts', label: 'هشدارها و اعلان‌ها', hint: 'alerts + notification ops', active: currentRoute === 'alerts' },
      ],
    },
  ]
}

function getPageMeta(route: AdminRoute) {
  switch (route) {
    case 'orders':
      return {
        eyebrow: 'Orders workspace',
        title: 'سفارش‌ها و exception flow',
        description: 'این صفحه پایه table-first برای list سفارش‌ها، queueهای مسئله‌دار و detail workspace بعدی را از endpointهای واقعی backend می‌گیرد.',
      }
    case 'settlements':
      return {
        eyebrow: 'Finance workspace',
        title: 'تسویه، کیف پول و دید مالی',
        description: 'wallet visibility، settlement exceptions و report summaryها از همین‌جا به صفحه‌های عملیاتی کامل‌تر تبدیل می‌شوند.',
      }
    case 'support':
      return {
        eyebrow: 'Support workspace',
        title: 'تیکت‌ها و پیگیری‌های پشتیبانی',
        description: 'این route برای list, note, finance decision و support timeline design شده و به endpointهای فعال backend تکیه دارد.',
      }
    case 'content':
      return {
        eyebrow: 'Content workspace',
        title: 'محتوا، taxonomy و SEO operations',
        description: 'سطح اولیه routeهای content بر پایه article/category/tag/audit endpointهای backend ساخته شده تا بعدا editorial tooling روی آن سوار شود.',
      }
    case 'alerts':
      return {
        eyebrow: 'Operations feed',
        title: 'هشدارها، outbox و visibility عملیاتی',
        description: 'alert lifecycle و notification ops باید در پنل ادمین سریع، واضح و drill-down-friendly باشند؛ این route شروع همان مسیر است.',
      }
    case 'dashboard':
    default:
      return {
        eyebrow: 'Admin foundation',
        title: 'داشبورد ادمین روی session و endpointهای واقعی سوار شد',
        description: 'از اینجا به بعد ساخت فرانت دیگر صرفا visual نیست؛ session، page boundary و data fetching contracts برای backend موجود تعریف شده‌اند.',
      }
  }
}

function renderRoute(route: AdminRoute, session: AuthSession) {
  switch (route) {
    case 'orders':
      return <OrdersPage session={session} />
    case 'settlements':
      return <SettlementsPage session={session} />
    case 'support':
      return <SupportPage session={session} />
    case 'content':
      return <ContentPage session={session} />
    case 'alerts':
      return <AlertsPage session={session} />
    case 'dashboard':
    default:
      return <DashboardPage session={session} />
  }
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [route, setRoute] = useState<AdminRoute>(defaultRoute)
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

    return () => {
      window.clearInterval(intervalId)
    }
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
      setRoute(defaultRoute)
      setCode('')
      setOtpExpiresAt(null)
      setOtpCountdown(null)
      setMessage('ورود موفق بود و session ذخیره شد.')
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
        code={code}
        error={error}
        loading={loading}
        message={message}
        otpCountdown={otpCountdown}
        onCodeChange={setCode}
        onPhoneChange={setPhoneNumber}
        onSendOtp={handleSendOtp}
        onVerifyOtp={handleVerifyOtp}
        phoneNumber={phoneNumber}
      />
    )
  }

  return (
    <AppShell
      tone="admin"
      productName="Admin Control Center"
      productSubtitle="Flower Marketplace Operations"
      workspaceLabel="Admin panel"
      userName={session.user.fullName || session.user.phoneNumber}
      userRole={session.user.roles.join(' / ') || 'Authenticated user'}
      pageEyebrow={pageMeta.eyebrow}
      pageTitle={pageMeta.title}
      pageDescription={pageMeta.description}
      navSections={buildNav(route)}
      onNavigate={(next) => setRoute(next as AdminRoute)}
      actions={[
        { label: adminRouteLabels[route], tone: 'ghost' },
        { label: 'Session active', tone: 'secondary' },
        { label: 'Backend-connected foundation', tone: 'primary' },
      ]}
    >
      <div className="admin-toolbar-note">
        <Pill tone="success">OTP + JWT</Pill>
        <Pill tone="warning">route contracts active</Pill>
        <Pill>{session.user.phoneNumber}</Pill>
        <button className="admin-logout" onClick={handleLogout} type="button">
          خروج از پنل
        </button>
      </div>
      {renderRoute(route, session)}
    </AppShell>
  )
}

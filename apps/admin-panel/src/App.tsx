import {
  AppShell,
  Pill,
  type NavSection,
} from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { adminApi } from './lib/api'
import { adminRouteLabels, type AdminRoute } from './lib/routes'
import { clearSession, loadSession, saveSession, type AuthSession } from './lib/session'
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

function buildNav(currentRoute: AdminRoute): NavSection[] {
  return [
    {
      title: 'عملیات اصلی',
      items: [
        { key: 'dashboard', label: 'داشبورد', hint: 'وضعیت کلی عملیات', active: currentRoute === 'dashboard' },
        { key: 'orders', label: 'سفارش‌ها', hint: 'صف سفارش‌ها و استثناهای عملیاتی', active: currentRoute === 'orders' || currentRoute === 'ordersWorkspace' },
        { key: 'settlements', label: 'تسویه و مالی', hint: 'کیف پول‌ها، گزارش‌ها و استثناهای تسویه', active: currentRoute === 'settlements' },
        { key: 'support', label: 'پشتیبانی', hint: 'تیکت‌ها و پیگیری‌های بعدی', active: currentRoute === 'support' },
        { key: 'vendors', label: 'فروشنده‌ها و ریسک', hint: 'ریسک، policy timeline و finance reports', active: currentRoute === 'vendors' },
      ],
    },
    {
      title: 'رشد و کنترل',
      items: [
        { key: 'content', label: 'محتوا و سئو', hint: 'مقاله‌ها، taxonomy و auditها', active: currentRoute === 'content' || currentRoute === 'contentWorkspace' },
        { key: 'alerts', label: 'هشدارها و اعلان‌ها', hint: 'هشدارهای عملیاتی و outbox', active: currentRoute === 'alerts' },
      ],
    },
  ]
}

function getPageMeta(route: AdminRoute) {
  switch (route) {
    case 'orders':
      return {
        eyebrow: 'کارتابل سفارش‌ها',
        title: 'سفارش‌ها و صف استثناهای عملیاتی',
        description: 'این صفحه پایه table-first برای فهرست سفارش‌ها، صف موارد مسئله‌دار و ورود به میزکار جزئیات را از endpointهای واقعی backend می‌گیرد.',
      }
    case 'settlements':
      return {
        eyebrow: 'کارتابل مالی',
        title: 'تسویه، کیف پول و دید مالی',
        description: 'دید کیف پول، استثناهای تسویه و summaryهای گزارش از همین‌جا به صفحه‌های عملیاتی کامل‌تر تبدیل می‌شوند.',
      }
    case 'ordersWorkspace':
      return {
        eyebrow: 'میزکار سفارش',
        title: 'رسیدگی متمرکز به سفارش، پرداخت و استثناهای عملیاتی',
        description: 'جریان عملیاتی سفارش از list page جدا شده تا پذیرش، ارسال، تحویل، پرداخت و آزادسازی تسویه در یک surface متمرکز انجام شوند.',
      }
    case 'support':
      return {
        eyebrow: 'کارتابل پشتیبانی',
        title: 'تیکت‌ها و پیگیری‌های پشتیبانی',
        description: 'این route برای فهرست، note، تصمیم مالی و timeline پشتیبانی طراحی شده و به endpointهای فعال backend تکیه دارد.',
      }
    case 'supportWorkspace':
      return {
        eyebrow: 'workspace پشتیبانی',
        title: 'رسیدگی متمرکز به تیکت و تصمیم‌های عملیاتی',
        description: 'تغییر وضعیت، noteهای داخلی و تصمیم مالی باید در یک route متمرکز و قابل‌ردیابی انجام شوند.',
      }
    case 'vendors':
      return {
        eyebrow: 'کارتابل فروشنده‌ها',
        title: 'فروشنده‌ها، ریسک و گزارش‌های مالی',
        description: 'این route فروشنده‌های اولویت‌دار، policy timeline و خلاصه گزارش‌های مالی را برای تصمیم‌گیری سریع ادمین کنار هم قرار می‌دهد.',
      }
    case 'vendorWorkspace':
      return {
        eyebrow: 'workspace فروشنده',
        title: 'بررسی متمرکز فروشنده و تصمیم‌های بعدی',
        description: 'اقدام‌های سنگین مثل کنترل کیف پول، بررسی policy و release/hold باید در یک route متمرکز انجام شوند، نه داخل list page.',
      }
    case 'content':
      return {
        eyebrow: 'کارتابل محتوا',
        title: 'محتوا، تاکسونومی و عملیات سئو',
        description: 'سطح اولیه routeهای content بر پایه endpointهای مقاله، category، tag و audit ساخته شده تا بعدا ابزارهای تحریریه روی آن سوار شوند.',
      }
    case 'contentWorkspace':
      return {
        eyebrow: 'ویرایشگر محتوایی',
        title: 'workspace متمرکز نگارش، سئو و تاکسونومی',
        description: 'ساخت و ویرایش مقاله باید در یک surface بزرگ، متمرکز و production-minded انجام شود؛ نه در کنار table فشرده.',
      }
    case 'alerts':
      return {
        eyebrow: 'کارتابل هشدارها',
        title: 'هشدارها، outbox و دید عملیاتی',
        description: 'alert lifecycle و notification ops باید در پنل ادمین سریع، واضح و drill-down-friendly باشند؛ این route شروع همان مسیر است.',
      }
    case 'dashboard':
    default:
      return {
        eyebrow: 'زیربنای ادمین',
        title: 'داشبورد ادمین روی session و endpointهای واقعی سوار شد',
        description: 'از اینجا به بعد ساخت فرانت دیگر صرفا visual نیست؛ session، page boundary و data fetching contractهای backend موجود تعریف شده‌اند.',
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
  },
) {
  switch (route) {
    case 'orders':
      return <OrdersPage onOpenOrdersWorkspace={options.onOpenOrdersWorkspace} session={session} />
    case 'ordersWorkspace':
      return (
        <OrdersWorkspacePage
          onBack={options.onBackToOrders}
          order={options.ordersWorkspaceOrder}
          session={session}
        />
      )
    case 'settlements':
      return <SettlementsPage session={session} />
    case 'support':
      return <SupportPage onOpenSupportWorkspace={options.onOpenSupportWorkspace} session={session} />
    case 'supportWorkspace':
      return (
        <SupportWorkspacePage
          onBack={options.onBackToSupport}
          session={session}
          ticket={options.supportWorkspaceTicket}
        />
      )
    case 'vendors':
      return <VendorsPage onOpenVendorWorkspace={options.onOpenVendorWorkspace} session={session} />
    case 'vendorWorkspace':
      return (
        <VendorWorkspacePage
          onBack={options.onBackToVendors}
          session={session}
          store={options.vendorWorkspaceStore}
        />
      )
    case 'content':
      return (
        <ContentPage
          onCreateArticle={options.onOpenContentWorkspaceForCreate}
          onEditArticle={options.onOpenContentWorkspaceForEdit}
          session={session}
        />
      )
    case 'contentWorkspace':
      return (
        <ContentWorkspacePage
          articleId={options.contentWorkspaceArticleId}
          mode={options.contentWorkspaceMode}
          onBack={options.onBackToContent}
          session={session}
        />
      )
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
  const [ordersWorkspaceOrder, setOrdersWorkspaceOrder] = useState<Record<string, unknown> | null>(null)
  const [supportWorkspaceTicket, setSupportWorkspaceTicket] = useState<Record<string, unknown> | null>(null)
  const [vendorWorkspaceStore, setVendorWorkspaceStore] = useState<Record<string, unknown> | null>(null)
  const [contentWorkspaceArticleId, setContentWorkspaceArticleId] = useState<string | null>(null)
  const [contentWorkspaceMode, setContentWorkspaceMode] = useState<'create' | 'edit'>('create')
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

  function handleOpenOrdersWorkspace(order: Record<string, unknown>) {
    setOrdersWorkspaceOrder(order)
    setRoute('ordersWorkspace')
  }

  function handleBackToOrders() {
    setRoute('orders')
  }

  function handleOpenVendorWorkspace(store: Record<string, unknown>) {
    setVendorWorkspaceStore(store)
    setRoute('vendorWorkspace')
  }

  function handleOpenSupportWorkspace(ticket: Record<string, unknown>) {
    setSupportWorkspaceTicket(ticket)
    setRoute('supportWorkspace')
  }

  function handleBackToSupport() {
    setRoute('support')
  }

  function handleBackToVendors() {
    setRoute('vendors')
  }

  function handleOpenContentWorkspaceForCreate() {
    setContentWorkspaceMode('create')
    setContentWorkspaceArticleId(null)
    setRoute('contentWorkspace')
  }

  function handleOpenContentWorkspaceForEdit(articleId: string) {
    setContentWorkspaceMode('edit')
    setContentWorkspaceArticleId(articleId)
    setRoute('contentWorkspace')
  }

  function handleBackToContent() {
    setRoute('content')
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
      productName="مرکز کنترل ادمین"
      productSubtitle="عملیات بازار گل"
      workspaceLabel="پنل ادمین"
      userName={session.user.fullName || session.user.phoneNumber}
      userRole={session.user.roles.join(' / ') || 'کاربر احراز هویت شده'}
      pageEyebrow={pageMeta.eyebrow}
      pageTitle={pageMeta.title}
      pageDescription={pageMeta.description}
      navSections={buildNav(route)}
      onNavigate={(next) => setRoute(next as AdminRoute)}
      actions={[
        { label: adminRouteLabels[route], tone: 'ghost' },
        { label: 'نشست فعال', tone: 'secondary' },
        { label: 'متصل به بک‌اند', tone: 'primary' },
      ]}
    >
      <div className="admin-toolbar-note">
        <Pill tone="success">OTP + JWT</Pill>
        <Pill tone="warning">قرارداد routeها فعال</Pill>
        <Pill>{session.user.phoneNumber}</Pill>
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
      })}
    </AppShell>
  )
}

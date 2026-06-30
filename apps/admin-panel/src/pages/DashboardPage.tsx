import { SectionCard, Spotlight, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi, apiConfig } from '../lib/api'
import { makeFeed, toArray } from '../lib/normalize'
import { hasPermission, hasRole } from '../lib/permissions'
import type { AuthSession } from '../lib/session'

type DashboardPayload = {
  stats: Array<{
    label: string
    value: string
    delta: string
    detail: string
    tone: 'primary' | 'success' | 'warning' | 'danger'
  }>
  feed: Array<{
    id: string
    title: string
    meta: string
    description: string
    tone?: 'primary' | 'success' | 'warning' | 'danger'
  }>
  spotlight: {
    eyebrow: string
    title: string
    description: string
    metrics: Array<{ label: string; value: string }>
  }
}

function countOf(value: unknown) {
  return toArray(value).length
}

function isSeoSession(session: AuthSession) {
  return hasRole(session, 'SEO_MANAGER') || hasRole(session, 'CONTENT_EDITOR') || hasRole(session, 'CONTENT_WRITER')
}

function isFinanceSession(session: AuthSession) {
  return hasRole(session, 'FINANCE_OPERATOR') || hasPermission(session, 'read', 'StoreWallet')
}

function isSupportSession(session: AuthSession) {
  return hasRole(session, 'SUPPORT_AGENT') || hasPermission(session, 'read', 'SupportTicket')
}

function isAccessSession(session: AuthSession) {
  return hasRole(session, 'ACCESS_MANAGER') || hasPermission(session, 'read', 'AdminUser')
}

async function buildDashboardPayload(session: AuthSession): Promise<DashboardPayload> {
  if (hasPermission(session, 'manage', 'all')) {
    const [orders, alerts, tickets, notifications] = await Promise.all([
      adminApi.getAdminOrders(session),
      adminApi.getAlerts(session),
      adminApi.getSupportTickets(session),
      adminApi.getNotifications(session),
    ])

    return {
      stats: [
        { label: 'سفارش های جاری', value: String(countOf(orders)), delta: 'عملیات امروز', detail: '', tone: 'primary' },
        { label: 'هشدارهای باز', value: String(countOf(alerts)), delta: 'نیازمند رسیدگی', detail: '', tone: 'danger' },
        { label: 'تیکت های فعال', value: String(countOf(tickets)), delta: 'در صف پشتیبانی', detail: '', tone: 'warning' },
        { label: 'اعلان های اخیر', value: String(countOf(notifications)), delta: 'لایه اطلاع رسانی', detail: '', tone: 'success' },
      ],
      feed: [...makeFeed(toArray(alerts), 'هشدار عملیاتی'), ...makeFeed(toArray(notifications), 'اعلان سیستمی')].slice(0, 6),
      spotlight: {
        eyebrow: 'نمای مدیر کل',
        title: 'نمای مدیر کل',
        description: '',
        metrics: [
          { label: 'API پایه', value: apiConfig.baseUrl },
          { label: 'کاربر فعلی', value: session.user.fullName || session.user.phoneNumber },
          { label: 'نقش های نشست', value: session.user.roles.join(' / ') || '—' },
          { label: 'سطح پنل', value: 'مدیر کل' },
        ],
      },
    }
  }

  if (isSeoSession(session)) {
    const [articles, audits, authors, categories] = await Promise.all([
      adminApi.getArticles(session, { page: 1, limit: 100 }),
      adminApi.getContentAudits(session),
      adminApi.getAuthors(session),
      adminApi.getArticleCategories(session),
    ])

    return {
      stats: [
        { label: 'مقاله های قابل مشاهده', value: String(countOf(articles)), delta: 'کارتابل محتوا', detail: '', tone: 'primary' },
        { label: 'یافته های پایش محتوا', value: String(countOf(audits)), delta: 'اولویت سئو', detail: '', tone: 'warning' },
        { label: 'نویسنده های فعال', value: String(countOf(authors)), delta: 'تیم محتوا', detail: '', tone: 'success' },
        { label: 'دسته بندی های محتوایی', value: String(countOf(categories)), delta: 'ساختار سایت', detail: '', tone: 'danger' },
      ],
      feed: [...makeFeed(toArray(audits), 'پایش محتوایی'), ...makeFeed(toArray(articles), 'مقاله')].slice(0, 6),
      spotlight: {
        eyebrow: 'نمای تیم محتوا و سئو',
        title: 'محتوا و سئو',
        description: '',
        metrics: [
          { label: 'مقاله', value: String(countOf(articles)) },
          { label: 'پایش', value: String(countOf(audits)) },
          { label: 'نویسنده', value: String(countOf(authors)) },
          { label: 'نشست', value: 'تحریریه / سئو' },
        ],
      },
    }
  }

  if (isFinanceSession(session)) {
    const [wallets, financeSummary, refunds] = await Promise.all([
      adminApi.getWallets(session),
      adminApi.getFinanceSummary(session),
      adminApi.getRefundSummary(session),
    ])

    return {
      stats: [
        { label: 'کیف پول های قابل مشاهده', value: String(countOf(wallets)), delta: 'لایه مالی', detail: '', tone: 'primary' },
        { label: 'خلاصه مالی', value: String(countOf(financeSummary)), delta: 'وضعیت تجمعی', detail: '', tone: 'success' },
        { label: 'بازگشت وجه / برگشت', value: String(countOf(refunds)), delta: 'پیگیری مالی', detail: '', tone: 'warning' },
        { label: 'دامنه این نقش', value: 'مالی', delta: 'نقش تخصصی', detail: '', tone: 'danger' },
      ],
      feed: [...makeFeed(toArray(wallets), 'کیف پول'), ...makeFeed(toArray(refunds), 'بازگشت وجه')].slice(0, 6),
      spotlight: {
        eyebrow: 'نمای اپراتور مالی',
        title: 'مالی و تسویه',
        description: '',
        metrics: [
          { label: 'کیف پول', value: String(countOf(wallets)) },
          { label: 'خلاصه مالی', value: String(countOf(financeSummary)) },
          { label: 'بازگشت', value: String(countOf(refunds)) },
          { label: 'نشست', value: 'مالی و تسویه' },
        ],
      },
    }
  }

  if (isSupportSession(session)) {
    const [tickets, followUps] = await Promise.all([
      adminApi.getSupportTickets(session),
      adminApi.getSupportFollowUps(session),
    ])

    return {
      stats: [
        { label: 'تیکت های قابل رسیدگی', value: String(countOf(tickets)), delta: 'صف اصلی', detail: '', tone: 'primary' },
        { label: 'پیگیری های باز', value: String(countOf(followUps)), delta: 'مورد فعال', detail: '', tone: 'warning' },
        { label: 'دامنه این نقش', value: 'پشتیبانی', delta: 'تمرکز عملیاتی', detail: '', tone: 'success' },
        { label: 'سطح پنل', value: 'هدفمند', delta: 'بدون شلوغی', detail: '', tone: 'danger' },
      ],
      feed: [...makeFeed(toArray(followUps), 'پیگیری پشتیبانی'), ...makeFeed(toArray(tickets), 'تیکت')].slice(0, 6),
      spotlight: {
        eyebrow: 'نمای اپراتور پشتیبانی',
        title: 'پشتیبانی',
        description: '',
        metrics: [
          { label: 'تیکت', value: String(countOf(tickets)) },
          { label: 'پیگیری', value: String(countOf(followUps)) },
          { label: 'کاربر فعلی', value: session.user.fullName || session.user.phoneNumber },
          { label: 'نشست', value: 'پشتیبانی' },
        ],
      },
    }
  }

  if (isAccessSession(session)) {
    const [users, roles, permissions] = await Promise.all([
      adminApi.getAccessControlUsers(session, { page: 1, limit: 12 }),
      adminApi.getAccessControlRoles(session),
      adminApi.getAccessControlPermissions(session, { page: 1, limit: 20 }),
    ])

    return {
      stats: [
        { label: 'کاربران قابل مدیریت', value: String(countOf((users as Record<string, unknown>)?.data)), delta: 'دامنه دسترسی', detail: '', tone: 'primary' },
        { label: 'نقش های ثبت شده', value: String(countOf(roles)), delta: 'ماتریس نقش', detail: '', tone: 'warning' },
        { label: 'دسترسی های مرجع', value: String(countOf((permissions as Record<string, unknown>)?.data)), delta: 'کاتالوگ پنل', detail: '', tone: 'success' },
        { label: 'سطح نشست', value: 'مدیریت دسترسی', delta: 'نقش تخصصی', detail: '', tone: 'danger' },
      ],
      feed: [...makeFeed(toArray((users as Record<string, unknown>)?.data), 'کاربر'), ...makeFeed(toArray(roles), 'نقش')].slice(0, 6),
      spotlight: {
        eyebrow: 'نمای مدیر دسترسی',
        title: 'کاربران و دسترسی',
        description: '',
        metrics: [
          { label: 'کاربر', value: String(countOf((users as Record<string, unknown>)?.data)) },
          { label: 'نقش', value: String(countOf(roles)) },
          { label: 'دسترسی', value: String(countOf((permissions as Record<string, unknown>)?.data)) },
          { label: 'نشست', value: 'مدیریت دسترسی' },
        ],
      },
    }
  }

  return {
    stats: [
      { label: 'نشست فعال', value: '1', delta: 'کاربر احراز شده', detail: '', tone: 'primary' },
      { label: 'نقش های نشست', value: String(session.user.roles.length), delta: 'نقش ثبت شده', detail: '', tone: 'warning' },
      { label: 'دسترسی های موثر', value: String(session.bootstrap?.effectivePermissions.length ?? 0), delta: 'bootstrap شده', detail: '', tone: 'success' },
      { label: 'وضعیت پنل', value: 'آماده', delta: 'قابل استفاده', detail: '', tone: 'danger' },
    ],
    feed: [],
      spotlight: {
        eyebrow: 'نشست محدود',
        title: 'نشست محدود',
        description: '',
        metrics: [
        { label: 'کاربر فعلی', value: session.user.fullName || session.user.phoneNumber },
        { label: 'نقش ها', value: session.user.roles.join(' / ') || '—' },
        { label: 'دسترسی موثر', value: String(session.bootstrap?.effectivePermissions.length ?? 0) },
        { label: 'API پایه', value: apiConfig.baseUrl },
      ],
    },
  }
}

export function DashboardPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<DashboardPayload | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const nextPayload = await buildDashboardPayload(session)
        if (!active) return
        setPayload(nextPayload)
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری داشبورد نقش محور')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [session])

  return (
    <div className="fm-stack role-dashboard-page">
      <LoadableState error={error} loading={loading}>
        <div className="fm-grid role-dashboard-grid">
          {(payload?.stats ?? []).map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>
      </LoadableState>

      {payload ? (
        <Spotlight
          eyebrow={payload.spotlight.eyebrow}
          title={payload.spotlight.title}
          description=""
          metrics={payload.spotlight.metrics}
        />
      ) : null}

      {payload?.feed?.length ? (
        <SectionCard eyebrow="رخدادها" title="فید مرتبط" description="">
          <div className="dashboard-feed-list">
            {payload.feed.map((item) => (
              <article className="dashboard-feed-item" key={item.id}>
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  )
}

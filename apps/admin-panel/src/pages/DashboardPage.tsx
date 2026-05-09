import { SectionCard, Spotlight, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi, apiConfig } from '../lib/api'
import { makeFeed, makeStats, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

export function DashboardPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState(() =>
    makeStats([
      { label: 'سفارش‌های ادمین', value: [], detail: 'لیست واقعی از `/orders/admin`', tone: 'primary' },
      { label: 'alertهای عملیاتی', value: [], detail: 'فید واقعی از `/admin/operations/alerts`', tone: 'danger' },
      { label: 'تیکت‌های پشتیبانی', value: [], detail: 'لیست واقعی از `/support/admin/tickets`', tone: 'warning' },
      { label: 'notification queue', value: [], detail: 'visibility از `/notifications/admin`', tone: 'success' },
    ]),
  )
  const [feed, setFeed] = useState(() => makeFeed([], 'backend event'))

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [orders, alerts, tickets, notifications] = await Promise.all([
          adminApi.getAdminOrders(session),
          adminApi.getAlerts(session),
          adminApi.getSupportTickets(session),
          adminApi.getNotifications(session),
        ])

        if (!active) return

        setStats(
          makeStats([
            { label: 'سفارش‌های ادمین', value: orders, detail: 'ورودی اصلی برای order operations', tone: 'primary' },
            { label: 'alertهای عملیاتی', value: alerts, detail: 'acknowledge / resolve / reopen readiness', tone: 'danger' },
            { label: 'تیکت‌های پشتیبانی', value: tickets, detail: 'follow-up و finance decision surfaces', tone: 'warning' },
            { label: 'notification queue', value: notifications, detail: 'dispatch و delivery visibility', tone: 'success' },
          ]),
        )

        setFeed([
          ...makeFeed(toArray(alerts), 'alert'),
          ...makeFeed(toArray(notifications), 'notification'),
        ].slice(0, 6))
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری dashboard')
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
    <div className="fm-stack">
      <LoadableState error={error} loading={loading}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>
      </LoadableState>

      <Spotlight
        eyebrow="Backend handshake"
        title="داشبورد ادمین حالا برای اتصال به endpointهای واقعی backend آماده شده است"
        description="در این مرحله dashboard دیگر فقط mock visual نیست؛ ساختار آن با endpointهای orders, alerts, support و notifications سیم‌کشی شده تا از همین‌جا routing و page contracts روی داده واقعی شکل بگیرند."
        metrics={[
          { label: 'API base', value: apiConfig.baseUrl },
          { label: 'current user', value: session.user.fullName || session.user.phoneNumber },
          { label: 'roles', value: session.user.roles.join(', ') || '—' },
          { label: 'session', value: 'active' },
        ]}
      />

      <SectionCard
        eyebrow="Operational notes"
        title="چیزی که همین حالا تثبیت شده"
        description="shell, session, data fetch contract و page boundaryها از اینجا به بعد مبنای اجرای routeهای واقعی می‌شوند."
      >
        <div className="dashboard-feed-list">
          {feed.length ? (
            feed.map((item) => (
              <article className="dashboard-feed-item" key={item.id}>
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
                <p>{item.description}</p>
              </article>
            ))
          ) : (
            <div className="fm-message">هنوز رویدادی از backend برنگشته است.</div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

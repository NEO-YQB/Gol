import { ActivityFeed, DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi } from '../lib/api'
import { formatFaNumber, makeFeed, makeRows, makeStats, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type NotificationRecord = Record<string, unknown>

const notificationColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'topic', label: 'موضوع' },
  { key: 'status', label: 'وضعیت' },
  { key: 'channel', label: 'کانال' },
  { key: 'updatedAt', label: 'زمان' },
]

function getNotificationStatus(record: NotificationRecord) {
  return readText(record, ['status'], 'UNKNOWN')
}

function getNotificationTopic(record: NotificationRecord) {
  return readText(record, ['topic', 'title'], '—')
}

function getNotificationChannel(record: NotificationRecord) {
  return readText(record, ['channel', 'targetChannel'], '—')
}

function statusOptions(items: NotificationRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getNotificationStatus(item))))
  return ['ALL', ...unique]
}

export function NotificationsPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [timeline, setTimeline] = useState<NotificationRecord[]>([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [notifications, timeline] = await Promise.all([
          vendorApi.getNotifications(session),
          vendorApi.getPolicyTimeline(session),
        ])
        if (!active) return

        const notificationList = toArray(notifications)
        const timelineList = toArray(timeline)
        setNotifications(notificationList)
        setTimeline(timelineList)
        if (notificationList.length > 0) {
          setSelectedNotificationId(readText(notificationList[0], ['id'], ''))
        }
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری اعلان‌ها و timeline فروشنده')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [session])

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((item) =>
        statusFilter === 'ALL' ? true : getNotificationStatus(item) === statusFilter,
      ),
    [notifications, statusFilter],
  )

  useEffect(() => {
    if (filteredNotifications.length === 0) {
      setSelectedNotificationId(null)
      return
    }

    const hasSelected = filteredNotifications.some((item) => readText(item, ['id'], '') === selectedNotificationId)
    if (!hasSelected) {
      setSelectedNotificationId(readText(filteredNotifications[0], ['id'], ''))
    }
  }, [filteredNotifications, selectedNotificationId])

  const rows = useMemo(
    () =>
      makeRows(filteredNotifications.slice(0, 12), [
        { key: 'id', source: ['id'] },
        { key: 'topic', source: ['topic', 'title'] },
        { key: 'status', source: ['status'] },
        { key: 'channel', source: ['channel', 'targetChannel'] },
        { key: 'updatedAt', source: ['updatedAt', 'sentAt'] },
      ]),
    [filteredNotifications],
  )

  const feed = useMemo(() => makeFeed(timeline, 'policy timeline'), [timeline])

  const stats = useMemo(
    () =>
      makeStats([
        {
          label: 'کل اعلان‌ها',
          value: formatFaNumber(notifications.length),
          delta: `${formatFaNumber(filteredNotifications.length)} در view فعلی`,
          detail: 'تاریخچه اعلان‌های فروشنده',
          tone: 'primary',
        },
        {
          label: 'وضعیت‌های فعال',
          value: formatFaNumber(statusOptions(notifications).length - 1),
          delta: statusFilter === 'ALL' ? 'همه وضعیت‌ها' : statusFilter,
          detail: 'برای اسکن سریع وضعیت‌ها',
          tone: 'warning',
        },
        {
          label: 'رویدادهای timeline',
          value: formatFaNumber(timeline.length),
          delta: 'دید policy',
          detail: 'رخدادهای موثر روی وضعیت فروشگاه',
          tone: 'success',
        },
      ]),
    [filteredNotifications.length, notifications, statusFilter, timeline.length],
  )

  const selectedNotification = useMemo(
    () => filteredNotifications.find((item) => readText(item, ['id'], '') === selectedNotificationId) ?? null,
    [filteredNotifications, selectedNotificationId],
  )

  const selectedSummary = selectedNotification
    ? [
        { label: 'شناسه', value: readText(selectedNotification, ['id'], '—') },
        { label: 'موضوع', value: getNotificationTopic(selectedNotification) },
        { label: 'وضعیت', value: getNotificationStatus(selectedNotification) },
        { label: 'کانال', value: getNotificationChannel(selectedNotification) },
        { label: 'زمان', value: readText(selectedNotification, ['updatedAt', 'sentAt', 'createdAt'], '—') },
        { label: 'پیام', value: readText(selectedNotification, ['message', 'description', 'note'], '—') },
      ]
    : []

  return (
    <div className="fm-stack">
      <LoadableState loading={loading} error={error}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="کارتابل اعلان‌ها"
          title="workspace اعلان‌ها و timeline فروشنده"
          description="این بخش تاریخچه اعلان‌ها را با selection و policy timeline در یک surface قابل‌استفاده جمع می‌کند."
          actions={<Pill tone="primary">اعلان‌ها v2</Pill>}
        >
          <div className="vendor-notifications-filters">
            {statusOptions(notifications).map((status) => (
              <button
                className={`vendor-notifications-filter-chip ${status === statusFilter ? 'is-active' : ''}`}
                key={status}
                onClick={() => setStatusFilter(status)}
                type="button"
              >
                {status === 'ALL' ? 'همه وضعیت‌ها' : status}
              </button>
            ))}
          </div>
        </SectionCard>

        <div className="vendor-notifications-layout">
          <SectionCard
            eyebrow="اعلان‌ها"
            title="تاریخچه اعلان‌های فروشنده"
            description="اعلان‌ها باید سریع اسکن شوند تا فروشنده بفهمد چه چیزی فقط اطلاع‌رسانی بوده و چه چیزی نیاز به توجه دارد."
            actions={<Pill tone="success">{`${formatFaNumber(filteredNotifications.length)} اعلان`}</Pill>}
          >
            <div className="vendor-notifications-table-card">
              <DataTable columns={notificationColumns} rows={rows} />

              <div className="vendor-notifications-selection-list">
                {filteredNotifications.slice(0, 8).map((item) => {
                  const id = readText(item, ['id'], '—')
                  const isActive = id === selectedNotificationId

                  return (
                    <button
                      className={`vendor-notifications-selection-item ${isActive ? 'is-active' : ''}`}
                      key={id}
                      onClick={() => setSelectedNotificationId(id)}
                      type="button"
                    >
                      <strong>{getNotificationTopic(item)}</strong>
                      <span>{getNotificationChannel(item)}</span>
                      <small>{getNotificationStatus(item)}</small>
                    </button>
                  )
                })}
              </div>
            </div>
          </SectionCard>

          <div className="vendor-notifications-detail-column">
            <SectionCard
              eyebrow="اعلان انتخاب‌شده"
              title={selectedNotification ? `اعلان #${readText(selectedNotification, ['id'], '—')}` : 'اعلانی انتخاب نشده'}
              description="خلاصه اعلان انتخاب‌شده برای ساخت detail drawer و actionهای بعدی آماده شده است."
              actions={<Pill tone="warning">{selectedNotification ? getNotificationStatus(selectedNotification) : 'بدون انتخاب'}</Pill>}
            >
              {selectedSummary.length ? (
                <div className="vendor-notifications-detail-grid">
                  {selectedSummary.map((item) => (
                    <article className="vendor-notifications-detail-item" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="vendor-note-card">در این فیلتر هنوز اعلانی برای نمایش جزئیات وجود ندارد.</div>
              )}
            </SectionCard>

            <SectionCard
              eyebrow="timeline policy"
              title="timeline policy و هشدار"
              description="فروشنده باید بداند چه رخدادهایی روی policy و وضعیت فروشگاهش اثر گذاشته‌اند."
              actions={<Pill tone="danger">timeline</Pill>}
            >
              <ActivityFeed items={feed} />
            </SectionCard>
          </div>
        </div>
      </LoadableState>
    </div>
  )
}

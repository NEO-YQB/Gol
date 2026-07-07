import { ActivityFeed, DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { makeFeed, makeRows, makeStats, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type AlertRecord = Record<string, unknown>

const alertStatusLabels: Record<string, string> = {
  OPEN: 'باز',
  ACKNOWLEDGED: 'در حال بررسی',
  RESOLVED: 'حل شده',
  SNOOZED: 'تعویق خورده',
}

const notificationStatusLabels: Record<string, string> = {
  PENDING: 'در صف ارسال',
  SENT: 'ارسال شده',
  FAILED: 'ناموفق',
  CANCELLED: 'لغو شده',
}

const notificationChannelLabels: Record<string, string> = {
  PUSH: 'پوش',
  IN_APP: 'داخل برنامه',
  SMS: 'پیامک',
  EMAIL: 'ایمیل',
}

const notificationColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'topic', label: 'موضوع' },
  { key: 'status', label: 'وضعیت' },
  { key: 'channel', label: 'کانال' },
  { key: 'updated', label: 'بروزرسانی' },
]

function getAlertStatus(record: AlertRecord) {
  return readText(record, ['status'], 'UNKNOWN')
}

function getAlertStatusLabel(record: AlertRecord) {
  const status = getAlertStatus(record)
  return alertStatusLabels[status] ?? status
}

function getAlertTitle(record: AlertRecord) {
  return readText(record, ['title', 'topic', 'type'], '—')
}

function getNotificationStatusLabel(record: AlertRecord) {
  const status = readText(record, ['status'], 'UNKNOWN')
  return notificationStatusLabels[status] ?? status
}

function getNotificationChannelLabel(record: AlertRecord) {
  const channel = readText(record, ['channel', 'targetChannel'], '—')
  return notificationChannelLabels[channel] ?? channel
}

function formatJalaliDate(value: unknown, withTime = false) {
  if (typeof value !== 'string' || !value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'

  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(parsed)
}

function statusOptions(items: AlertRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getAlertStatus(item))))
  return ['ALL', ...unique]
}

export function AlertsPage({
  session,
  onOpenPushNotificationWorkspace,
}: {
  session: AuthSession
  onOpenPushNotificationWorkspace: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [notifications, setNotifications] = useState<AlertRecord[]>([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null)
  const [dispatchState, setDispatchState] = useState<{ loadingId: string | null; message: string | null; error: string | null }>({
    loadingId: null,
    message: null,
    error: null,
  })

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [alerts, notifications] = await Promise.all([
          adminApi.getAlerts(session),
          adminApi.getNotifications(session),
        ])

        if (!active) return

        const alertList = toArray(alerts)
        const notificationList = toArray(notifications)
        setAlerts(alertList)
        setNotifications(notificationList)
        if (alertList.length > 0) {
          setSelectedAlertId(readText(alertList[0], ['id'], ''))
        }
        if (notificationList.length > 0) {
          setSelectedNotificationId(readText(notificationList[0], ['id'], ''))
        }
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری alerts و notifications')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [session])

  const filteredAlerts = useMemo(
    () => alerts.filter((item) => (statusFilter === 'ALL' ? true : getAlertStatus(item) === statusFilter)),
    [alerts, statusFilter],
  )

  useEffect(() => {
    if (filteredAlerts.length === 0) {
      setSelectedAlertId(null)
      return
    }

    const hasSelected = filteredAlerts.some((item) => readText(item, ['id'], '') === selectedAlertId)
    if (!hasSelected) {
      setSelectedAlertId(readText(filteredAlerts[0], ['id'], ''))
    }
  }, [filteredAlerts, selectedAlertId])

  const notificationRows = useMemo(
    () =>
      makeRows(notifications.slice(0, 10), [
        { key: 'id', source: ['id'] },
        { key: 'topic', source: ['title', 'topic'] },
        { key: 'status', source: ['status'] },
        { key: 'channel', source: ['channel', 'targetChannel'] },
        { key: 'updated', source: ['updatedAt', 'sentAt', 'createdAt'] },
      ]),
    [notifications],
  )

  const feed = useMemo(() => makeFeed(filteredAlerts, 'alert lifecycle'), [filteredAlerts])

  const stats = useMemo(
    () =>
      makeStats([
        { label: 'هشدارها', value: alerts, detail: '', tone: 'danger' },
        { label: 'اعلان‌ها', value: notifications, detail: '', tone: 'success' },
        { label: 'وضعیت‌ها', value: statusOptions(alerts).length - 1, detail: '', tone: 'warning' },
      ]),
    [alerts, notifications],
  )

  const selectedAlert = useMemo(
    () => filteredAlerts.find((item) => readText(item, ['id'], '') === selectedAlertId) ?? null,
    [filteredAlerts, selectedAlertId],
  )

  useEffect(() => {
    if (notifications.length === 0) {
      setSelectedNotificationId(null)
      return
    }

    const hasSelected = notifications.some((item) => readText(item, ['id'], '') === selectedNotificationId)
    if (!hasSelected) {
      setSelectedNotificationId(readText(notifications[0], ['id'], ''))
    }
  }, [notifications, selectedNotificationId])

  const selectedNotification = useMemo(
    () => notifications.find((item) => readText(item, ['id'], '') === selectedNotificationId) ?? null,
    [notifications, selectedNotificationId],
  )

  const selectedSummary = selectedAlert
    ? [
        { label: 'شناسه', value: readText(selectedAlert, ['id'], '—') },
        { label: 'عنوان', value: getAlertTitle(selectedAlert) },
        { label: 'وضعیت', value: getAlertStatusLabel(selectedAlert) },
        { label: 'آخرین تغییر', value: formatJalaliDate(readText(selectedAlert, ['updatedAt', 'createdAt'], ''), true) },
        { label: 'منبع', value: readText(selectedAlert, ['aggregateType', 'type'], '—') },
        { label: 'پیام', value: readText(selectedAlert, ['message', 'description', 'note'], '—') },
        { label: 'نوع', value: readText(selectedAlert, ['type'], '—') },
      ]
    : []

  const selectedNotificationSummary = selectedNotification
    ? [
        { label: 'شناسه', value: readText(selectedNotification, ['id'], '—') },
        { label: 'عنوان', value: readText(selectedNotification, ['title', 'topic'], '—') },
        { label: 'وضعیت', value: getNotificationStatusLabel(selectedNotification) },
        { label: 'کانال', value: getNotificationChannelLabel(selectedNotification) },
        { label: 'به‌روزرسانی', value: formatJalaliDate(readText(selectedNotification, ['updatedAt', 'sentAt', 'createdAt'], ''), true) },
        { label: 'متن', value: readText(selectedNotification, ['body'], '—') },
      ]
    : []

  async function handleDispatchPush(notificationId: string) {
    setDispatchState({ loadingId: notificationId, message: null, error: null })

    try {
      await adminApi.dispatchNotification(session, notificationId, {
        channel: 'PUSH',
        forceRetry: true,
      })

      setDispatchState({
        loadingId: null,
        message: `ارسال مجدد push برای اعلان #${notificationId} انجام شد.`,
        error: null,
      })
    } catch (dispatchError) {
      setDispatchState({
        loadingId: null,
        message: null,
        error: dispatchError instanceof Error ? dispatchError.message : 'ارسال مجدد push ناموفق بود.',
      })
    }
  }

  return (
    <div className="fm-stack">
      <LoadableState error={error} loading={loading}>
        <div className="fm-grid alerts-summary-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="هشدارها"
          title="هشدارها و اعلان‌ها"
          actions={<Pill tone="danger">{`${filteredAlerts.length} مورد`}</Pill>}
        >
          <div className="alerts-filters">
            {statusOptions(alerts).map((status) => (
              <button
                className={`alerts-filter-chip ${status === statusFilter ? 'is-active' : ''}`}
                key={status}
                onClick={() => setStatusFilter(status)}
                type="button"
              >
                {status === 'ALL' ? 'همه' : (alertStatusLabels[status] ?? status)}
              </button>
            ))}
          </div>
        </SectionCard>

        <div className="alerts-layout">
          <SectionCard
            eyebrow="لیست هشدارها"
            title="هشدارهای عملیاتی"
            actions={<Pill tone="warning">{`${filteredAlerts.length} هشدار`}</Pill>}
          >
            <div className="alerts-table-card">
              <ActivityFeed items={feed} />

              <div className="alerts-selection-list">
                {filteredAlerts.slice(0, 8).map((item) => {
                  const id = readText(item, ['id'], '—')
                  const isActive = id === selectedAlertId

                  return (
                    <button
                      className={`alerts-selection-item ${isActive ? 'is-active' : ''}`}
                      key={id}
                      onClick={() => setSelectedAlertId(id)}
                      type="button"
                    >
                      <div className="alerts-selection-head">
                        <strong>{getAlertTitle(item)}</strong>
                        <span>{getAlertStatusLabel(item)}</span>
                      </div>
                      <small>{formatJalaliDate(readText(item, ['updatedAt', 'createdAt'], ''), true)}</small>
                    </button>
                  )
                })}
              </div>
            </div>
          </SectionCard>

          <div className="alerts-detail-column">
            <SectionCard
              eyebrow="جزئیات هشدار"
              title={selectedAlert ? `هشدار #${readText(selectedAlert, ['id'], '—')}` : 'هشداری انتخاب نشده'}
              actions={<Pill tone="danger">{selectedAlert ? getAlertStatusLabel(selectedAlert) : 'بدون انتخاب'}</Pill>}
            >
              {selectedSummary.length ? (
                <div className="alerts-detail-grid">
                  {selectedSummary.map((item) => (
                    <article className={`alerts-detail-item${item.label === 'پیام' ? ' alerts-detail-item--wide' : ''}`} key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="fm-message">در این فیلتر هنوز هشداری برای نمایش جزئیات وجود ندارد.</div>
              )}
            </SectionCard>

            <SectionCard
              eyebrow="اعلان‌ها"
              title="اعلان‌های ارسالی"
              actions={
                <div className="flex flex-wrap gap-2">
                  <Pill tone="success">{`${notifications.length} اعلان`}</Pill>
                  <button className="fm-button fm-button--primary" onClick={onOpenPushNotificationWorkspace} type="button">
                    اعلان جدید
                  </button>
                </div>
              }
            >
              {dispatchState.message ? <div className="fm-message fm-message--success">{dispatchState.message}</div> : null}
              {dispatchState.error ? <div className="fm-message fm-message--error">{dispatchState.error}</div> : null}

              <DataTable columns={notificationColumns} rows={notificationRows} />
              {selectedNotificationSummary.length ? (
                <div className="alerts-detail-grid">
                  {selectedNotificationSummary.map((item) => (
                    <article className={`alerts-detail-item${item.label === 'متن' ? ' alerts-detail-item--wide' : ''}`} key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              ) : null}
              <div className="alerts-selection-list">
                {notifications.slice(0, 8).map((item) => {
                  const id = readText(item, ['id'], '—')
                  const isActive = id === selectedNotificationId
                  return (
                    <button
                      className={`alerts-selection-item ${isActive ? 'is-active' : ''}`}
                      key={id}
                      onClick={() => setSelectedNotificationId(id)}
                      type="button"
                    >
                      <div className="alerts-selection-head">
                        <strong>{readText(item, ['title', 'topic'], '—')}</strong>
                        <span>{getNotificationStatusLabel(item)}</span>
                      </div>
                      <small>{getNotificationChannelLabel(item)}</small>
                    </button>
                  )
                })}
              </div>
              <div className="alerts-notification-actions">
                <button
                  className="fm-button fm-button--primary"
                  disabled={!selectedNotificationId || dispatchState.loadingId === selectedNotificationId}
                  onClick={() => selectedNotificationId ? void handleDispatchPush(selectedNotificationId) : undefined}
                  type="button"
                >
                  {dispatchState.loadingId === selectedNotificationId ? 'در حال ارسال...' : 'ارسال مجدد پوش'}
                </button>
              </div>
            </SectionCard>
          </div>
        </div>
      </LoadableState>
    </div>
  )
}

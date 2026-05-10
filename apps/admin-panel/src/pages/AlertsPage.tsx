import { ActivityFeed, DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { makeFeed, makeRows, makeStats, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type AlertRecord = Record<string, unknown>

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

function getAlertTitle(record: AlertRecord) {
  return readText(record, ['title', 'topic', 'type'], '—')
}

function getAlertMeta(record: AlertRecord) {
  return readText(record, ['updatedAt', 'createdAt', 'aggregateType'], '—')
}

function statusOptions(items: AlertRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getAlertStatus(item))))
  return ['ALL', ...unique]
}

export function AlertsPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [notifications, setNotifications] = useState<AlertRecord[]>([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)

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
        { key: 'topic', source: ['topic'] },
        { key: 'status', source: ['status'] },
        { key: 'channel', source: ['channel', 'targetChannel'] },
        { key: 'updated', source: ['updatedAt', 'sentAt'] },
      ]),
    [notifications],
  )

  const feed = useMemo(() => makeFeed(filteredAlerts, 'alert lifecycle'), [filteredAlerts])

  const stats = useMemo(
    () =>
      makeStats([
        { label: 'هشدارهای عملیاتی', value: alerts, detail: 'queue اصلی alert lifecycle', tone: 'danger' },
        { label: 'اعلان‌های outbox', value: notifications, detail: 'دید روشن‌تر برای dispatch و delivery', tone: 'success' },
        { label: 'وضعیت‌های فعال', value: statusOptions(alerts).length - 1, detail: 'پایه filter و triage', tone: 'warning' },
      ]),
    [alerts, notifications],
  )

  const selectedAlert = useMemo(
    () => filteredAlerts.find((item) => readText(item, ['id'], '') === selectedAlertId) ?? null,
    [filteredAlerts, selectedAlertId],
  )

  const selectedSummary = selectedAlert
    ? [
        { label: 'شناسه', value: readText(selectedAlert, ['id'], '—') },
        { label: 'عنوان', value: getAlertTitle(selectedAlert) },
        { label: 'وضعیت', value: getAlertStatus(selectedAlert) },
        { label: 'زمان / منبع', value: getAlertMeta(selectedAlert) },
        { label: 'پیام', value: readText(selectedAlert, ['message', 'description', 'note'], '—') },
        { label: 'نوع', value: readText(selectedAlert, ['type', 'aggregateType'], '—') },
      ]
    : []

  return (
    <div className="fm-stack">
      <LoadableState error={error} loading={loading}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="کارتابل هشدارها"
          title="workspace هشدارها و outbox عملیاتی"
          description="این route برای triage سریع alertها و دید روشن‌تر روی outbox ادمین یک surface یکپارچه می‌سازد."
          actions={<Pill tone="danger">هشدارها v2</Pill>}
        >
          <div className="alerts-filters">
            {statusOptions(alerts).map((status) => (
              <button
                className={`alerts-filter-chip ${status === statusFilter ? 'is-active' : ''}`}
                key={status}
                onClick={() => setStatusFilter(status)}
                type="button"
              >
                {status === 'ALL' ? 'همه وضعیت‌ها' : status}
              </button>
            ))}
          </div>
        </SectionCard>

        <div className="alerts-layout">
          <SectionCard
            eyebrow="چرخه هشدار"
            title="فید هشدارهای عملیاتی"
            description="سطح اولیه برای acknowledge، resolve، reopen و snooze روی alertها، حالا با selection و context بهتر."
            actions={<Pill tone="warning">{`${filteredAlerts.length} alert`}</Pill>}
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
                      <strong>{getAlertTitle(item)}</strong>
                      <span>{getAlertStatus(item)}</span>
                      <small>{getAlertMeta(item)}</small>
                    </button>
                  )
                })}
              </div>
            </div>
          </SectionCard>

          <div className="alerts-detail-column">
            <SectionCard
              eyebrow="هشدار انتخاب‌شده"
              title={selectedAlert ? `هشدار #${readText(selectedAlert, ['id'], '—')}` : 'هشداری انتخاب نشده'}
              description="این summary پایه drawer بعدی و actionهای عملیاتی alert lifecycle است."
              actions={<Pill tone="danger">{selectedAlert ? getAlertStatus(selectedAlert) : 'بدون انتخاب'}</Pill>}
            >
              {selectedSummary.length ? (
                <div className="alerts-detail-grid">
                  {selectedSummary.map((item) => (
                    <article className="alerts-detail-item" key={item.label}>
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
              eyebrow="عملیات اعلان"
              title="outbox و delivery visibility"
              description="notificationها در این route باید سریع اسکن شوند تا بعدا filters و dispatch controls روی آن سوار شوند."
              actions={<Pill tone="success">outbox</Pill>}
            >
              <DataTable columns={notificationColumns} rows={notificationRows} />
            </SectionCard>
          </div>
        </div>
      </LoadableState>
    </div>
  )
}

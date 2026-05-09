import { ActivityFeed, DataTable, Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { makeFeed, makeRows, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

const notificationColumns = [
  { key: 'topic', label: 'topic' },
  { key: 'status', label: 'وضعیت' },
  { key: 'channel', label: 'کانال' },
  { key: 'updated', label: 'بروزرسانی' },
]

export function AlertsPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notificationRows, setNotificationRows] = useState([] as ReturnType<typeof makeRows>)
  const [feed, setFeed] = useState(() => makeFeed([], 'alert'))

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

        setFeed(makeFeed(toArray(alerts), 'alert lifecycle'))
        setNotificationRows(
          makeRows(toArray(notifications).slice(0, 8), [
            { key: 'topic', source: ['topic'] },
            { key: 'status', source: ['status'] },
            { key: 'channel', source: ['channel', 'targetChannel'] },
            { key: 'updated', source: ['updatedAt', 'sentAt'] },
          ]),
        )
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

  return (
    <div className="fm-two-column">
      <LoadableState error={error} loading={loading}>
        <SectionCard
          eyebrow="Alert lifecycle"
          title="فید هشدارهای عملیاتی"
          description="سطح اولیه برای acknowledge، resolve، reopen و snooze روی alertها."
          actions={<Pill tone="danger">ops alerts</Pill>}
        >
          <ActivityFeed items={feed} />
        </SectionCard>

        <SectionCard
          eyebrow="Notification ops"
          title="outbox و delivery visibility"
          description="notificationها باید بعدا به filters، dispatch simulation و per-channel detail مجهز شوند."
          actions={<Pill tone="success">outbox</Pill>}
        >
          <DataTable columns={notificationColumns} rows={notificationRows} />
        </SectionCard>
      </LoadableState>
    </div>
  )
}

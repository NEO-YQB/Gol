import { ActivityFeed, DataTable, Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi } from '../lib/api'
import { makeFeed, makeRows, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

const notificationColumns = [
  { key: 'topic', label: 'موضوع' },
  { key: 'status', label: 'وضعیت' },
  { key: 'channel', label: 'کانال' },
  { key: 'updatedAt', label: 'زمان' },
]

export function NotificationsPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState([] as ReturnType<typeof makeRows>)
  const [feed, setFeed] = useState(() => makeFeed([], 'policy event'))

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

        setRows(
          makeRows(toArray(notifications).slice(0, 10), [
            { key: 'topic', source: ['topic'] },
            { key: 'status', source: ['status'] },
            { key: 'channel', source: ['channel', 'targetChannel'] },
            { key: 'updatedAt', source: ['updatedAt', 'sentAt'] },
          ]),
        )
        setFeed(makeFeed(toArray(timeline), 'policy timeline'))
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

  return (
    <div className="fm-two-column">
      <LoadableState loading={loading} error={error}>
        <SectionCard
          eyebrow="Notifications"
          title="تاریخچه اعلان‌های فروشنده"
          description="notification history فروشنده باید شفاف و قابل اسکن باشد."
          actions={<Pill tone="primary">vendor notifications</Pill>}
        >
          <DataTable columns={notificationColumns} rows={rows} />
        </SectionCard>

        <SectionCard
          eyebrow="Policy timeline"
          title="timeline policy و alert"
          description="فروشنده باید بداند چه eventهایی روی policy و وضعیت فروشگاهش اثر گذاشته‌اند."
          actions={<Pill tone="warning">timeline</Pill>}
        >
          <ActivityFeed items={feed} />
        </SectionCard>
      </LoadableState>
    </div>
  )
}

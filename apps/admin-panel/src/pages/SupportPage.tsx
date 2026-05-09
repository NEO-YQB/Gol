import { ActivityFeed, DataTable, Pill, SectionCard } from '@frontend-core'
import { useEffect, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { makeFeed, makeRows, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

const ticketColumns = [
  { key: 'id', label: 'تیکت' },
  { key: 'order', label: 'سفارش' },
  { key: 'status', label: 'وضعیت' },
  { key: 'reason', label: 'علت' },
]

export function SupportPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ticketRows, setTicketRows] = useState([] as ReturnType<typeof makeRows>)
  const [feed, setFeed] = useState(() => makeFeed([], 'support'))

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [tickets, followUps] = await Promise.all([
          adminApi.getSupportTickets(session),
          adminApi.getSupportFollowUps(session),
        ])

        if (!active) return

        setTicketRows(
          makeRows(toArray(tickets).slice(0, 8), [
            { key: 'id', source: ['id'] },
            { key: 'order', source: ['orderId'] },
            { key: 'status', source: ['status'] },
            { key: 'reason', source: ['reason', 'title'] },
          ]),
        )

        setFeed(makeFeed(toArray(followUps), 'support follow-up'))
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری پشتیبانی')
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
          eyebrow="Support tickets"
          title="تیکت‌های ادمین / پشتیبانی"
          description="صفحه پایه برای list, detail, note و finance decision روی support domain."
          actions={<Pill tone="primary">support admin</Pill>}
        >
          <DataTable columns={ticketColumns} rows={ticketRows} />
        </SectionCard>

        <SectionCard
          eyebrow="Follow-up feed"
          title="پیگیری‌های عملیاتی"
          description="follow-upها باید بعدا به timeline و quick action drawer متصل شوند."
          actions={<Pill tone="warning">timeline next</Pill>}
        >
          <ActivityFeed items={feed} />
        </SectionCard>
      </LoadableState>
    </div>
  )
}

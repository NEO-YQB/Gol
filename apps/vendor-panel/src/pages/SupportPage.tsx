import { DataTable, Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi } from '../lib/api'
import { makeRows, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

const ticketColumns = [
  { key: 'id', label: 'تیکت' },
  { key: 'orderId', label: 'سفارش' },
  { key: 'status', label: 'وضعیت' },
  { key: 'reason', label: 'علت' },
]

export function SupportPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState([] as ReturnType<typeof makeRows>)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const payload = await vendorApi.getTicketsSummary(session)
        if (!active) return
        setRows(
          makeRows(toArray(payload).slice(0, 10), [
            { key: 'id', source: ['id'] },
            { key: 'orderId', source: ['orderId'] },
            { key: 'status', source: ['status'] },
            { key: 'reason', source: ['reason'] },
          ]),
        )
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری تیکت‌های فروشنده')
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
    <LoadableState loading={loading} error={error}>
      <SectionCard
        eyebrow="Vendor support"
        title="تیکت‌های مربوط به فروشگاه"
        description="این صفحه summary تیکت‌های فروشنده را از backend می‌گیرد و مبنای detail, note و follow-up بعدی می‌شود."
        actions={<Pill tone="warning">ticket summary</Pill>}
      >
        <DataTable columns={ticketColumns} rows={rows} />
      </SectionCard>
    </LoadableState>
  )
}

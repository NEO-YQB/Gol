import { DataTable, Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi } from '../lib/api'
import { makeRows, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

const orderColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'status', label: 'وضعیت' },
  { key: 'payment', label: 'پرداخت' },
  { key: 'total', label: 'مبلغ' },
]

export function OrdersPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState([] as ReturnType<typeof makeRows>)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const payload = await vendorApi.getVendorOrders(session)
        if (!active) return
        setRows(
          makeRows(toArray(payload).slice(0, 12), [
            { key: 'id', source: ['id'] },
            { key: 'status', source: ['status'] },
            { key: 'payment', source: ['paymentStatus'] },
            { key: 'total', source: ['totalAmount'] },
          ]),
        )
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری سفارش‌های فروشگاه')
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
        eyebrow="Vendor orders"
        title="سفارش‌های فروشگاه"
        description="این صفحه به `/orders/vendor` وصل است و پایه table، filter و detail flow فروشنده را می‌سازد."
        actions={<Pill tone="primary">real endpoint</Pill>}
      >
        <DataTable columns={orderColumns} rows={rows} />
      </SectionCard>
    </LoadableState>
  )
}

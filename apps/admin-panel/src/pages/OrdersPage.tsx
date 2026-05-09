import { DataTable, Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { makeRows, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

const orderColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'customer', label: 'مشتری' },
  { key: 'status', label: 'وضعیت' },
  { key: 'payment', label: 'پرداخت' },
]

const exceptionColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'type', label: 'نوع' },
  { key: 'status', label: 'وضعیت' },
  { key: 'note', label: 'یادداشت' },
]

export function OrdersPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState([] as ReturnType<typeof makeRows>)
  const [exceptions, setExceptions] = useState([] as ReturnType<typeof makeRows>)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [ordersPayload, exceptionsPayload] = await Promise.all([
          adminApi.getAdminOrders(session),
          adminApi.getOrderExceptions(session),
        ])

        if (!active) return

        setOrders(
          makeRows(toArray(ordersPayload).slice(0, 8), [
            { key: 'id', source: ['id'] },
            { key: 'customer', source: ['customerName', 'customer', 'recipientName', 'userId'] },
            { key: 'status', source: ['status'] },
            { key: 'payment', source: ['paymentStatus'] },
          ]),
        )

        setExceptions(
          makeRows(toArray(exceptionsPayload).slice(0, 8), [
            { key: 'id', source: ['id', 'orderId'] },
            { key: 'type', source: ['type', 'reason', 'status'] },
            { key: 'status', source: ['status'] },
            { key: 'note', source: ['note', 'message', 'description'] },
          ]),
        )
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری سفارش‌ها')
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
        <SectionCard
          eyebrow="Orders"
          title="لیست سفارش‌های ادمین"
          description="خوانش مستقیم از `/orders/admin` برای ساخت table view, filters و detail workspace بعدی."
          actions={<Pill tone="primary">real endpoint</Pill>}
        >
          <DataTable columns={orderColumns} rows={orders} />
        </SectionCard>

        <SectionCard
          eyebrow="Exceptions"
          title="صف سفارش‌های مسئله‌دار"
          description="پایه اولیه برای views مربوط به stuck order, payment review و exception handling."
          actions={<Pill tone="warning">ops queue</Pill>}
        >
          <DataTable columns={exceptionColumns} rows={exceptions} />
        </SectionCard>
      </LoadableState>
    </div>
  )
}

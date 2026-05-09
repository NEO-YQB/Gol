import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { makeRows, makeStats, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

const walletColumns = [
  { key: 'store', label: 'فروشگاه' },
  { key: 'balance', label: 'موجودی' },
  { key: 'held', label: 'held' },
  { key: 'updated', label: 'آخرین تغییر' },
]

const settlementColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'status', label: 'وضعیت' },
  { key: 'reason', label: 'علت' },
  { key: 'updated', label: 'بروزرسانی' },
]

export function SettlementsPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState(() => makeStats([]))
  const [walletRows, setWalletRows] = useState([] as ReturnType<typeof makeRows>)
  const [settlementRows, setSettlementRows] = useState([] as ReturnType<typeof makeRows>)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [wallets, exceptions, financeSummary, refundSummary] = await Promise.all([
          adminApi.getWallets(session),
          adminApi.getSettlementExceptions(session),
          adminApi.getFinanceSummary(session),
          adminApi.getRefundSummary(session),
        ])

        if (!active) return

        setStats(
          makeStats([
            { label: 'کیف پول‌ها', value: wallets, detail: 'ورودی اصلی finance admin', tone: 'primary' },
            { label: 'settlement exceptions', value: exceptions, detail: 'block / inconsistency queue', tone: 'warning' },
            { label: 'wallet summary', value: financeSummary, detail: 'summary endpoint برای report widgets', tone: 'success' },
            { label: 'refund summary', value: refundSummary, detail: 'refund / reversal visibility', tone: 'danger' },
          ]),
        )

        setWalletRows(
          makeRows(toArray(wallets).slice(0, 8), [
            { key: 'store', source: ['storeName', 'store', 'storeId'] },
            { key: 'balance', source: ['balance', 'availableBalance'] },
            { key: 'held', source: ['heldBalance', 'heldAmount'] },
            { key: 'updated', source: ['updatedAt'] },
          ]),
        )

        setSettlementRows(
          makeRows(toArray(exceptions).slice(0, 8), [
            { key: 'id', source: ['id', 'orderId'] },
            { key: 'status', source: ['status'] },
            { key: 'reason', source: ['reason', 'type', 'message'] },
            { key: 'updated', source: ['updatedAt', 'createdAt'] },
          ]),
        )
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری مالی و تسویه')
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

        <SectionCard
          eyebrow="Wallets"
          title="کیف پول فروشگاه‌ها"
          description="Foundation این صفحه برای wallet ledger visibility، adjustment و release flow آماده شده است."
          actions={<Pill tone="success">finance core</Pill>}
        >
          <DataTable columns={walletColumns} rows={walletRows} />
        </SectionCard>

        <SectionCard
          eyebrow="Settlement queue"
          title="موارد نیازمند بررسی تسویه"
          description="پایه لازم برای release دستی، held earning review و پیگیری ناسازگاری‌ها."
          actions={<Pill tone="warning">exception flow</Pill>}
        >
          <DataTable columns={settlementColumns} rows={settlementRows} />
        </SectionCard>
      </LoadableState>
    </div>
  )
}

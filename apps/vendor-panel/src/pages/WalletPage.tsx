import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi } from '../lib/api'
import { formatFaNumber, makeRows, makeStats, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

const transactionColumns = [
  { key: 'type', label: 'نوع' },
  { key: 'direction', label: 'جهت' },
  { key: 'amount', label: 'مبلغ' },
  { key: 'createdAt', label: 'زمان' },
]

const settlementColumns = [
  { key: 'id', label: 'سفارش' },
  { key: 'settlementStatus', label: 'وضعیت تسویه' },
  { key: 'vendorShareAmount', label: 'سهم فروشنده' },
  { key: 'updatedAt', label: 'بروزرسانی' },
]

export function WalletPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState(() => makeStats([]))
  const [transactions, setTransactions] = useState([] as ReturnType<typeof makeRows>)
  const [settlements, setSettlements] = useState([] as ReturnType<typeof makeRows>)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [wallet, settlementSummary] = await Promise.all([
          vendorApi.getWalletSummary(session),
          vendorApi.getSettlementsSummary(session),
        ])
        if (!active) return

        const walletRecord = wallet as Record<string, unknown>
        const walletData = (walletRecord.wallet as Record<string, unknown>) ?? {}
        const activity = (walletRecord.activity as Record<string, unknown>) ?? {}
        const amounts = ((settlementSummary as Record<string, unknown>).amounts as Record<string, unknown>) ?? {}

        setStats(
          makeStats([
            {
              label: 'موجودی فعلی',
              value: formatFaNumber(Number(walletData.currentBalance ?? 0)),
              delta: `${formatFaNumber(Number(walletData.availableBalance ?? 0))} قابل برداشت`,
              detail: 'خروجی مستقیم store wallet',
              tone: 'primary',
            },
            {
              label: 'تراکنش‌های بازه',
              value: formatFaNumber(Number(activity.transactionCount ?? 0)),
              delta: `${formatFaNumber(Number(activity.creditAmount ?? 0))} ورودی`,
              detail: 'فعالیت کیف پول در بازه summary',
              tone: 'success',
            },
            {
              label: 'released total',
              value: formatFaNumber(Number(amounts.releasedTotal ?? 0)),
              delta: `${formatFaNumber(Number(amounts.reversedTotal ?? 0))} برگشتی`,
              detail: 'دریافتی و reversals فروشگاه',
              tone: 'warning',
            },
            {
              label: 'برآورد قابل release',
              value: formatFaNumber(Number(amounts.releasableEstimate ?? 0)),
              delta: readText(amounts, ['vendorShareTotal'], '0'),
              detail: 'تخمین قابل استفاده برای دید مالی سریع',
              tone: 'danger',
            },
          ]),
        )

        setTransactions(
          makeRows(toArray(walletRecord).slice(0, 10), [
            { key: 'type', source: ['type'] },
            { key: 'direction', source: ['direction'] },
            { key: 'amount', source: ['amount'] },
            { key: 'createdAt', source: ['createdAt'] },
          ]),
        )

        setSettlements(
          makeRows(toArray(settlementSummary).slice(0, 10), [
            { key: 'id', source: ['id'] },
            { key: 'settlementStatus', source: ['settlementStatus'] },
            { key: 'vendorShareAmount', source: ['vendorShareAmount'] },
            { key: 'updatedAt', source: ['updatedAt'] },
          ]),
        )
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری کیف پول و تسویه')
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
      <LoadableState loading={loading} error={error}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="Wallet activity"
          title="تراکنش‌های اخیر کیف پول"
          description="فروشنده باید واضح ببیند چه چیزی وارد یا خارج شده و بابت کدام order بوده است."
          actions={<Pill tone="success">wallet summary</Pill>}
        >
          <DataTable columns={transactionColumns} rows={transactions} />
        </SectionCard>

        <SectionCard
          eyebrow="Settlement summary"
          title="آخرین وضعیت‌های تسویه"
          description="بخش بعدی روی detail و فیلترهای بهتر برای settlementها سوار می‌شود."
          actions={<Pill tone="warning">settlement flow</Pill>}
        >
          <DataTable columns={settlementColumns} rows={settlements} />
        </SectionCard>
      </LoadableState>
    </div>
  )
}

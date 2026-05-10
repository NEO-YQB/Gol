import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi } from '../lib/api'
import { formatFaNumber, makeRows, makeStats, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type WalletRecord = Record<string, unknown>

const transactionColumns = [
  { key: 'id', label: 'شناسه' },
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

function getTransactionDirection(record: WalletRecord) {
  return readText(record, ['direction'], 'UNKNOWN')
}

function getSettlementStatus(record: WalletRecord) {
  return readText(record, ['settlementStatus', 'status'], 'UNKNOWN')
}

function getSettlementAmount(record: WalletRecord) {
  const raw = readText(record, ['vendorShareAmount', 'amount'], '0')
  const numeric = Number(raw)
  return Number.isNaN(numeric) ? raw : formatFaNumber(numeric)
}

function formatJalaliDate(value: unknown) {
  if (typeof value !== 'string' || !value) return '—'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'

  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed)
}

function directionOptions(items: WalletRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getTransactionDirection(item))))
  return ['ALL', ...unique]
}

function settlementStatusOptions(items: WalletRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getSettlementStatus(item))))
  return ['ALL', ...unique]
}

export function WalletPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState(() => makeStats([]))
  const [transactions, setTransactions] = useState<WalletRecord[]>([])
  const [settlements, setSettlements] = useState<WalletRecord[]>([])
  const [walletMeta, setWalletMeta] = useState<WalletRecord>({})
  const [transactionDirectionFilter, setTransactionDirectionFilter] = useState('ALL')
  const [settlementStatusFilter, setSettlementStatusFilter] = useState('ALL')
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null)

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
        const settlementRecord = (settlementSummary as Record<string, unknown>) ?? {}
        const amounts = (settlementRecord.amounts as Record<string, unknown>) ?? {}
        const transactionList = toArray(walletRecord)
        const settlementList = toArray(settlementSummary)

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

        setWalletMeta({
          availableBalance: walletData.availableBalance,
          heldBalance: walletData.heldBalance,
          currentBalance: walletData.currentBalance,
          creditAmount: activity.creditAmount,
          debitAmount: activity.debitAmount,
        })
        setTransactions(transactionList)
        setSettlements(settlementList)
        if (settlementList.length > 0) {
          setSelectedSettlementId(readText(settlementList[0], ['id'], ''))
        }
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

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((item) =>
        transactionDirectionFilter === 'ALL' ? true : getTransactionDirection(item) === transactionDirectionFilter,
      ),
    [transactionDirectionFilter, transactions],
  )

  const filteredSettlements = useMemo(
    () =>
      settlements.filter((item) =>
        settlementStatusFilter === 'ALL' ? true : getSettlementStatus(item) === settlementStatusFilter,
      ),
    [settlementStatusFilter, settlements],
  )

  useEffect(() => {
    if (filteredSettlements.length === 0) {
      setSelectedSettlementId(null)
      return
    }

    const hasSelected = filteredSettlements.some((item) => readText(item, ['id'], '') === selectedSettlementId)
    if (!hasSelected) {
      setSelectedSettlementId(readText(filteredSettlements[0], ['id'], ''))
    }
  }, [filteredSettlements, selectedSettlementId])

  const transactionRows = useMemo(
    () =>
      makeRows(filteredTransactions.slice(0, 12), [
        { key: 'id', source: ['id', 'referenceId'] },
        { key: 'type', source: ['type'] },
        { key: 'direction', source: ['direction'] },
        { key: 'amount', source: ['amount'] },
        { key: 'createdAt', source: ['createdAt'] },
      ]),
    [filteredTransactions],
  )

  const settlementRows = useMemo(
    () =>
      makeRows(filteredSettlements.slice(0, 12), [
        { key: 'id', source: ['id'] },
        { key: 'settlementStatus', source: ['settlementStatus', 'status'] },
        { key: 'vendorShareAmount', source: ['vendorShareAmount', 'amount'] },
        { key: 'updatedAt', source: ['updatedAt', 'createdAt'] },
      ]),
    [filteredSettlements],
  )

  const selectedSettlement = useMemo(
    () => filteredSettlements.find((item) => readText(item, ['id'], '') === selectedSettlementId) ?? null,
    [filteredSettlements, selectedSettlementId],
  )

  const selectedSettlementSummary = selectedSettlement
    ? [
        { label: 'سفارش', value: readText(selectedSettlement, ['id'], '—') },
        { label: 'وضعیت تسویه', value: getSettlementStatus(selectedSettlement) },
        { label: 'سهم فروشنده', value: getSettlementAmount(selectedSettlement) },
        { label: 'آخرین بروزرسانی', value: formatJalaliDate(selectedSettlement.updatedAt ?? selectedSettlement.createdAt) },
        { label: 'نوع علت', value: readText(selectedSettlement, ['reason', 'type', 'message'], '—') },
        { label: 'وضعیت پرداخت', value: readText(selectedSettlement, ['paymentStatus'], '—') },
      ]
    : []

  const financeNote = `${formatFaNumber(Number(walletMeta.availableBalance ?? 0))} قابل برداشت، ${formatFaNumber(
    Number(walletMeta.heldBalance ?? 0),
  )} نگه داری شده و ${formatFaNumber(Number(walletMeta.debitAmount ?? 0))} خروجی در summary فعلی ثبت شده است.`

  return (
    <div className="fm-stack">
      <LoadableState loading={loading} error={error}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="Wallet workspace"
          title="workspace مالی و تسویه فروشگاه"
          description="این view حالا به فروشنده کمک می کند هم جریان پول را اسکن کند و هم وضعیت releaseها را سریع تر بفهمد."
          actions={<Pill tone="success">finance workspace v2</Pill>}
        >
          <div className="vendor-wallet-note">{financeNote}</div>
        </SectionCard>

        <div className="vendor-wallet-layout">
          <SectionCard
            eyebrow="Wallet activity"
            title="تراکنش های اخیر کیف پول"
            description="جهت و نوع تراکنش ها باید سریع قابل اسکن باشند تا فروشنده منشاء ورود و خروج پول را بفهمد."
            actions={<Pill tone="primary">{`${formatFaNumber(filteredTransactions.length)} تراکنش`}</Pill>}
          >
            <div className="vendor-wallet-table-card">
              <div className="vendor-wallet-filters">
                {directionOptions(transactions).map((direction) => (
                  <button
                    className={`vendor-wallet-filter-chip ${direction === transactionDirectionFilter ? 'is-active' : ''}`}
                    key={direction}
                    onClick={() => setTransactionDirectionFilter(direction)}
                    type="button"
                  >
                    {direction === 'ALL' ? 'همه جهت ها' : direction}
                  </button>
                ))}
              </div>

              <DataTable columns={transactionColumns} rows={transactionRows} />
            </div>
          </SectionCard>

          <div className="vendor-wallet-detail-column">
            <SectionCard
              eyebrow="Settlement summary"
              title="صف تسویه های قابل پیگیری"
              description="این بخش پایه detail flow و توضیح وضعیت releaseهای فروشگاه است."
              actions={<Pill tone="warning">{`${formatFaNumber(filteredSettlements.length)} تسویه`}</Pill>}
            >
              <div className="vendor-wallet-filters">
                {settlementStatusOptions(settlements).map((status) => (
                  <button
                    className={`vendor-wallet-filter-chip ${status === settlementStatusFilter ? 'is-active' : ''}`}
                    key={status}
                    onClick={() => setSettlementStatusFilter(status)}
                    type="button"
                  >
                    {status === 'ALL' ? 'همه وضعیت ها' : status}
                  </button>
                ))}
              </div>

              <DataTable columns={settlementColumns} rows={settlementRows} />

              <div className="vendor-wallet-selection-list">
                {filteredSettlements.slice(0, 8).map((item) => {
                  const id = readText(item, ['id'], '—')
                  const isActive = id === selectedSettlementId

                  return (
                    <button
                      className={`vendor-wallet-selection-item ${isActive ? 'is-active' : ''}`}
                      key={id}
                      onClick={() => setSelectedSettlementId(id)}
                      type="button"
                    >
                      <strong>سفارش #{id}</strong>
                      <span>{getSettlementStatus(item)}</span>
                      <small>{getSettlementAmount(item)} سهم فروشنده</small>
                    </button>
                  )
                })}
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Selected settlement"
              title={selectedSettlement ? `جمع بندی سفارش #${readText(selectedSettlement, ['id'], '—')}` : 'تسویه ای انتخاب نشده'}
              description="این summary برای توضیح سریع وضعیت مالی همان سفارش و آماده سازی detail drawer بعدی است."
              actions={<Pill tone="danger">{selectedSettlement ? getSettlementStatus(selectedSettlement) : 'بدون انتخاب'}</Pill>}
            >
              {selectedSettlementSummary.length ? (
                <div className="vendor-wallet-detail-grid">
                  {selectedSettlementSummary.map((item) => (
                    <article className="vendor-wallet-detail-item" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                  <article className="vendor-wallet-detail-item vendor-wallet-detail-item--wide">
                    <span>یادداشت workspace</span>
                    <strong>
                      مرحله بعدی این صفحه می تواند ledger itemها، دلیل hold، timeline release و توضیح reversal را روی همین ساختار سوار کند.
                    </strong>
                  </article>
                </div>
              ) : (
                <div className="vendor-note-card">در این فیلتر هنوز تسویه ای برای نمایش جزئیات وجود ندارد.</div>
              )}
            </SectionCard>
          </div>
        </div>
      </LoadableState>
    </div>
  )
}

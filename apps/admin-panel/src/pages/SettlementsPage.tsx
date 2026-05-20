import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { makeRows, makeStats, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type FinanceRecord = Record<string, unknown>

function toObject(value: unknown): FinanceRecord {
  return typeof value === 'object' && value !== null ? (value as FinanceRecord) : {}
}

function readDisplayValue(value: unknown, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'object') return fallback
  return String(value)
}

const walletColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'store', label: 'فروشگاه' },
  { key: 'balance', label: 'موجودی' },
  { key: 'held', label: 'نگه‌داری‌شده' },
  { key: 'updated', label: 'آخرین تغییر' },
]

const settlementColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'status', label: 'وضعیت' },
  { key: 'reason', label: 'علت' },
  { key: 'updated', label: 'بروزرسانی' },
]

function formatJalaliDate(value: unknown, withTime = false) {
  if (typeof value !== 'string' || !value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {}),
  }).format(parsed)
}

function getSettlementStatusLabel(status: string) {
  switch (status) {
    case 'PENDING':
      return 'در انتظار نگه داری'
    case 'ON_HOLD':
      return 'در نگه داری'
    case 'RELEASED':
      return 'آزاد شده'
    case 'REVERSED':
      return 'برگشت خورده'
    default:
      return status || 'نامشخص'
  }
}

function getSettlementStatus(record: FinanceRecord) {
  return readText(record, ['status'], 'UNKNOWN')
}

function getSettlementReason(record: FinanceRecord) {
  const reason = record.reason
  const type = record.type
  const message = record.message
  return readDisplayValue(reason) !== '—' ? readDisplayValue(reason) : readDisplayValue(type) !== '—' ? readDisplayValue(type) : readDisplayValue(message)
}

function getWalletStore(record: FinanceRecord) {
  const store = toObject(record.store)
  return readText(store, ['name', 'slug'], readDisplayValue(record.storeName, readDisplayValue(record.storeId)))
}

function statusOptions(items: FinanceRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getSettlementStatus(item))))
  return ['ALL', ...unique]
}

export function SettlementsPage({ session, onOpenFinanceWorkspace }: { session: AuthSession; onOpenFinanceWorkspace: (item: Record<string, unknown>) => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState(() => makeStats([]))
  const [wallets, setWallets] = useState<FinanceRecord[]>([])
  const [exceptions, setExceptions] = useState<FinanceRecord[]>([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null)

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

        const walletList = toArray(wallets)
        const exceptionList = toArray(exceptions)

        setStats(
          makeStats([
            { label: 'کیف پول ها', value: wallets, detail: 'ورودی اصلی کارتابل مالی پنل', tone: 'primary' },
            { label: 'استثناهای تسویه', value: exceptions, detail: 'صف مغایرت ها و توقف های مالی', tone: 'warning' },
            { label: 'خلاصه کیف پول', value: financeSummary, detail: 'خلاصه فشرده برای مرور وضعیت کیف پول ها', tone: 'success' },
            { label: 'خلاصه بازگشت وجه', value: refundSummary, detail: 'مرور سریع بازگشت وجه و برگشت تراکنش', tone: 'danger' },
          ]),
        )
        setWallets(walletList)
        setExceptions(exceptionList)
        if (exceptionList.length > 0) {
          setSelectedSettlementId(readText(exceptionList[0], ['id', 'orderId'], ''))
        }
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

  const filteredExceptions = useMemo(
    () => exceptions.filter((item) => (statusFilter === 'ALL' ? true : getSettlementStatus(item) === statusFilter)),
    [exceptions, statusFilter],
  )

  useEffect(() => {
    if (filteredExceptions.length === 0) {
      setSelectedSettlementId(null)
      return
    }

    const hasSelected = filteredExceptions.some(
      (item) => readText(item, ['id', 'orderId'], '') === selectedSettlementId,
    )
    if (!hasSelected) {
      setSelectedSettlementId(readText(filteredExceptions[0], ['id', 'orderId'], ''))
    }
  }, [filteredExceptions, selectedSettlementId])

  const walletRows = useMemo(
    () =>
      wallets.slice(0, 10).map((item, index) => ({
        id: readText(item, ['id', 'storeId'], String(index + 1)),
        store: getWalletStore(item),
        balance: formatPersianNumber(readText(item, ['balance', 'availableBalance'], '—')),
        held: formatPersianNumber(readText(item, ['heldBalance', 'heldAmount'], '—')),
        updated: formatJalaliDate(readText(item, ['updatedAt'], ''), true),
      })),
    [wallets],
  )

  const settlementRows = useMemo(
    () =>
      filteredExceptions.slice(0, 10).map((item, index) => ({
        id: readText(item, ['id', 'orderId'], String(index + 1)),
        status: getSettlementStatusLabel(getSettlementStatus(item)),
        reason: getSettlementReason(item),
        updated: formatJalaliDate(readText(item, ['updatedAt', 'createdAt'], ''), true),
      })),
    [filteredExceptions],
  )

  const selectedSettlement = useMemo(
    () =>
      filteredExceptions.find((item) => readText(item, ['id', 'orderId'], '') === selectedSettlementId) ?? null,
    [filteredExceptions, selectedSettlementId],
  )

  const selectedSummary = selectedSettlement
    ? [
        { label: 'شناسه', value: readText(selectedSettlement, ['id', 'orderId'], '—') },
        { label: 'وضعیت', value: getSettlementStatusLabel(getSettlementStatus(selectedSettlement)) },
        { label: 'علت', value: getSettlementReason(selectedSettlement) },
        { label: 'فروشگاه', value: getWalletStore(selectedSettlement) },
        { label: 'بروزرسانی', value: formatJalaliDate(readText(selectedSettlement, ['updatedAt', 'createdAt'], ''), true) },
        { label: 'نوع', value: readText(selectedSettlement, ['type'], '—') },
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
          eyebrow="کارتابل مالی"
          title="کارتابل مالی، کیف پول و صف استثناهای تسویه"
          description="این route حالا نقطه triage مالی است؛ مرور سریع اینجا انجام می شود و تصمیم های واقعی داخل workspace مالی."
          actions={<Pill tone="success">مالی و تسویه</Pill>}
        >
          <div className="settlements-filters">
            {statusOptions(exceptions).map((status) => (
              <button
                className={`settlements-filter-chip ${status === statusFilter ? 'is-active' : ''}`}
                key={status}
                onClick={() => setStatusFilter(status)}
                type="button"
              >
                {status === 'ALL' ? 'همه وضعیت ها' : getSettlementStatusLabel(status)}
              </button>
            ))}
          </div>
        </SectionCard>

        <div className="settlements-layout">
          <SectionCard
            eyebrow="کیف پول‌ها"
            title="کیف پول فروشگاه‌ها"
            description="Foundation این صفحه برای دید ledger، adjustment و release flow آماده شده است."
            actions={<Pill tone="success">{`${wallets.length} کیف پول`}</Pill>}
          >
            <DataTable columns={walletColumns} rows={walletRows} />
          </SectionCard>

          <div className="settlements-detail-column">
            <SectionCard
              eyebrow="صف استثناهای تسویه"
              title="موارد نیازمند بررسی تسویه"
              description="پایه لازم برای release دستی، held earning review و پیگیری ناسازگاری‌ها."
              actions={<Pill tone="warning">{`${filteredExceptions.length} استثنا`}</Pill>}
            >
              <div className="settlements-table-card">
                <DataTable columns={settlementColumns} rows={settlementRows} />

                <div className="settlements-selection-list">
                  {filteredExceptions.slice(0, 8).map((item) => {
                    const id = readText(item, ['id', 'orderId'], '—')
                    const isActive = id === selectedSettlementId

                    return (
                      <button
                        className={`settlements-selection-item ${isActive ? 'is-active' : ''}`}
                        key={id}
                        onClick={() => setSelectedSettlementId(id)}
                        type="button"
                      >
                        <strong>مورد مالی #{id}</strong>
                        <span>{getSettlementStatusLabel(getSettlementStatus(item))}</span>
                        <small>{getSettlementReason(item)}</small>
                      </button>
                    )
                  })}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="استثنای انتخاب شده"
              title={selectedSettlement ? `استثنا #${readText(selectedSettlement, ['id', 'orderId'], '—')}` : 'استثنایی انتخاب نشده'}
              description="این summary حالا نقطه شروع ورود به workspace مالی و تصمیم های واقعی کیف پول و تسویه است."
              actions={
                selectedSettlement ? (
                  <div className="orders-workspace-header-actions">
                    <Pill tone="danger">{getSettlementStatusLabel(getSettlementStatus(selectedSettlement))}</Pill>
                    <button className="orders-secondary-button" onClick={() => onOpenFinanceWorkspace(selectedSettlement)} type="button">
                      ورود به میزکار مالی
                    </button>
                  </div>
                ) : (
                  <Pill tone="danger">بدون انتخاب</Pill>
                )
              }
            >
              {selectedSummary.length ? (
                <div className="settlements-detail-grid">
                  {selectedSummary.map((item) => (
                    <article className="settlements-detail-item" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="fm-message">در این فیلتر هنوز استثنایی برای نمایش جزئیات وجود ندارد.</div>
              )}
            </SectionCard>
          </div>
        </div>
      </LoadableState>
    </div>
  )
}

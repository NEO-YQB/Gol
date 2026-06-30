import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { makeStats, readText, toArray } from '../lib/normalize'
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

function formatPersianNumber(value: unknown) {
  if (typeof value === 'number') return new Intl.NumberFormat('fa-IR').format(value)
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return new Intl.NumberFormat('fa-IR').format(parsed)
    return value
  }
  return '—'
}

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

function translateAnyStatus(status: string) {
  switch (status) {
    case 'PENDING':
      return 'در انتظار تایید'
    case 'PAID':
      return 'پرداخت شده'
    case 'ACCEPTED':
      return 'تایید شده'
    case 'PROCESSING':
      return 'در حال آماده سازی'
    case 'SHIPPED':
      return 'ارسال شده'
    case 'DELIVERED':
      return 'تحویل شده'
    case 'REJECTED_BY_VENDOR':
      return 'رد شده توسط فروشنده'
    case 'CANCELLED':
      return 'لغو شده'
    case 'CANCELLED_BY_ADMIN':
      return 'لغو شده توسط ادمین'
    case 'CANCELLED_BY_CUSTOMER':
      return 'لغو شده توسط مشتری'
    case 'FAILED':
      return 'ناموفق'
    case 'EXPIRED':
      return 'منقضی شده'
    case 'REFUNDED':
      return 'بازگشت کامل وجه'
    case 'PARTIALLY_REFUNDED':
      return 'بازگشت بخشی از وجه'
    case 'REVERSED':
      return 'برگشت خورده'
    case 'RELEASED':
      return 'آزاد شده'
    case 'ON_HOLD':
      return 'در نگه داری'
    default:
      return status || 'نامشخص'
  }
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
            { label: 'کیف پول', value: wallets, detail: '', tone: 'primary' },
            { label: 'استثناها', value: exceptions, detail: '', tone: 'warning' },
            { label: 'خلاصه مالی', value: financeSummary, detail: '', tone: 'success' },
            { label: 'بازگشت وجه', value: refundSummary, detail: '', tone: 'danger' },
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

  const selectedSettlement = useMemo(
    () =>
      filteredExceptions.find((item) => readText(item, ['id', 'orderId'], '') === selectedSettlementId) ?? null,
    [filteredExceptions, selectedSettlementId],
  )

  const selectedSummary = selectedSettlement
    ? [
        { label: 'شناسه', value: readText(selectedSettlement, ['id', 'orderId'], '—') },
        { label: 'وضعیت', value: getSettlementStatusLabel(getSettlementStatus(selectedSettlement)) },
        { label: 'علت', value: translateAnyStatus(getSettlementReason(selectedSettlement)) },
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
          eyebrow="مالی"
          title="مالی و تسویه"
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
            actions={<Pill tone="success">{`${wallets.length} کیف پول`}</Pill>}
          >
            <DataTable columns={walletColumns} rows={walletRows} />
          </SectionCard>

          <div className="settlements-detail-column">
            <SectionCard
              eyebrow="استثناها"
              title="نیازمند بررسی"
              actions={<Pill tone="warning">{`${filteredExceptions.length} استثنا`}</Pill>}
            >
              <div className="settlements-board-list">
                {filteredExceptions.slice(0, 10).map((item) => {
                  const id = readText(item, ['id', 'orderId'], '—')
                  const isActive = id === selectedSettlementId

                  return (
                    <button
                      className={`settlements-board-item ${isActive ? 'is-active' : ''}`}
                      key={id}
                      onClick={() => setSelectedSettlementId(id)}
                      type="button"
                    >
                      <span className="settlements-board-id">#{id}</span>
                      <strong>{getSettlementStatusLabel(getSettlementStatus(item))}</strong>
                      <span>{translateAnyStatus(getSettlementReason(item))}</span>
                      <small>{formatJalaliDate(readText(item, ['updatedAt', 'createdAt'], ''), true)}</small>
                    </button>
                  )
                })}
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="انتخاب شده"
              title={selectedSettlement ? `استثنا #${readText(selectedSettlement, ['id', 'orderId'], '—')}` : 'استثنایی انتخاب نشده'}
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

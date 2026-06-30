import { Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
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
      return 'بازگشت کامل به مشتری'
    case 'PARTIALLY_REFUNDED':
      return 'بازگشت جزئی به مشتری'
    case 'REVERSED':
      return 'واریز به فروشنده'
    case 'RELEASED':
      return 'آزاد شده'
    case 'ON_HOLD':
      return 'در نگه داری'
    case 'MANUAL_CREDIT':
      return 'شارژ دستی'
    case 'MANUAL_DEBIT':
      return 'برداشت دستی'
    case 'ORDER_EARNING_HOLD':
      return 'درآمد سفارش در انتظار تسویه'
    case 'ORDER_EARNING_RELEASE':
      return 'آزادسازی درآمد سفارش'
    case 'ORDER_EARNING_REVERSAL':
      return 'واریز درآمد سفارش به فروشنده'
    case 'CREDIT':
      return 'واریز'
    case 'DEBIT':
      return 'برداشت'
    default:
      return status && status !== 'UNKNOWN' ? status : 'نامشخص'
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
      return 'واریز به فروشنده'
    default:
      return translateAnyStatus(status)
  }
}

function getSettlementStatus(record: FinanceRecord) {
  return readText(record, ['settlementStatus', 'status'], 'UNKNOWN')
}

function getStoreId(record: FinanceRecord) {
  const store = toObject(record.store)
  return readText(record, ['storeId'], readText(store, ['id'], ''))
}

function getWalletStore(record: FinanceRecord) {
  const store = toObject(record.store)
  return readText(store, ['name', 'slug'], readDisplayValue(record.storeName, readDisplayValue(record.storeId)))
}

function getWalletId(record: FinanceRecord, index = 0) {
  return readText(record, ['id'], readText(record, ['storeId'], String(index + 1)))
}

function getSettlementId(record: FinanceRecord, index = 0) {
  return readText(record, ['id', 'orderId'], String(index + 1))
}

function getSettlementTitle(record: FinanceRecord) {
  const status = getSettlementStatus(record)
  if (status === 'ON_HOLD') return 'تسویه عقب‌افتاده'
  if (status === 'REVERSED') return 'واریز مبلغ تسویه به فروشنده'
  return getSettlementStatusLabel(status)
}

function getSettlementReason(record: FinanceRecord) {
  const status = getSettlementStatus(record)
  if (status === 'ON_HOLD') return 'زمان تسویه رسیده اما درآمد هنوز آزاد نشده است.'
  if (status === 'REVERSED') {
    const amount = formatPersianNumber(readText(record, ['settlementReversedAmount'], '—'))
    return `مبلغ واریزی به فروشنده: ${amount}`
  }

  const reason = readText(record, ['reason', 'message', 'type'], '')
  return reason ? translateAnyStatus(reason) : 'نیازمند بررسی مالی'
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
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null)

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
            { label: 'بازگشت به مشتری', value: refundSummary, detail: '', tone: 'danger' },
          ]),
        )
        setWallets(walletList)
        setExceptions(exceptionList)
        if (walletList.length > 0) {
          setSelectedWalletId(getWalletId(walletList[0]))
        }
        if (exceptionList.length > 0) {
          setSelectedSettlementId(getSettlementId(exceptionList[0]))
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
      (item) => getSettlementId(item) === selectedSettlementId,
    )
    if (!hasSelected) {
      setSelectedSettlementId(getSettlementId(filteredExceptions[0]))
    }
  }, [filteredExceptions, selectedSettlementId])

  useEffect(() => {
    if (wallets.length === 0) {
      setSelectedWalletId(null)
      return
    }

    const hasSelected = wallets.some((item, index) => getWalletId(item, index) === selectedWalletId)
    if (!hasSelected) {
      setSelectedWalletId(getWalletId(wallets[0]))
    }
  }, [wallets, selectedWalletId])

  const selectedSettlement = useMemo(
    () =>
      filteredExceptions.find((item, index) => getSettlementId(item, index) === selectedSettlementId) ?? null,
    [filteredExceptions, selectedSettlementId],
  )

  const selectedWallet = useMemo(
    () => wallets.find((item, index) => getWalletId(item, index) === selectedWalletId) ?? null,
    [wallets, selectedWalletId],
  )

  const selectedSummary = selectedSettlement
    ? [
        { label: 'شناسه سفارش', value: getSettlementId(selectedSettlement) },
        { label: 'وضعیت', value: getSettlementStatusLabel(getSettlementStatus(selectedSettlement)) },
        { label: 'دلیل', value: getSettlementReason(selectedSettlement) },
        { label: 'فروشگاه', value: getWalletStore(selectedSettlement) },
        { label: 'بروزرسانی', value: formatJalaliDate(readText(selectedSettlement, ['updatedAt', 'createdAt'], ''), true) },
        { label: 'مبلغ آزادشده', value: formatPersianNumber(readText(selectedSettlement, ['settlementReleasedAmount'], '—')) },
      ]
    : []

  const selectedWalletSummary = selectedWallet
    ? [
        { label: 'فروشگاه', value: getWalletStore(selectedWallet) },
        { label: 'موجودی', value: formatPersianNumber(readText(selectedWallet, ['availableBalance', 'balance'], '—')) },
        { label: 'نگه‌داری‌شده', value: formatPersianNumber(readText(selectedWallet, ['heldBalance', 'heldAmount'], '—')) },
        { label: 'آخرین تغییر', value: formatJalaliDate(readText(selectedWallet, ['updatedAt'], ''), true) },
      ]
    : []

  function openWalletWorkspace(wallet: FinanceRecord) {
    onOpenFinanceWorkspace({
      ...wallet,
      id: `wallet-${getStoreId(wallet) || getWalletId(wallet)}`,
      storeId: getStoreId(wallet),
      storeName: getWalletStore(wallet),
      status: 'WALLET',
      settlementStatus: 'WALLET',
    })
  }

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
            <div className="settlements-board-list">
              {wallets.slice(0, 10).map((item, index) => {
                const id = getWalletId(item, index)
                const isActive = id === selectedWalletId

                return (
                  <button
                    className={`settlements-board-item ${isActive ? 'is-active' : ''}`}
                    key={id}
                    onClick={() => setSelectedWalletId(id)}
                    type="button"
                  >
                    <span className="settlements-board-id">#{getStoreId(item) || id}</span>
                    <strong>{getWalletStore(item)}</strong>
                    <span>{`موجودی: ${formatPersianNumber(readText(item, ['availableBalance', 'balance'], '—'))}`}</span>
                    <small>{`نگه‌داری‌شده: ${formatPersianNumber(readText(item, ['heldBalance', 'heldAmount'], '—'))}`}</small>
                  </button>
                )
              })}
            </div>

            <div className="settlements-wallet-summary">
              {selectedWalletSummary.map((item) => (
                <article className="settlements-detail-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>

            <button
              className="orders-secondary-button settlements-wallet-action"
              disabled={!selectedWallet}
              onClick={() => selectedWallet && openWalletWorkspace(selectedWallet)}
              type="button"
            >
              ورود به مالی فروشگاه
            </button>
          </SectionCard>

          <div className="settlements-detail-column">
            <SectionCard
              eyebrow="استثناها"
              title="نیازمند بررسی"
              actions={<Pill tone="warning">{`${filteredExceptions.length} استثنا`}</Pill>}
            >
              <div className="settlements-board-list">
                {filteredExceptions.slice(0, 10).map((item, index) => {
                  const id = getSettlementId(item, index)
                  const isActive = id === selectedSettlementId

                  return (
                    <button
                      className={`settlements-board-item ${isActive ? 'is-active' : ''}`}
                      key={id}
                      onClick={() => setSelectedSettlementId(id)}
                      type="button"
                    >
                      <span className="settlements-board-id">#{id}</span>
                      <strong>{getSettlementTitle(item)}</strong>
                      <span>{getSettlementReason(item)}</span>
                      <small>{formatJalaliDate(readText(item, ['updatedAt', 'createdAt'], ''), true)}</small>
                    </button>
                  )
                })}
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="انتخاب شده"
              title={selectedSettlement ? `استثنا #${getSettlementId(selectedSettlement)}` : 'استثنایی انتخاب نشده'}
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

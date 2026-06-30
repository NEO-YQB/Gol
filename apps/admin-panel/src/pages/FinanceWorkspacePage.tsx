import { ActivityFeed, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useCallback, useEffect, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { readText } from '../lib/normalize'
import { hasPermission } from '../lib/permissions'
import type { AuthSession } from '../lib/session'

type FinanceRecord = Record<string, unknown>
type FinanceLane = 'overview' | 'wallet' | 'settlement' | 'refunds'

function readDisplayValue(value: unknown, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'object') return fallback
  return String(value)
}

function translateFinanceEnum(value: string) {
  switch (value) {
    case 'CANCELLED_BY_CUSTOMER':
      return 'لغو شده توسط مشتری'
    case 'CANCELLED_BY_ADMIN':
      return 'لغو شده توسط ادمین'
    case 'CANCELLED':
      return 'لغو شده'
    case 'REVERSED':
      return 'برگشت خورده'
    case 'RELEASED':
      return 'آزاد شده'
    case 'ON_HOLD':
      return 'در نگه داری'
    case 'PENDING':
      return 'در انتظار نگه داری'
    case 'DECREMENT':
      return 'کاهش موجودی'
    case 'INCREMENT':
      return 'افزایش موجودی'
    case 'DELIVERED':
      return 'تحویل شده'
    case 'SHIPPED':
      return 'ارسال شده'
    case 'ACCEPTED':
      return 'تایید شده'
    case 'PROCESSING':
      return 'در حال آماده سازی'
    case 'PAID':
      return 'پرداخت شده'
    case 'FAILED':
      return 'ناموفق'
    case 'REFUNDED':
      return 'بازگشت کامل وجه'
    case 'PARTIALLY_REFUNDED':
      return 'بازگشت بخشی از وجه'
    case 'REJECTED_BY_VENDOR':
      return 'رد شده توسط فروشنده'
    case 'WALLET':
      return 'کیف پول فروشگاه'
    case 'MANUAL_CREDIT':
      return 'شارژ دستی'
    case 'MANUAL_DEBIT':
      return 'برداشت دستی'
    case 'ORDER_EARNING_HOLD':
      return 'درآمد سفارش در انتظار تسویه'
    case 'ORDER_EARNING_RELEASE':
      return 'آزادسازی درآمد سفارش'
    case 'ORDER_EARNING_REVERSAL':
      return 'برگشت درآمد سفارش'
    case 'CREDIT':
      return 'واریز'
    case 'DEBIT':
      return 'برداشت'
    default:
      return value && value !== 'UNKNOWN' ? value : 'نامشخص'
  }
}

function toObject(value: unknown): FinanceRecord {
  return typeof value === 'object' && value !== null ? (value as FinanceRecord) : {}
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

function formatPersianNumber(value: unknown) {
  if (typeof value === 'number') return new Intl.NumberFormat('fa-IR').format(value)
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return new Intl.NumberFormat('fa-IR').format(parsed)
    return value
  }
  return '—'
}

function getDecisionLabel(options: {
  settlementStatus: string
  hasWallet: boolean
  canAdjustWallet: boolean
  canReleaseSettlement: boolean
  hasExceptionReason: boolean
}) {
  if (options.hasExceptionReason) {
    return 'استثنا دارد'
  }

  if (options.canReleaseSettlement) {
    return 'آماده آزادسازی'
  }

  if (options.canAdjustWallet && options.hasWallet) {
    return 'نیازمند اصلاح کیف پول'
  }

  if (options.settlementStatus === 'RELEASED') {
    return 'آزاد شده'
  }

  return 'نیازمند بررسی'
}

function getSettlementStatusLabel(status: string) {
  switch (status) {
    case 'WALLET':
      return 'کیف پول فروشگاه'
    case 'PENDING':
      return 'در انتظار نگه داری'
    case 'ON_HOLD':
      return 'در نگه داری'
    case 'RELEASED':
      return 'آزاد شده'
    case 'REVERSED':
      return 'برگشت خورده'
    default:
      return translateFinanceEnum(status)
  }
}

function getToneByStatus(status: string) {
  if (status === 'REVERSED') return 'danger' as const
  if (status === 'ON_HOLD' || status === 'PENDING') return 'warning' as const
  if (status === 'RELEASED') return 'success' as const
  return 'primary' as const
}

export function FinanceWorkspacePage({
  session,
  settlement,
  onBack,
}: {
  session: AuthSession
  settlement: Record<string, unknown> | null
  onBack: () => void
}) {
  const [loading, setLoading] = useState(Boolean(settlement))
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [activeLane, setActiveLane] = useState<FinanceLane>('overview')
  const [walletDetail, setWalletDetail] = useState<FinanceRecord | null>(null)
  const [financeSummary, setFinanceSummary] = useState<FinanceRecord | null>(null)
  const [refundSummary, setRefundSummary] = useState<FinanceRecord | null>(null)
  const [walletForm, setWalletForm] = useState({
    direction: 'INCREMENT',
    type: '',
    amount: '',
    title: '',
    description: '',
  })

  useNoticeEffect(actionError, 'error')
  useNoticeEffect(actionMessage, 'success')

  const settlementId = readText(settlement ?? {}, ['id', 'orderId'], '')
  const storeId = readText(settlement ?? {}, ['storeId'], '')
  const orderId = readText(settlement ?? {}, ['orderId', 'id'], '')
  const settlementStatus = readText(settlement ?? {}, ['settlementStatus', 'status'], 'UNKNOWN')
  const isWalletWorkspace = settlementStatus === 'WALLET'
  const canAdjustWallet = hasPermission(session, 'update', 'StoreWallet') || hasPermission(session, 'manage', 'all')
  const canReleaseSettlement = !isWalletWorkspace && (hasPermission(session, 'update', 'StoreWallet') || hasPermission(session, 'manage', 'all')) && settlementStatus === 'ON_HOLD'

  const loadWorkspace = useCallback(async () => {
    if (!settlementId) {
      setLoading(false)
      setError('برای ورود به میزکار مالی، ابتدا یک مورد مالی را از کارتابل انتخاب کن.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [walletPayload, summaryPayload, refundPayload] = await Promise.all([
        storeId ? adminApi.getWalletByStore(session, storeId) : Promise.resolve(null),
        adminApi.getFinanceSummary(session),
        adminApi.getRefundSummary(session),
      ])

      setWalletDetail(walletPayload ? toObject(walletPayload) : isWalletWorkspace ? toObject(settlement) : null)
      setFinanceSummary(toObject(summaryPayload))
      setRefundSummary(toObject(refundPayload))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری میزکار مالی')
    } finally {
      setLoading(false)
    }
  }, [isWalletWorkspace, session, settlement, settlementId, storeId])

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

  const stats = [
    {
      label: 'وضعیت تسویه',
      value: getSettlementStatusLabel(settlementStatus),
      delta: translateFinanceEnum(readText(settlement ?? {}, ['type', 'settlementStatus', 'status'], '—')),
      detail: '',
      tone: getToneByStatus(settlementStatus),
    },
    {
      label: 'فروشگاه',
      value: readText(settlement ?? {}, ['storeName', 'store', 'storeId'], '—'),
      delta: 'ریال',
      detail: '',
      tone: 'primary' as const,
    },
    {
      label: 'موجودی',
      value: formatPersianNumber(readText(walletDetail ?? {}, ['balance', 'availableBalance'], '—')),
      delta: `نگه داری: ${formatPersianNumber(readText(walletDetail ?? {}, ['heldBalance', 'heldAmount'], '—'))}`,
      detail: '',
      tone: 'success' as const,
    },
    {
      label: 'آخرین تغییر',
      value: formatJalaliDate(readText(settlement ?? {}, ['updatedAt', 'createdAt'], ''), true),
      delta: translateFinanceEnum(readDisplayValue((settlement ?? {}).reason, readDisplayValue((settlement ?? {}).message, 'بدون علت ثبت شده'))),
      detail: '',
      tone: 'warning' as const,
    },
  ]

  const laneCards = [
    { key: 'overview' as const, title: 'نمای کلی', detail: getSettlementStatusLabel(settlementStatus) },
    { key: 'wallet' as const, title: 'کیف پول', detail: canAdjustWallet ? 'قابل اقدام' : 'فقط مشاهده' },
    { key: 'settlement' as const, title: 'تسویه', detail: canReleaseSettlement ? 'آماده' : 'غیرفعال' },
    { key: 'refunds' as const, title: 'جمع‌بندی', detail: 'گزارش' },
  ]

  const decisionLabel = getDecisionLabel({
    settlementStatus,
    hasWallet: Boolean(walletDetail),
    canAdjustWallet,
    canReleaseSettlement,
    hasExceptionReason: Boolean(readText(settlement ?? {}, ['reason', 'message'], '')),
  })

  const overviewItems = [
    { label: 'شناسه مورد', value: isWalletWorkspace ? storeId || settlementId || '—' : settlementId || '—' },
    { label: 'شناسه سفارش', value: isWalletWorkspace ? '—' : orderId || '—' },
    { label: 'وضعیت', value: getSettlementStatusLabel(settlementStatus) },
    { label: 'فروشگاه', value: readText(settlement ?? {}, ['storeName', 'store', 'storeId'], '—') },
    { label: 'علت', value: translateFinanceEnum(readText(settlement ?? {}, ['reason', 'message', 'settlementStatus'], '—')), wide: true },
    { label: 'آخرین به روزرسانی', value: formatJalaliDate(readText(settlement ?? {}, ['updatedAt', 'createdAt'], ''), true), wide: true },
  ]

  async function runAction(key: string, action: () => Promise<unknown>, successMessage: string) {
    setActionBusy(key)
    setActionError(null)
    setActionMessage(null)
    try {
      await action()
      await loadWorkspace()
      setActionMessage(successMessage)
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'اجرای عملیات مالی با خطا مواجه شد')
    } finally {
      setActionBusy(null)
    }
  }

  return (
    <div className="fm-stack finance-workspace-page">
      <LoadableState error={error} loading={loading}>
        <div className="fm-grid finance-workspace-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="میزکار مالی"
          title={isWalletWorkspace ? `مالی ${readText(settlement ?? {}, ['storeName', 'store', 'storeId'], '—')}` : `مالی #${settlementId || '—'}`}
          actions={
            <div className="orders-workspace-header-actions">
              <Pill tone={getToneByStatus(settlementStatus)}>{getSettlementStatusLabel(settlementStatus)}</Pill>
              <button className="orders-secondary-button" onClick={onBack} type="button">
                بازگشت به کارتابل مالی
              </button>
            </div>
          }
        >
          <div className="orders-workspace-lanes">
            {laneCards.map((lane) => (
              <button
                className={`orders-lane-card${activeLane === lane.key ? ' is-active' : ''}`}
                key={lane.key}
                onClick={() => setActiveLane(lane.key)}
                type="button"
              >
                <strong>{lane.title}</strong>
                <small>{lane.detail}</small>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="اقدام"
          title="وضعیت اقدام"
          actions={<Pill tone={canReleaseSettlement ? 'success' : 'warning'}>{canReleaseSettlement ? 'آماده اقدام' : 'نیازمند مرور'}</Pill>}
        >
          <div className="orders-decision-strip">
            <strong>{decisionLabel}</strong>
          </div>
        </SectionCard>

        <div className="orders-workspace-body">
          <div className="orders-workspace-main">
            <SectionCard
              eyebrow="خلاصه مالی"
              title="خلاصه"
              actions={<Pill tone="primary">نمای خلاصه</Pill>}
            >
              <div className="orders-summary-grid">
                {overviewItems.map((item) => (
                  <article className={`orders-detail-item${item.wide ? ' orders-detail-item--wide' : ''}`} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>
            </SectionCard>

            {activeLane === 'wallet' || activeLane === 'overview' ? (
              <SectionCard
                eyebrow="کیف پول فروشگاه"
                title="کیف پول"
                actions={<Pill tone={canAdjustWallet ? 'warning' : 'primary'}>{canAdjustWallet ? 'قابل ویرایش' : 'فقط مشاهده'}</Pill>}
              >
                <div className="orders-summary-grid">
                  {[
                    { label: 'موجودی', value: formatPersianNumber(readText(walletDetail ?? {}, ['balance', 'availableBalance'], '—')) },
                    { label: 'مبلغ نگه داری شده', value: formatPersianNumber(readText(walletDetail ?? {}, ['heldBalance', 'heldAmount'], '—')) },
                    { label: 'آخرین تغییر', value: formatJalaliDate(readText(walletDetail ?? {}, ['updatedAt'], ''), true) },
                  ].map((item) => (
                    <article className="orders-detail-item" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>

                <form
                  className="orders-action-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!storeId) {
                      setActionError('برای این مورد، شناسه فروشگاه معتبر دیده نمی شود.')
                      return
                    }
                    if (!walletForm.title.trim() || !walletForm.amount.trim()) {
                      setActionError('برای اصلاح مالی کیف پول، عنوان و مبلغ الزامی است.')
                      return
                    }

                    void runAction(
                      'wallet-adjustment',
                      () =>
                        adminApi.adjustWallet(session, storeId, {
                          direction: walletForm.direction,
                          amount: Number(walletForm.amount),
                          type: walletForm.type.trim() || undefined,
                          title: walletForm.title.trim(),
                          description: walletForm.description.trim() || undefined,
                        }),
                      'اصلاح مالی کیف پول با موفقیت ثبت شد.',
                    )
                  }}
                >
                  <div className="fm-field">
                    <label htmlFor="finance-wallet-direction">نوع اثر</label>
                    <select
                      id="finance-wallet-direction"
                      disabled={!canAdjustWallet || actionBusy === 'wallet-adjustment'}
                      onChange={(event) => setWalletForm((current) => ({ ...current, direction: event.target.value }))}
                      value={walletForm.direction}
                    >
                      <option value="INCREMENT">افزایش موجودی</option>
                      <option value="DECREMENT">کاهش موجودی</option>
                    </select>
                  </div>
                  <div className="fm-field">
                    <label htmlFor="finance-wallet-amount">مبلغ</label>
                    <input
                      id="finance-wallet-amount"
                      inputMode="decimal"
                      onChange={(event) => setWalletForm((current) => ({ ...current, amount: event.target.value }))}
                      placeholder="مثلا 500000"
                      value={walletForm.amount}
                    />
                  </div>
                  <div className="fm-field">
                    <label htmlFor="finance-wallet-title">عنوان ثبت</label>
                    <input
                      id="finance-wallet-title"
                      onChange={(event) => setWalletForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="مثلا اصلاح مغایرت مالی"
                      value={walletForm.title}
                    />
                  </div>
                  <div className="fm-field">
                    <label htmlFor="finance-wallet-type">نوع ثبت</label>
                    <input
                      id="finance-wallet-type"
                      onChange={(event) => setWalletForm((current) => ({ ...current, type: event.target.value }))}
                      placeholder="اختیاری"
                      value={walletForm.type}
                    />
                  </div>
                  <div className="fm-field">
                    <label htmlFor="finance-wallet-description">توضیح تکمیلی</label>
                    <textarea
                      id="finance-wallet-description"
                      onChange={(event) => setWalletForm((current) => ({ ...current, description: event.target.value }))}
                      rows={3}
                      value={walletForm.description}
                    />
                  </div>
                  <button className="orders-primary-button" disabled={!canAdjustWallet || actionBusy === 'wallet-adjustment'} type="submit">
                    {actionBusy === 'wallet-adjustment' ? 'در حال ثبت اصلاح مالی...' : 'ثبت اصلاح مالی کیف پول'}
                  </button>
                </form>
              </SectionCard>
            ) : null}

            {activeLane === 'settlement' || activeLane === 'overview' ? (
              <SectionCard
                eyebrow="آزادسازی تسویه"
                title="تسویه"
                actions={<Pill tone={canReleaseSettlement ? 'success' : 'warning'}>{canReleaseSettlement ? 'قابل اجرا' : 'غیرفعال'}</Pill>}
              >
                <div className="orders-action-stack">
                  <button
                    className="orders-primary-button"
                    disabled={!canReleaseSettlement || actionBusy === 'release-settlement'}
                    onClick={() =>
                      void runAction(
                        'release-settlement',
                        () => adminApi.releaseOrderSettlement(session, orderId),
                        'تسویه این مورد با موفقیت آزاد شد.',
                      )
                    }
                    type="button"
                  >
                    {actionBusy === 'release-settlement' ? 'در حال آزادسازی تسویه...' : 'آزادسازی تسویه'}
                  </button>
                </div>
              </SectionCard>
            ) : null}

            {activeLane === 'refunds' || activeLane === 'overview' ? (
              <SectionCard
                eyebrow="جمع‌بندی"
                title="مالی و بازگشت وجه"
                actions={<Pill tone="danger">گزارش فشرده</Pill>}
              >
                <div className="orders-summary-grid">
                  {[
                    { label: 'خلاصه کیف پول', value: readText(financeSummary ?? {}, ['total', 'count'], '—') },
                    { label: 'خلاصه بازگشت وجه', value: readText(refundSummary ?? {}, ['total', 'count'], '—') },
                    { label: 'آخرین بروزرسانی خلاصه', value: formatJalaliDate(readText(financeSummary ?? {}, ['updatedAt'], ''), true), wide: true },
                  ].map((item) => (
                    <article className={`orders-detail-item${item.wide ? ' orders-detail-item--wide' : ''}`} key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              </SectionCard>
            ) : null}
          </div>

          <div className="orders-workspace-side">
            <SectionCard
              eyebrow="فید مالی"
              title="ردپا"
              actions={<Pill tone="warning">مرور سریع</Pill>}
            >
              <ActivityFeed
                items={[
                  {
                    id: 'finance-item-1',
                    title: 'وضعیت فعلی مورد',
                    meta: getSettlementStatusLabel(settlementStatus),
                    description: translateFinanceEnum(readDisplayValue((settlement ?? {}).reason, readDisplayValue((settlement ?? {}).message, 'علتی برای این مورد ثبت نشده است.'))),
                    tone: getToneByStatus(settlementStatus),
                  },
                  {
                    id: 'finance-item-2',
                    title: 'موجودی کیف پول',
                    meta: formatPersianNumber(readText(walletDetail ?? {}, ['balance', 'availableBalance'], '—')),
                    description: `مبلغ نگه داری شده: ${formatPersianNumber(readText(walletDetail ?? {}, ['heldBalance', 'heldAmount'], '—'))}`,
                    tone: 'primary',
                  },
                  {
                    id: 'finance-item-3',
                    title: 'زمان آخرین تغییر',
                    meta: formatJalaliDate(readText(settlement ?? {}, ['updatedAt', 'createdAt'], ''), true),
                    description: '',
                    tone: 'warning',
                  },
                ]}
              />
            </SectionCard>
          </div>
        </div>
      </LoadableState>
    </div>
  )
}

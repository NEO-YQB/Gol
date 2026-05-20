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
    default:
      return value || 'نامشخص'
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
    return 'این مورد مالی استثنا دارد؛ قبل از هر اقدام، علت و سابقه آن را مرور کن.'
  }

  if (options.canReleaseSettlement) {
    return 'اگر مانع فعالی وجود ندارد، این مورد برای آزادسازی تسویه آماده است.'
  }

  if (options.canAdjustWallet && options.hasWallet) {
    return 'اگر ناسازگاری مالی تایید شده است، adjustment کیف پول را با توضیح شفاف ثبت کن.'
  }

  if (options.settlementStatus === 'RELEASED') {
    return 'این مورد قبلا آزاد شده و بیشتر برای مرور سابقه و جمع بندی مناسب است.'
  }

  return 'در این workspace ابتدا summary مالی را مرور کن و بعد وارد action مناسب شو.'
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
  const settlementStatus = readText(settlement ?? {}, ['status'], 'UNKNOWN')
  const canAdjustWallet = hasPermission(session, 'update', 'StoreWallet') || hasPermission(session, 'manage', 'all')
  const canReleaseSettlement = (hasPermission(session, 'update', 'StoreWallet') || hasPermission(session, 'manage', 'all')) && settlementStatus === 'ON_HOLD'

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

      setWalletDetail(walletPayload ? toObject(walletPayload) : null)
      setFinanceSummary(toObject(summaryPayload))
      setRefundSummary(toObject(refundPayload))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری میزکار مالی')
    } finally {
      setLoading(false)
    }
  }, [session, settlementId, storeId])

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

  const stats = [
    {
      label: 'وضعیت تسویه',
      value: getSettlementStatusLabel(settlementStatus),
      delta: translateFinanceEnum(readText(settlement ?? {}, ['type'], '—')),
      detail: 'جایگاه فعلی این مورد در چرخه تسویه',
      hint: 'اگر این مورد هنوز در نگه داری است، آزادسازی فقط بعد از رفع مانع منطقی است.',
      tone: getToneByStatus(settlementStatus),
    },
    {
      label: 'فروشگاه',
      value: readText(settlement ?? {}, ['storeName', 'store', 'storeId'], '—'),
      delta: 'ریال',
      detail: 'فروشگاه و زمینه مالی مرتبط با این مورد',
      hint: 'در adjustment و بررسی استثنا باید همیشه مطمئن باشی روی فروشگاه درست کار می کنی.',
      tone: 'primary' as const,
    },
    {
      label: 'موجودی قابل مشاهده',
      value: formatPersianNumber(readText(walletDetail ?? {}, ['balance', 'availableBalance'], '—')),
      delta: `نگه داری: ${formatPersianNumber(readText(walletDetail ?? {}, ['heldBalance', 'heldAmount'], '—'))}`,
      detail: 'تصویر سریع از کیف پول و بخش نگه داری شده',
      hint: 'این کارت برای فهم سریع balance و held amount در لحظه طراحی شده است.',
      tone: 'success' as const,
    },
    {
      label: 'ردپای مالی',
      value: formatJalaliDate(readText(settlement ?? {}, ['updatedAt', 'createdAt'], ''), true),
      delta: translateFinanceEnum(readDisplayValue((settlement ?? {}).reason, readDisplayValue((settlement ?? {}).message, 'بدون علت ثبت شده'))),
      detail: 'آخرین زمان تغییر و علت اصلی این مورد',
      hint: 'اگر تصمیم مالی مبهم است، از همین کارت شروع کن و بعد سراغ actionها برو.',
      tone: 'warning' as const,
    },
  ]

  const laneCards = [
    { key: 'overview' as const, title: 'نمای کلی', description: 'مرور summary مالی، کیف پول و علت استثنا', detail: getSettlementStatusLabel(settlementStatus) },
    { key: 'wallet' as const, title: 'کیف پول', description: 'adjustment و بررسی balance و held amount', detail: canAdjustWallet ? 'قابل اقدام' : 'فقط مشاهده' },
    { key: 'settlement' as const, title: 'آزادسازی تسویه', description: 'release دستی و کنترل readiness مالی', detail: canReleaseSettlement ? 'آماده' : 'غیرفعال' },
    { key: 'refunds' as const, title: 'جمع بندی مالی', description: 'summaryهای refund و settlement برای مرور سریع', detail: 'گزارش فشرده' },
  ]

  const decisionLabel = getDecisionLabel({
    settlementStatus,
    hasWallet: Boolean(walletDetail),
    canAdjustWallet,
    canReleaseSettlement,
    hasExceptionReason: Boolean(readText(settlement ?? {}, ['reason', 'message'], '')),
  })

  const overviewItems = [
    { label: 'شناسه مورد', value: settlementId || '—' },
    { label: 'شناسه سفارش', value: orderId || '—' },
    { label: 'وضعیت', value: getSettlementStatusLabel(settlementStatus) },
    { label: 'فروشگاه', value: readText(settlement ?? {}, ['storeName', 'store', 'storeId'], '—') },
    { label: 'علت', value: readText(settlement ?? {}, ['reason', 'message'], '—'), wide: true },
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
          eyebrow="workspace مالی"
          title={`رسیدگی مالی به مورد #${settlementId || '—'}`}
          description="اینجا محل تصمیم های واقعی مالی است؛ کارتابل اصلی فقط برای انتخاب و triage می ماند."
          hint="اول summary را بخوان، بعد تصمیم بگیر adjustment لازم است یا آزادسازی تسویه."
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
                <span>{lane.description}</span>
                <small>{lane.detail}</small>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="پیشنهاد اقدام"
          title="الان مهم ترین کار در این مورد مالی چیست؟"
          description="این نوار تصمیم برای کم کردن تردید اپراتور مالی ساخته شده است."
          actions={<Pill tone={canReleaseSettlement ? 'success' : 'warning'}>{canReleaseSettlement ? 'آماده اقدام' : 'نیازمند مرور'}</Pill>}
        >
          <div className="orders-decision-strip">
            <strong>{decisionLabel}</strong>
            <p>
              {canReleaseSettlement
                ? 'این مورد در ظاهر آماده آزادسازی است، اما قبل از اقدام مطمئن شو مانع دیگری در support یا finance باقی نمانده باشد.'
                : 'اگر هنوز release مجاز نیست، علت را از summary و وضعیت کیف پول دنبال کن.'}
            </p>
          </div>
        </SectionCard>

        <div className="orders-workspace-body">
          <div className="orders-workspace-main">
            <SectionCard
              eyebrow="خلاصه مالی"
              title="مرور سریع این مورد"
              description="این بخش برای گرفتن تصویر کامل و سریع از فروشگاه، وضعیت، علت و زمان تغییر ساخته شده است."
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
                title="balance، held amount و adjustment"
                description="اگر نیاز به اصلاح مالی تایید شده وجود دارد، adjustment را از همینجا ثبت کن."
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
                title="کنترل آزادسازی تسویه"
                description="اگر این مورد در نگه داری است و مانع فعالی وجود ندارد، آزادسازی را از همینجا انجام بده."
                actions={<Pill tone={canReleaseSettlement ? 'success' : 'warning'}>{canReleaseSettlement ? 'قابل اجرا' : 'غیرفعال'}</Pill>}
              >
                <div className="orders-action-stack">
                  <p className="orders-inline-note">
                    {canReleaseSettlement
                      ? 'این مورد در وضعیت مناسبی برای آزادسازی قرار گرفته است.'
                      : 'آزادسازی فقط وقتی فعال است که مورد هنوز در نگه داری باشد و role شما اجازه این کار را داشته باشد.'}
                  </p>
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
                eyebrow="جمع بندی مالی"
                title="خلاصه های مالی و بازگشت وجه"
                description="برای مرور سریع وضعیت عمومی بخش مالی، خلاصه های backend اینجا به شکل فارسی نمایش داده می شوند."
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
              title="ردپای مالی و summaryهای مرتبط"
              description="این ستون برای مرور سریع summaryها و تصمیم های مرتبط مالی نگه داشته شده است."
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
                    description: 'مرور سریع روی آخرین زمان به روزرسانی این مورد مالی.',
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

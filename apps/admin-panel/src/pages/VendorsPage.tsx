import { ActivityFeed, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import { hasPermission } from '../lib/permissions'
import type { AuthSession } from '../lib/session'

type VendorRecord = Record<string, unknown>

const riskStatuses = ['ALL', 'AT_RISK', 'WATCHLIST', 'GOOD', 'EXCELLENT'] as const

function formatPersianNumber(value: number | string | null | undefined) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(numeric)) {
    return value === null || value === undefined || value === '' ? '—' : String(value)
  }

  return new Intl.NumberFormat('fa-IR').format(numeric)
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

function toObject(value: unknown): VendorRecord {
  return typeof value === 'object' && value !== null ? (value as VendorRecord) : {}
}

function getStatusTone(status: string) {
  if (status === 'AT_RISK') return 'danger' as const
  if (status === 'WATCHLIST') return 'warning' as const
  if (status === 'GOOD' || status === 'EXCELLENT') return 'success' as const
  return 'primary' as const
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'AT_RISK':
      return 'پرریسک'
    case 'WATCHLIST':
      return 'تحت نظر'
    case 'GOOD':
      return 'پایدار'
    case 'EXCELLENT':
      return 'عالی'
    case 'ALL':
      return 'همه'
    default:
      return status && status !== 'UNKNOWN' ? status : 'نامشخص'
  }
}

function getMetric(record: VendorRecord, key: string) {
  return toObject(record.periodMetrics)[key]
}

function toDisplayValue(value: unknown): string | number | null | undefined {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    value === null ||
    value === undefined
  ) {
    return value
  }

  return undefined
}

function getFinanceNumber(summary: VendorRecord, keys: string[]) {
  let current: unknown = summary

  for (const key of keys) {
    current = toObject(current)[key]
  }

  if (typeof current === 'number') return current
  if (typeof current === 'string' && current.trim() !== '') {
    const parsed = Number(current)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  return 0
}

function formatPolicy(policy: unknown) {
  const record = toObject(policy)
  const entries = Object.entries(record)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(
      ([key, value]) =>
        `${translatePolicyKey(key)}: ${typeof value === 'boolean' ? (value ? 'بله' : 'خیر') : String(value)}`,
    )

  return entries.length ? entries.join(' | ') : '—'
}

function translatePolicyKey(key: string) {
  switch (key) {
    case 'autoSettlementHoldEnabled':
      return 'نگه‌داری خودکار تسویه'
    case 'settlementHoldDaysOverride':
      return 'تعداد روز نگه‌داری'
    case 'manualReviewRequired':
      return 'نیازمند بررسی دستی'
    case 'blockNewDiscounts':
      return 'جلوگیری از تخفیف تازه'
    case 'note':
      return 'توضیح'
    case 'metadata':
      return 'جزئیات تکمیلی'
    default:
      return key
  }
}

function translateEventType(value: string) {
  switch (value) {
    case 'VendorRiskPolicy':
      return 'سیاست ریسک فروشنده'
    case 'Store':
      return 'فروشگاه'
    case 'WalletTransaction':
      return 'گردش کیف پول'
    case 'Settlement':
      return 'تسویه'
    case 'SupportTicket':
      return 'تیکت پشتیبانی'
    case 'Review':
      return 'نظر مشتری'
    default:
      return value || 'رخداد'
  }
}

export function VendorsPage({
  session,
  onOpenVendorWorkspace,
}: {
  session: AuthSession
  onOpenVendorWorkspace: (store: Record<string, unknown>) => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [riskSummary, setRiskSummary] = useState<VendorRecord[]>([])
  const [financeSummary, setFinanceSummary] = useState<VendorRecord>({})
  const [rangeLabel, setRangeLabel] = useState('بازه پیش‌فرض گزارش')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [totalStores, setTotalStores] = useState(0)
  const [statusFilter, setStatusFilter] = useState<(typeof riskStatuses)[number]>('ALL')
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineError, setTimelineError] = useState<string | null>(null)
  const [selectedStoreDetail, setSelectedStoreDetail] = useState<VendorRecord | null>(null)
  useNoticeEffect(timelineError, 'error')
  const canReadFinance =
    hasPermission(session, 'manage', 'all') ||
    hasPermission(session, 'read', 'StoreWallet') ||
    hasPermission(session, 'read', 'WalletTransaction')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [riskPayload, financePayload] = await Promise.all([
          adminApi.getVendorRiskSummary(session, {
            page,
            limit: 10,
            status: statusFilter === 'ALL' ? undefined : statusFilter,
          }),
          canReadFinance
            ? adminApi.getFinanceSummary(session)
            : Promise.resolve({}),
        ])

        if (!active) return

        const riskRecord = toObject(riskPayload)
        const financeRecord = toObject(financePayload)
        const rows = toArray(riskRecord)
        const meta = toObject(riskRecord.meta)
        const range = toObject(riskRecord.range)

        setRiskSummary(rows)
        setFinanceSummary(financeRecord)
        setTotalStores(Number(meta.total ?? rows.length))
        setLastPage(Math.max(1, Number(meta.lastPage ?? 1)))
        setRangeLabel(
          `${readText(range, ['fromDateJalali'], '—')} تا ${readText(range, ['toDateJalali'], '—')}`,
        )

        if (rows.length === 0) {
          setSelectedStoreId(null)
          setSelectedStoreDetail(null)
          return
        }

        const firstStoreId = readText(rows[0], ['storeId'], '')
        const nextSelected = rows.some((item) => readText(item, ['storeId'], '') === selectedStoreId)
          ? selectedStoreId
          : firstStoreId

        setSelectedStoreId(nextSelected)
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری فروشنده‌ها و گزارش ریسک')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [canReadFinance, page, session, statusFilter])

  useEffect(() => {
    const storeId = selectedStoreId

    if (!storeId) {
      setSelectedStoreDetail(null)
      setTimelineError(null)
      return
    }

    const activeStoreId = storeId
    let active = true

    async function loadTimeline() {
      setTimelineLoading(true)
      setTimelineError(null)

      try {
        const payload = await adminApi.getVendorPolicyTimeline(session, activeStoreId)
        if (!active) return
        setSelectedStoreDetail(toObject(payload))
      } catch (loadError) {
        if (!active) return
        setTimelineError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری timeline فروشنده')
      } finally {
        if (active) setTimelineLoading(false)
      }
    }

    void loadTimeline()
    return () => {
      active = false
    }
  }, [selectedStoreId, session])

  const statusCounts = useMemo(
    () =>
      riskSummary.reduce<Record<string, number>>((accumulator, item) => {
        const status = readText(item, ['vendorHealthStatus'], 'UNKNOWN')
        accumulator[status] = (accumulator[status] ?? 0) + 1
        return accumulator
      }, {}),
    [riskSummary],
  )

  const selectedSummaryRecord = useMemo(
    () => riskSummary.find((item) => readText(item, ['storeId'], '') === selectedStoreId) ?? null,
    [riskSummary, selectedStoreId],
  )

  const selectedStore = useMemo(() => toObject(selectedStoreDetail?.store), [selectedStoreDetail])
  const selectedPolicy = useMemo(() => toObject(selectedStoreDetail?.currentPolicy), [selectedStoreDetail])
  const timeline = useMemo(() => toArray(selectedStoreDetail?.timeline), [selectedStoreDetail])

  const timelineFeed = useMemo(
    () =>
      timeline.slice(0, 6).map((item, index) => ({
        id: readText(item, ['id'], String(index + 1)),
        title: readText(item, ['summary'], '') || translateEventType(readText(item, ['aggregateType'], '')),
        meta: formatJalaliDate(item.createdAt),
        description: translateEventType(readText(item, ['aggregateType'], 'رخداد ریسک')),
        tone: index % 2 === 0 ? ('warning' as const) : ('success' as const),
      })),
    [timeline],
  )

  const stats = useMemo(
    () => [
      {
        label: 'فروشنده‌ها',
        value: formatPersianNumber(riskSummary.length),
        delta: `${formatPersianNumber(totalStores)} فروشگاه در کل`,
        detail: '',
        tone: 'primary' as const,
      },
      {
        label: 'پرریسک',
        value: formatPersianNumber(statusCounts.AT_RISK ?? 0),
        delta: 'فوری',
        detail: '',
        tone: 'danger' as const,
      },
      {
        label: 'تحت نظر',
        value: formatPersianNumber(statusCounts.WATCHLIST ?? 0),
        delta: 'پایش',
        detail: '',
        tone: 'warning' as const,
      },
      {
        label: 'تسویه‌ها',
        value: formatPersianNumber(getFinanceNumber(financeSummary, ['settlements', 'settled'])),
        delta: rangeLabel,
        detail: '',
        tone: 'success' as const,
      },
    ],
    [financeSummary, rangeLabel, riskSummary.length, statusCounts.AT_RISK, statusCounts.WATCHLIST, totalStores],
  )

  const financeHighlights = useMemo(
    () => [
      {
        label: 'موجودی کل',
        value: formatPersianNumber(getFinanceNumber(financeSummary, ['wallets', 'currentBalanceTotal'])),
      },
      {
        label: 'موجودی آزاد',
        value: formatPersianNumber(getFinanceNumber(financeSummary, ['wallets', 'availableBalanceTotal'])),
      },
      {
        label: 'موجودی نگه‌داری‌شده',
        value: formatPersianNumber(getFinanceNumber(financeSummary, ['wallets', 'heldBalanceTotal'])),
      },
      {
        label: 'مبلغ بستانکار',
        value: formatPersianNumber(getFinanceNumber(financeSummary, ['transactions', 'creditAmount'])),
      },
      {
        label: 'مبلغ بدهکار',
        value: formatPersianNumber(getFinanceNumber(financeSummary, ['transactions', 'debitAmount'])),
      },
      {
        label: 'کیف پول فروشگاه‌ها',
        value: formatPersianNumber(getFinanceNumber(financeSummary, ['wallets', 'storeCount'])),
      },
    ],
    [financeSummary],
  )

  const selectedSummary = selectedSummaryRecord
    ? [
        { label: 'فروشگاه', value: readText(selectedSummaryRecord, ['storeName'], '—') },
        { label: 'وضعیت فروش', value: selectedSummaryRecord.isActive === false ? 'غیرفعال' : 'فعال' },
        { label: 'وضعیت سلامت', value: getStatusLabel(readText(selectedSummaryRecord, ['vendorHealthStatus'], '—')) },
        { label: 'امتیاز سلامت', value: formatPersianNumber(readText(selectedSummaryRecord, ['vendorHealthScore'], '—')) },
        { label: 'امتیاز مشتری', value: formatPersianNumber(readText(selectedSummaryRecord, ['customerRatingAverage'], '—')) },
        { label: 'تعداد امتیاز', value: formatPersianNumber(readText(selectedSummaryRecord, ['customerRatingCount'], '—')) },
        { label: 'آخرین محاسبه', value: formatJalaliDate(selectedSummaryRecord.vendorHealthCalculatedAt) },
        { label: 'تیکت‌های بازه', value: formatPersianNumber(toDisplayValue(getMetric(selectedSummaryRecord, 'ticketCount'))) },
        { label: 'ارجاع مالی', value: formatPersianNumber(toDisplayValue(getMetric(selectedSummaryRecord, 'escalatedCount'))) },
        { label: 'بازگشت به مشتری', value: formatPersianNumber(toDisplayValue(getMetric(selectedSummaryRecord, 'refundCount'))) },
        { label: 'واریز به فروشنده', value: formatPersianNumber(toDisplayValue(getMetric(selectedSummaryRecord, 'reversalCount'))) },
      ]
    : []

  const operationalDigest = selectedSummaryRecord
    ? [
        {
          label: 'فشار عملیاتی',
          value: `${formatPersianNumber(toDisplayValue(getMetric(selectedSummaryRecord, 'ticketCount')))} تیکت`,
          detail: `${formatPersianNumber(toDisplayValue(getMetric(selectedSummaryRecord, 'escalatedCount')))} ارجاع مالی در همین بازه`,
        },
        {
          label: 'سیگنال مشتری',
          value: `${formatPersianNumber(readText(selectedSummaryRecord, ['customerRatingAverage'], '—'))} از ۵`,
          detail: `${formatPersianNumber(readText(selectedSummaryRecord, ['customerRatingCount'], '—'))} رأی ثبت‌شده`,
        },
        {
          label: 'policy موثر',
          value: formatPolicy(selectedPolicy.effective),
          detail: `فهرست رخدادها اکنون ${formatPersianNumber(timeline.length)} مورد دارد`,
        },
      ]
    : []

  const healthBoard = [
    {
      label: 'عالی',
      value: formatPersianNumber(statusCounts.EXCELLENT ?? 0),
      detail: '',
      tone: 'success' as const,
    },
    {
      label: 'پایدار',
      value: formatPersianNumber(statusCounts.GOOD ?? 0),
      detail: '',
      tone: 'primary' as const,
    },
    {
      label: 'تحت نظر',
      value: formatPersianNumber(statusCounts.WATCHLIST ?? 0),
      detail: '',
      tone: 'warning' as const,
    },
    {
      label: 'پرریسک',
      value: formatPersianNumber(statusCounts.AT_RISK ?? 0),
          detail: '',
          tone: 'danger' as const,
        },
      ]

  return (
    <div className="fm-stack">
      <LoadableState error={error} loading={loading}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="فروشنده‌ها"
          title="ریسک فروشنده‌ها"
          actions={<Pill tone="warning">{rangeLabel}</Pill>}
        >
          <div className="vendors-toolbar">
            <div className="vendors-filters">
              {riskStatuses.map((status) => (
                <button
                  className={`vendors-filter-chip${statusFilter === status ? ' is-active' : ''}`}
                  key={status}
                  onClick={() => {
                    setPage(1)
                    setStatusFilter(status)
                  }}
                  type="button"
                >
                  {getStatusLabel(status)}
                </button>
              ))}
            </div>

            <div className="vendors-pagination">
              <button
                className="vendors-page-button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                صفحه قبل
              </button>
              <span>{`صفحه ${formatPersianNumber(page)} از ${formatPersianNumber(lastPage)}`}</span>
              <button
                className="vendors-page-button"
                disabled={page >= lastPage}
                onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                type="button"
              >
                صفحه بعد
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="صف فروشنده‌ها"
          title="فروشنده‌های اولویت‌دار"
          actions={<Pill tone="danger">{`${formatPersianNumber(totalStores)} فروشگاه`}</Pill>}
        >
          <div className="vendors-board-card">
            <div className="vendors-selection-list">
              {riskSummary.map((item) => {
                const storeId = readText(item, ['storeId'], '')
                const status = readText(item, ['vendorHealthStatus'], 'UNKNOWN')
                const isActive = storeId === selectedStoreId

                return (
                  <button
                    className={`vendors-selection-item${isActive ? ' is-active' : ''}`}
                    key={storeId}
                    onClick={() => setSelectedStoreId(storeId)}
                    type="button"
                  >
                    <strong>{readText(item, ['storeName'], '—')}</strong>
                    <span>{`${item.isActive === false ? 'غیرفعال' : 'فعال'} / ${getStatusLabel(status)} / امتیاز ${formatPersianNumber(readText(item, ['vendorHealthScore'], '—'))}`}</span>
                    <small>{`${formatPersianNumber(toDisplayValue(getMetric(item, 'ticketCount')))} تیکت / ${formatPersianNumber(toDisplayValue(getMetric(item, 'escalatedCount')))} ارجاع مالی`}</small>
                  </button>
                )
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="فروشنده انتخاب‌شده"
          title={selectedSummaryRecord ? `جزئیات ${readText(selectedSummaryRecord, ['storeName'], '—')}` : 'فروشنده‌ای انتخاب نشده'}
          actions={
            <div className="vendors-inline-actions">
              <Pill tone={getStatusTone(readText(selectedSummaryRecord ?? {}, ['vendorHealthStatus'], ''))}>
                {selectedSummaryRecord
                  ? getStatusLabel(readText(selectedSummaryRecord, ['vendorHealthStatus'], '—'))
                  : 'بدون انتخاب'}
              </Pill>
              {selectedSummaryRecord ? (
                <button
                  className="vendors-open-workspace"
                  onClick={() => onOpenVendorWorkspace(selectedSummaryRecord)}
                  type="button"
                >
                  ورود به میزکار فروشنده
                </button>
              ) : null}
            </div>
          }
        >
          {selectedSummary.length ? (
            <div className="vendors-detail-grid">
              {selectedSummary.map((item) => (
                <article className="vendors-detail-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          ) : (
            <div className="fm-message">در این فیلتر هنوز فروشنده‌ای برای نمایش جزئیات وجود ندارد.</div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="نمای سلامت"
          title="سلامت صف"
          actions={<Pill tone="neutral">مرور وضعیت</Pill>}
        >
          <div className="vendors-brief-grid">
            {healthBoard.map((item) => (
              <article className="vendors-brief-item" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="خلاصه تصمیم"
          title="جمع‌بندی"
          actions={<Pill tone="neutral">مرور سریع</Pill>}
        >
          {operationalDigest.length ? (
            <div className="vendors-brief-grid">
              {operationalDigest.map((item) => (
                <article className="vendors-brief-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.detail}</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="fm-message">برای ساختن جمع‌بندی سریع هنوز فروشنده‌ای انتخاب نشده است.</div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="گزارش مالی"
          title="کیف پول و تسویه"
          actions={<Pill tone="success">مرور مالی</Pill>}
        >
          <div className="vendors-finance-grid">
            {financeHighlights.map((item) => (
              <article className="vendors-finance-item" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="رخدادهای ریسک"
          title={selectedStoreId ? `رخدادهای فروشگاه #${selectedStoreId}` : 'رخدادهای فروشنده'}
          actions={<Pill tone="warning">{timelineLoading ? 'در حال بارگذاری' : `${formatPersianNumber(timeline.length)} رخداد`}</Pill>}
        >
          {!timelineError ? (
            <div className="vendors-policy-stack">
              <div className="vendors-policy-grid">
                <article className="vendors-policy-item">
                  <span>قانون خودکار</span>
                  <strong>{formatPolicy(selectedPolicy.auto)}</strong>
                </article>
                <article className="vendors-policy-item">
                  <span>دخالت دستی</span>
                  <strong>{formatPolicy(selectedPolicy.manualOverride)}</strong>
                </article>
                <article className="vendors-policy-item">
                  <span>قانون نهایی موثر</span>
                  <strong>{formatPolicy(selectedPolicy.effective)}</strong>
                </article>
                <article className="vendors-policy-item">
                  <span>فروشگاه</span>
                  <strong>{readText(selectedStore, ['name'], '—')}</strong>
                </article>
              </div>

              {timelineFeed.length ? (
                <ActivityFeed items={timelineFeed} />
              ) : (
                <div className="fm-message">برای این فروشنده هنوز رخداد قابل‌نمایشی برنگشته است.</div>
              )}
            </div>
          ) : null}
        </SectionCard>
      </LoadableState>
    </div>
  )
}

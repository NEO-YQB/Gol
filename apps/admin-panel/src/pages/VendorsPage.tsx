import { ActivityFeed, DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type VendorRecord = Record<string, unknown>

const vendorColumns = [
  { key: 'store', label: 'فروشگاه' },
  { key: 'status', label: 'وضعیت سلامت' },
  { key: 'score', label: 'امتیاز سلامت' },
  { key: 'rating', label: 'امتیاز مشتری' },
  { key: 'tickets', label: 'تیکت دوره' },
]

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
    default:
      return status || 'نامشخص'
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
    .map(([key, value]) => `${key}: ${typeof value === 'boolean' ? (value ? 'بله' : 'خیر') : String(value)}`)

  return entries.length ? entries.join(' | ') : '—'
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
          adminApi.getFinanceSummary(session),
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
  }, [page, session, statusFilter])

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

  const vendorRows = useMemo(
    () =>
      riskSummary.map((item, index) => ({
        id: readText(item, ['storeId'], String(index + 1)),
        store: readText(item, ['storeName', 'storeSlug'], '—'),
        status: getStatusLabel(readText(item, ['vendorHealthStatus'], 'UNKNOWN')),
        score: formatPersianNumber(readText(item, ['vendorHealthScore'], '—')),
        rating: formatPersianNumber(readText(item, ['customerRatingAverage'], '—')),
        tickets: formatPersianNumber(toDisplayValue(getMetric(item, 'ticketCount'))),
      })),
    [riskSummary],
  )

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
        title: readText(item, ['summary', 'aggregateType'], 'policy event'),
        meta: formatJalaliDate(item.createdAt),
        description: readText(item, ['aggregateType'], 'جزئیات policy event'),
        tone: index % 2 === 0 ? ('warning' as const) : ('success' as const),
      })),
    [timeline],
  )

  const stats = useMemo(
    () => [
      {
        label: 'فروشنده‌های این view',
        value: formatPersianNumber(riskSummary.length),
        delta: `${formatPersianNumber(totalStores)} فروشگاه در کل`,
        detail: 'لیست page-aware فروشنده‌های اولویت‌دار',
        tone: 'primary' as const,
      },
      {
        label: 'پرریسک',
        value: formatPersianNumber(statusCounts.AT_RISK ?? 0),
        delta: 'نیازمند کنترل فوری',
        detail: 'فروشگاه‌های با health status قرمز',
        tone: 'danger' as const,
      },
      {
        label: 'تحت نظر',
        value: formatPersianNumber(statusCounts.WATCHLIST ?? 0),
        delta: 'صف مانیتورینگ',
        detail: 'فروشگاه‌های نیازمند بررسی نزدیک‌تر',
        tone: 'warning' as const,
      },
      {
        label: 'تسویه‌های settled',
        value: formatPersianNumber(getFinanceNumber(financeSummary, ['settlements', 'settled'])),
        delta: rangeLabel,
        detail: 'نمای خلاصه گزارش مالی برای همین بازه',
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
        { label: 'وضعیت سلامت', value: getStatusLabel(readText(selectedSummaryRecord, ['vendorHealthStatus'], '—')) },
        { label: 'امتیاز سلامت', value: formatPersianNumber(readText(selectedSummaryRecord, ['vendorHealthScore'], '—')) },
        { label: 'امتیاز مشتری', value: formatPersianNumber(readText(selectedSummaryRecord, ['customerRatingAverage'], '—')) },
        { label: 'تعداد امتیاز', value: formatPersianNumber(readText(selectedSummaryRecord, ['customerRatingCount'], '—')) },
        { label: 'آخرین محاسبه', value: formatJalaliDate(selectedSummaryRecord.vendorHealthCalculatedAt) },
        { label: 'تیکت‌های بازه', value: formatPersianNumber(toDisplayValue(getMetric(selectedSummaryRecord, 'ticketCount'))) },
        { label: 'ارجاع مالی', value: formatPersianNumber(toDisplayValue(getMetric(selectedSummaryRecord, 'escalatedCount'))) },
        { label: 'refund', value: formatPersianNumber(toDisplayValue(getMetric(selectedSummaryRecord, 'refundCount'))) },
        { label: 'reversal', value: formatPersianNumber(toDisplayValue(getMetric(selectedSummaryRecord, 'reversalCount'))) },
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
          eyebrow="vendors / risk / finance reports"
          title="workspace فروشنده‌ها، ریسک و گزارش مالی"
          description="این route سه نیاز roadmap را در یک کارتابل product-grade جمع می‌کند: اولویت‌بندی فروشنده‌ها، دید policy timeline و خلاصه گزارش مالی."
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
                  {status === 'ALL' ? 'همه وضعیت‌ها' : getStatusLabel(status)}
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
          title="فروشنده‌های اولویت‌دار برای triage"
          description="فهرست فروشنده‌ها عمدا تمام‌عرض باقی می‌ماند تا list page فشرده، شلوغ و کش‌آمده نشود."
          actions={<Pill tone="danger">{`${formatPersianNumber(totalStores)} فروشگاه`}</Pill>}
        >
          <div className="vendors-table-card">
            <DataTable columns={vendorColumns} rows={vendorRows} />

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
                    <span>{`${getStatusLabel(status)} / score ${formatPersianNumber(readText(item, ['vendorHealthScore'], '—'))}`}</span>
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
          description="این بخش فقط summary می‌دهد؛ هر اقدام سنگین باید در route جدا انجام شود تا این صفحه list-first باقی بماند."
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
                  ورود به workspace فروشنده
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
          eyebrow="گزارش مالی"
          title="خلاصه wallets / settlements / transactions"
          description="گزارش‌ها می‌توانند چندستونه باشند، اما خود listها تمام‌عرض می‌مانند تا خوانایی route حفظ شود."
          actions={<Pill tone="success">finance</Pill>}
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
          eyebrow="policy timeline"
          title={selectedStoreId ? `timeline فروشگاه #${selectedStoreId}` : 'timeline فروشنده'}
          description="timeline این صفحه صرفا برای visibility و summary است؛ actionهای واقعی باید در workspace جدا تکمیل شوند."
          actions={<Pill tone="warning">{timelineLoading ? 'در حال بارگذاری' : `${formatPersianNumber(timeline.length)} event`}</Pill>}
        >
          {timelineError ? <div className="fm-message">{timelineError}</div> : null}

          {!timelineError ? (
            <div className="vendors-policy-stack">
              <div className="vendors-policy-grid">
                <article className="vendors-policy-item">
                  <span>policy خودکار</span>
                  <strong>{formatPolicy(selectedPolicy.auto)}</strong>
                </article>
                <article className="vendors-policy-item">
                  <span>manual override</span>
                  <strong>{formatPolicy(selectedPolicy.manualOverride)}</strong>
                </article>
                <article className="vendors-policy-item">
                  <span>policy موثر</span>
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
                <div className="fm-message">برای این فروشنده هنوز timeline قابل‌نمایشی برنگشته است.</div>
              )}
            </div>
          ) : null}
        </SectionCard>
      </LoadableState>
    </div>
  )
}

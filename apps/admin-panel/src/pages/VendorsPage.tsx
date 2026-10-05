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
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [riskSummary, setRiskSummary] = useState<VendorRecord[]>([])
  const [financeSummary, setFinanceSummary] = useState<VendorRecord>({})
  const [rangeLabel, setRangeLabel] = useState('بازه پیش‌فرض گزارش')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [lastPage, setLastPage] = useState(1)
  const [totalStores, setTotalStores] = useState(0)
  const [pendingOnboardingCount, setPendingOnboardingCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState<(typeof riskStatuses)[number]>('ALL')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineError, setTimelineError] = useState<string | null>(null)
  const [selectedStoreDetail, setSelectedStoreDetail] = useState<VendorRecord | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useNoticeEffect(timelineError, 'error')

  const canReadFinance =
    hasPermission(session, 'manage', 'all') ||
    hasPermission(session, 'read', 'StoreWallet') ||
    hasPermission(session, 'read', 'WalletTransaction')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 350)

    return () => clearTimeout(timer)
  }, [searchInput])

  // Load vendors and risk summary
  useEffect(() => {
    let active = true

    async function load() {
      if (refreshTrigger > 0) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      try {
        const [riskPayload, financePayload] = await Promise.all([
          adminApi.getVendorRiskSummary(session, {
            page,
            limit,
            status: statusFilter === 'ALL' ? undefined : statusFilter,
            search: debouncedSearch || undefined,
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
        setPendingOnboardingCount(Number(meta.pendingOnboardingCount ?? 0))
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
        if (active) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [canReadFinance, debouncedSearch, limit, page, refreshTrigger, session, statusFilter])

  // Load timeline for selected store
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
        value: formatPersianNumber(totalStores),
        delta: `${formatPersianNumber(riskSummary.length)} در این صفحه`,
        detail: '',
        tone: 'primary' as const,
      },
      {
        label: 'پرریسک',
        value: formatPersianNumber(statusCounts.AT_RISK ?? 0),
        delta: 'اقدام فوری',
        detail: '',
        tone: 'danger' as const,
      },
      {
        label: 'تحت نظر',
        value: formatPersianNumber(statusCounts.WATCHLIST ?? 0),
        delta: 'پایش مستمر',
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

  const selectedOwner = useMemo(() => toObject(selectedSummaryRecord?.owner), [selectedSummaryRecord])

  const selectedSummary = selectedSummaryRecord
    ? [
        { label: 'فروشگاه', value: readText(selectedSummaryRecord, ['storeName'], '—') },
        { label: 'شناسه اسلاگ', value: readText(selectedSummaryRecord, ['storeSlug'], '—') },
        { label: 'مالک فروشگاه', value: readText(selectedOwner, ['fullName'], '—') },
        { label: 'شماره تماس', value: readText(selectedOwner, ['phoneNumber'], '—') },
        { label: 'ایمیل', value: readText(selectedOwner, ['email'], '—') },
        { label: 'وضعیت فعالیت', value: selectedSummaryRecord.isActive === false ? 'غیرفعال' : 'فعال' },
        { label: 'وضعیت سلامت', value: getStatusLabel(readText(selectedSummaryRecord, ['vendorHealthStatus'], '—')) },
        { label: 'امتیاز سلامت', value: formatPersianNumber(readText(selectedSummaryRecord, ['vendorHealthScore'], '—')) },
        { label: 'امتیاز مشتری', value: `${formatPersianNumber(readText(selectedSummaryRecord, ['customerRatingAverage'], '—'))} از ۵` },
        { label: 'تعداد آراء مشتریان', value: formatPersianNumber(readText(selectedSummaryRecord, ['customerRatingCount'], '—')) },
        { label: 'آخرین محاسبه', value: formatJalaliDate(selectedSummaryRecord.vendorHealthCalculatedAt) },
      ]
    : []

  const operationalMetrics = selectedSummaryRecord
    ? [
        { label: 'تیکت‌های بازه', value: formatPersianNumber(toDisplayValue(getMetric(selectedSummaryRecord, 'ticketCount'))) },
        { label: 'ارجاع مالی', value: formatPersianNumber(toDisplayValue(getMetric(selectedSummaryRecord, 'escalatedCount'))) },
        { label: 'بازگشت به مشتری', value: formatPersianNumber(toDisplayValue(getMetric(selectedSummaryRecord, 'refundCount'))) },
        { label: 'واریز به فروشنده', value: formatPersianNumber(toDisplayValue(getMetric(selectedSummaryRecord, 'reversalCount'))) },
      ]
    : []

  return (
    <div className="fm-stack">
      <LoadableState error={error} loading={loading}>
        {/* Top KPI Cards */}
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        {/* Pending Onboarding Alert Banner */}
        {pendingOnboardingCount > 0 ? (
          <div className="vendors-pending-banner">
            <div className="vendors-pending-banner-text">
              <span>🔔</span>
              <span>
                <strong>{formatPersianNumber(pendingOnboardingCount)} درخواست ثبت‌نام فروشنده جدید</strong> در صف بررسی منتظر تایید یا رسیدگی است.
              </span>
            </div>
            <Pill tone="warning">صف بررسی</Pill>
          </div>
        ) : null}

        {/* Vendors Hub & Master-Detail Section */}
        <SectionCard
          eyebrow="فروشندگان و پایش سلامت"
          title="مدیریت فروشگاه‌ها و شاخص‌های ریسک"
          actions={
            <div className="vendors-inline-actions">
              <Pill tone="neutral">{rangeLabel}</Pill>
              <button
                className="vendors-refresh-button"
                disabled={refreshing}
                onClick={() => setRefreshTrigger((c) => c + 1)}
                type="button"
              >
                {refreshing ? 'در حال به‌روزرسانی...' : '🔄 به‌روزرسانی صف'}
              </button>
            </div>
          }
        >
          <div className="vendors-toolbar">
            {/* Search and Limit bar */}
            <div className="vendors-search-row">
              <div className="vendors-search-input-wrap">
                <span className="vendors-search-icon">🔍</span>
                <input
                  className="vendors-search-input"
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="جستجو در نام فروشگاه، شناسه اسلاگ، نام مالک، یا شماره موبایل..."
                  type="text"
                  value={searchInput}
                />
                {searchInput ? (
                  <button
                    className="vendors-search-clear"
                    onClick={() => setSearchInput('')}
                    title="پاک کردن جستجو"
                    type="button"
                  >
                    ✕
                  </button>
                ) : null}
              </div>

              <select
                aria-label="تعداد در هر صفحه"
                className="vendors-page-select"
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setPage(1)
                }}
                value={limit}
              >
                <option value={10}>۱۰ در هر صفحه</option>
                <option value={25}>۲۵ در هر صفحه</option>
                <option value={50}>۵۰ در هر صفحه</option>
                <option value={100}>۱۰۰ در هر صفحه</option>
              </select>
            </div>

            {/* Filter Chips & Pagination */}
            <div className="vendors-filters">
              <div className="vendors-filter-chips">
                {riskStatuses.map((status) => {
                  const count = status === 'ALL' ? totalStores : statusCounts[status] ?? 0
                  return (
                    <button
                      className={`vendors-filter-chip${statusFilter === status ? ' is-active' : ''}`}
                      key={status}
                      onClick={() => {
                        setPage(1)
                        setStatusFilter(status)
                      }}
                      type="button"
                    >
                      <span>{getStatusLabel(status)}</span>
                      {count > 0 ? (
                        <small style={{ opacity: 0.85 }}>({formatPersianNumber(count)})</small>
                      ) : null}
                    </button>
                  )
                })}
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
          </div>

          {/* Master-Detail Split Grid */}
          <div className="vendors-layout" style={{ marginTop: '16px' }}>
            {/* Master: List of Vendors */}
            <div className="vendors-master-list">
              {riskSummary.length === 0 ? (
                <div className="vendors-empty-state">
                  <strong>فروشنده‌ای یافت نشد</strong>
                  <span>با این عبارت جستجو یا فیلتر ریسک، فروشگاهی ثبت نشده است.</span>
                </div>
              ) : (
                riskSummary.map((item) => {
                  const storeId = readText(item, ['storeId'], '')
                  const storeName = readText(item, ['storeName'], '—')
                  const storeSlug = readText(item, ['storeSlug'], '')
                  const status = readText(item, ['vendorHealthStatus'], 'UNKNOWN')
                  const healthScore = readText(item, ['vendorHealthScore'], '—')
                  const isVerified = item.isVerified === true
                  const isActive = item.isActive !== false
                  const isSelected = storeId === selectedStoreId
                  const owner = toObject(item.owner)
                  const ownerName = readText(owner, ['fullName'], '')
                  const ownerPhone = readText(owner, ['phoneNumber'], '')
                  const productCount = Number(item.productCount ?? 0)
                  const orderCount = Number(item.orderCount ?? 0)
                  const ticketCount = Number(toDisplayValue(getMetric(item, 'ticketCount')) ?? 0)
                  const escalatedCount = Number(toDisplayValue(getMetric(item, 'escalatedCount')) ?? 0)

                  return (
                    <article
                      className={`vendors-vendor-card${isSelected ? ' is-active' : ''}`}
                      key={storeId}
                      onClick={() => setSelectedStoreId(storeId)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="vendors-vendor-card-header">
                        <div className="vendors-vendor-card-title">
                          <span>{storeName}</span>
                          {isVerified ? (
                            <span title="فروشگاه تایید شده" style={{ color: '#16a34a' }}>✓</span>
                          ) : null}
                          {!isActive ? (
                            <span style={{ fontSize: '0.72rem', color: '#dc2626' }}>(غیرفعال)</span>
                          ) : null}
                        </div>
                        <Pill tone={getStatusTone(status)}>{getStatusLabel(status)}</Pill>
                      </div>

                      {ownerName || ownerPhone ? (
                        <div className="vendors-vendor-card-owner">
                          {ownerName ? <span>👤 {ownerName}</span> : null}
                          {ownerPhone ? <span dir="ltr">📱 {ownerPhone}</span> : null}
                        </div>
                      ) : (
                        <div className="vendors-vendor-card-owner">
                          <span>شناسه اسلاگ: {storeSlug || '—'}</span>
                        </div>
                      )}

                      <div className="vendors-vendor-card-meta">
                        <span className="vendors-tag">🛍️ {formatPersianNumber(productCount)} کالا</span>
                        <span className="vendors-tag">📦 {formatPersianNumber(orderCount)} سفارش</span>
                        <span className="vendors-tag">امتیاز سلامت: {formatPersianNumber(healthScore)}</span>
                        {ticketCount > 0 ? (
                          <span className="vendors-tag">💬 {formatPersianNumber(ticketCount)} تیکت</span>
                        ) : null}
                        {escalatedCount > 0 ? (
                          <span className="vendors-tag" style={{ color: '#b45309' }}>
                            🚨 {formatPersianNumber(escalatedCount)} مالی
                          </span>
                        ) : null}
                      </div>
                    </article>
                  )
                })
              )}
            </div>

            {/* Detail: Inspector & Actions */}
            <div className="vendors-detail-pane">
              {selectedSummaryRecord ? (
                <>
                  {/* Hero Card with Workspace Navigation */}
                  <div className="vendors-detail-hero">
                    <div className="vendors-detail-hero-info">
                      <h3>{readText(selectedSummaryRecord, ['storeName'], '—')}</h3>
                      <span>
                        شناسه: {readText(selectedSummaryRecord, ['storeId'], '—')} | اسلاگ: {readText(selectedSummaryRecord, ['storeSlug'], '—')}
                      </span>
                    </div>

                    <div className="vendors-inline-actions">
                      <Pill tone={getStatusTone(readText(selectedSummaryRecord, ['vendorHealthStatus'], ''))}>
                        {getStatusLabel(readText(selectedSummaryRecord, ['vendorHealthStatus'], '—'))}
                      </Pill>
                      <button
                        className="vendors-open-workspace"
                        onClick={() => onOpenVendorWorkspace(selectedSummaryRecord)}
                        type="button"
                      >
                        ورود به میزکار فروشنده ↗
                      </button>
                    </div>
                  </div>

                  {/* Store & Owner Profile Grid */}
                  <div className="vendors-detail-grid">
                    {selectedSummary.map((item) => (
                      <article className="vendors-detail-item" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </article>
                    ))}
                  </div>

                  {/* Operational Metrics in Current Window */}
                  <SectionCard eyebrow="عملکرد بازه" title="شاخص‌های عملیاتی و ریسک">
                    <div className="vendors-detail-grid">
                      {operationalMetrics.map((item) => (
                        <article className="vendors-detail-item" key={item.label}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </article>
                      ))}
                    </div>
                  </SectionCard>

                  {/* Risk Policy and Events Timeline */}
                  <SectionCard
                    eyebrow="پایش رویدادها"
                    title={`رخدادهای ریسک فروشگاه #${selectedStoreId}`}
                    actions={
                      <Pill tone="warning">
                        {timelineLoading ? 'در حال بارگذاری' : `${formatPersianNumber(timeline.length)} رخداد`}
                      </Pill>
                    }
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
                            <span>فروشگاه هدف</span>
                            <strong>{readText(selectedStore, ['name'], '—')}</strong>
                          </article>
                        </div>

                        {timelineFeed.length ? (
                          <ActivityFeed items={timelineFeed} />
                        ) : (
                          <div className="fm-message">
                            برای این فروشنده هنوز رخداد ریسک قابل‌نمایشی ثبت نشده است.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </SectionCard>
                </>
              ) : (
                <div className="vendors-empty-state">
                  <strong>فروشنده‌ای انتخاب نشده است</strong>
                  <span>برای بررسی جزئیات، رویدادها و دسترسی به میزکار، یک فروشگاه را از فهرست انتخاب کنید.</span>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Global Financial Highlights */}
        <SectionCard
          eyebrow="گزارش مالی کلان"
          title="کیف پول و تسویه‌ها"
          actions={<Pill tone="success">مرور مالی پلتفرم</Pill>}
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
      </LoadableState>
    </div>
  )
}

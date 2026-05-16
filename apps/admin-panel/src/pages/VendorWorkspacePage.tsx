import { ActivityFeed, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type VendorRecord = Record<string, unknown>
type WorkspaceLane = 'finance' | 'policy' | 'coordination'

function toObject(value: unknown): VendorRecord {
  return typeof value === 'object' && value !== null ? (value as VendorRecord) : {}
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

function formatPersianNumber(value: unknown) {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('fa-IR').format(value)
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      return new Intl.NumberFormat('fa-IR').format(parsed)
    }

    return value
  }

  return '—'
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

function getStatusTone(status: string) {
  if (status === 'AT_RISK') return 'danger' as const
  if (status === 'WATCHLIST') return 'warning' as const
  if (status === 'GOOD' || status === 'EXCELLENT') return 'success' as const
  return 'primary' as const
}

function formatPolicy(policy: unknown) {
  const record = toObject(policy)
  const entries = Object.entries(record)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${typeof value === 'boolean' ? (value ? 'بله' : 'خیر') : String(value)}`)

  return entries.length ? entries.join(' | ') : '—'
}

export function VendorWorkspacePage({
  session,
  store,
  onBack,
}: {
  session: AuthSession
  store: Record<string, unknown> | null
  onBack: () => void
}) {
  const [loading, setLoading] = useState(Boolean(store))
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<VendorRecord | null>(null)
  const [activeLane, setActiveLane] = useState<WorkspaceLane>('finance')

  const storeId = readText(store ?? {}, ['storeId'], '')
  const status = readText(store ?? {}, ['vendorHealthStatus'], 'UNKNOWN')
  const ratingCount = formatPersianNumber(readText(store ?? {}, ['customerRatingCount'], '—'))
  const ticketPressure = formatPersianNumber(readText(store ?? {}, ['periodMetrics.ticketCount'], '—'))
  const escalatedCount = formatPersianNumber(readText(store ?? {}, ['periodMetrics.escalatedCount'], '—'))
  const refundCount = formatPersianNumber(readText(store ?? {}, ['periodMetrics.refundCount'], '—'))
  const reversalCount = formatPersianNumber(readText(store ?? {}, ['periodMetrics.reversalCount'], '—'))
  const customerAverage = formatPersianNumber(readText(store ?? {}, ['customerRatingAverage'], '—'))
  const healthScore = formatPersianNumber(readText(store ?? {}, ['vendorHealthScore'], '—'))

  useEffect(() => {
    if (!storeId) {
      setLoading(false)
      setDetail(null)
      setError('برای ورود به workspace فروشنده، ابتدا یک فروشنده را از کارتابل انتخاب کن.')
      return
    }

    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const payload = await adminApi.getVendorPolicyTimeline(session, storeId)
        if (!active) return
        setDetail(toObject(payload))
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری workspace فروشنده')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [session, storeId])

  const detailStore = useMemo(() => toObject(detail?.store), [detail])
  const currentPolicy = useMemo(() => toObject(detail?.currentPolicy), [detail])
  const timeline = useMemo(() => toArray(detail?.timeline), [detail])

  const stats = [
    {
      label: 'فروشگاه',
      value: readText(store ?? {}, ['storeName'], '—'),
      delta: readText(store ?? {}, ['storeSlug'], 'بدون slug'),
      detail: 'context اصلی این workspace',
      tone: 'primary' as const,
    },
    {
      label: 'وضعیت سلامت',
      value: getStatusLabel(status),
      delta: `score ${healthScore}`,
      detail: 'پایه تصمیم‌های review و policy',
      tone: getStatusTone(status),
    },
    {
      label: 'امتیاز مشتری',
      value: customerAverage,
      delta: `${ratingCount} رأی`,
      detail: 'signal سمت مشتری',
      tone: 'success' as const,
    },
    {
      label: 'آخرین محاسبه',
      value: formatJalaliDate(store?.vendorHealthCalculatedAt),
      delta: 'jalali',
      detail: 'آخرین snapshot سلامت فروشنده',
      tone: 'warning' as const,
    },
  ]

  const laneCards = [
    {
      key: 'finance' as const,
      title: 'lane مالی و تسویه',
      description: 'برای hold/release/review و کنترل فشار مالی فروشنده.',
      detail: `${ticketPressure} تیکت / ${refundCount} refund / ${reversalCount} reversal`,
    },
    {
      key: 'policy' as const,
      title: 'lane policy و ریسک',
      description: 'برای override، محدودیت تخفیف و manual review.',
      detail: `${getStatusLabel(status)} / score ${healthScore}`,
    },
    {
      key: 'coordination' as const,
      title: 'lane هماهنگی بین تیمی',
      description: 'برای sync بین مالی، پشتیبانی و عملیات.',
      detail: `${escalatedCount} ارجاع مالی / ${ratingCount} رأی مشتری`,
    },
  ]

  const laneSummaryMap: Record<
    WorkspaceLane,
    {
      eyebrow: string
      title: string
      description: string
      bullets: string[]
      statusLabel: string
    }
  > = {
    finance: {
      eyebrow: 'finance lane',
      title: 'آماده‌سازی surface مالی و تسویه',
      description:
        'این lane برای زمانی است که actionهای release، hold، wallet review و settlement follow-up به همین route اضافه شوند.',
      bullets: [
        `فشار ticket در این بازه: ${ticketPressure}`,
        `refundهای دوره: ${refundCount}`,
        `reversalهای دوره: ${reversalCount}`,
        'در این مرحله route برای تصمیم‌گیری و context gathering آماده شده است، نه اجرای fake action.',
      ],
      statusLabel: 'finance-ready',
    },
    policy: {
      eyebrow: 'policy lane',
      title: 'آماده‌سازی surface policy و manual override',
      description:
        'این lane برای review محدودیت‌ها، manual override و اثر policy روی فروشنده طراحی شده تا بعدا actionها مستقیم همین‌جا بنشینند.',
      bullets: [
        `health status فعلی: ${getStatusLabel(status)}`,
        `تعداد رأی‌های مشتری: ${ratingCount}`,
        `ارجاع‌های مالی ثبت‌شده: ${escalatedCount}`,
        'current policy و timeline پایین صفحه به‌عنوان context اصلی این lane عمل می‌کنند.',
      ],
      statusLabel: 'policy-ready',
    },
    coordination: {
      eyebrow: 'coordination lane',
      title: 'آماده‌سازی surface هماهنگی بین تیمی',
      description:
        'وقتی تصمیم یک فروشنده بین مالی، پشتیبانی و عملیات پخش می‌شود، این lane باید workspace واحد برای جمع‌بندی و handoff باشد.',
      bullets: [
        `ticket pressure: ${ticketPressure}`,
        `ارجاع مالی: ${escalatedCount}`,
        `customer signal: ${customerAverage}`,
        'timeline رخدادها پایین صفحه زمینه لازم برای handoff و پیگیری بعدی را نگه می‌دارد.',
      ],
      statusLabel: 'coordination-ready',
    },
  }

  const activeLaneSummary = laneSummaryMap[activeLane]

  const operationalChecklist = [
    {
      label: 'health snapshot',
      value: getStatusLabel(status),
      note: 'برای شروع review باید وضعیت سلامت و score به‌روز دیده شود.',
    },
    {
      label: 'ticket pressure',
      value: ticketPressure,
      note: 'شدت فشار عملیاتی از تعداد تیکت‌های بازه و escalationها فهمیده می‌شود.',
    },
    {
      label: 'finance pressure',
      value: `${refundCount} / ${reversalCount}`,
      note: 'refund و reversal باید قبل از هر action جدید دوباره دیده شوند.',
    },
    {
      label: 'policy visibility',
      value: readText(detailStore, ['name'], '—'),
      note: 'current policy و timeline همین route مرجع review باقی می‌مانند.',
    },
  ]

  const nextSurfaces = [
    {
      title: 'finance decision surface',
      text: 'release/hold wallet، بررسی settlement و actionهای مالی باید در این route به‌صورت focused form یا drawer داخلی اضافه شوند.',
    },
    {
      title: 'policy control surface',
      text: 'manual override، محدودیت تخفیف، بازگشایی review و decision log باید در همین workspace متمرکز پیاده شوند.',
    },
    {
      title: 'cross-team handoff surface',
      text: 'وقتی تصمیم نیازمند هماهنگی پشتیبانی/مالی است، note، context و timeline باید همین‌جا کنار هم بمانند.',
    },
  ]

  const timelineFeed = timeline.slice(0, 10).map((item, index) => ({
    id: readText(item, ['id'], String(index + 1)),
    title: readText(item, ['summary', 'aggregateType'], 'policy event'),
    meta: formatJalaliDate(item.createdAt),
    description: readText(item, ['aggregateType'], 'جزئیات event'),
    tone: index % 2 === 0 ? ('warning' as const) : ('success' as const),
  }))

  return (
    <div className="fm-stack">
      <div className="vendors-workspace-topbar">
        <button className="vendors-workspace-back" onClick={onBack} type="button">
          بازگشت به کارتابل فروشنده‌ها
        </button>
        <Pill tone={getStatusTone(status)}>{getStatusLabel(status)}</Pill>
      </div>

      <LoadableState error={error} loading={loading}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="workspace متمرکز"
          title={`بررسی فروشنده ${readText(store ?? {}, ['storeName'], '—')}`}
          description="این route عمدا از list page جدا شده تا اقدام‌های بعدی و تصمیم‌های عملیاتی در یک surface خلوت، متمرکز و قابل‌گسترش جمع شوند."
          actions={<Pill tone="primary">focused route</Pill>}
        >
          <div className="vendors-workspace-lanes">
            {laneCards.map((item) => (
              <button
                className={`vendors-workspace-lane-card${activeLane === item.key ? ' is-active' : ''}`}
                key={item.key}
                onClick={() => setActiveLane(item.key)}
                type="button"
              >
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <small>{item.detail}</small>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow={activeLaneSummary.eyebrow}
          title={activeLaneSummary.title}
          description={activeLaneSummary.description}
          actions={<Pill tone="secondary">{activeLaneSummary.statusLabel}</Pill>}
        >
          <div className="vendors-workspace-action-grid">
            {activeLaneSummary.bullets.map((item) => (
              <article className="vendors-workspace-action-card" key={item}>
                <strong>نکته عملیاتی</strong>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="readiness checklist"
          title="چک‌لیست آمادگی برای actionهای واقعی"
          description="این بلوک route را برای اضافه شدن action surfaceهای واقعی آماده می‌کند، بدون اینکه الان fake flow ایجاد شود."
          actions={<Pill tone="warning">action-ready</Pill>}
        >
          <div className="vendors-workspace-checklist">
            {operationalChecklist.map((item) => (
              <article className="vendors-workspace-check-item" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="next action surfaces"
          title="سطوحی که بعدا action واقعی روی آن‌ها می‌نشیند"
          description="به‌جای شلوغ کردن list page، این route از همین حالا جای actionهای آینده را مشخص می‌کند تا توسعه بعدی مستقیم روی همین اسکلت بنشیند."
          actions={<Pill tone="primary">next steps</Pill>}
        >
          <div className="vendors-workspace-surface-grid">
            {nextSurfaces.map((item) => (
              <article className="vendors-workspace-surface-card" key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="policy snapshot"
          title="وضعیت policy و snapshot فعلی"
          description="این بخش برای متمرکز نگه داشتن review state، policy override و تصمیم‌های بعدی در یک route جداست."
          actions={<Pill tone="warning">policy state</Pill>}
        >
          <div className="vendors-workspace-policy-grid">
            <article className="vendors-policy-item">
              <span>policy خودکار</span>
              <strong>{formatPolicy(currentPolicy.auto)}</strong>
            </article>
            <article className="vendors-policy-item">
              <span>manual override</span>
              <strong>{formatPolicy(currentPolicy.manualOverride)}</strong>
            </article>
            <article className="vendors-policy-item">
              <span>policy موثر</span>
              <strong>{formatPolicy(currentPolicy.effective)}</strong>
            </article>
            <article className="vendors-policy-item">
              <span>آخرین health snapshot</span>
              <strong>{formatJalaliDate(detailStore.vendorHealthCalculatedAt)}</strong>
            </article>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="policy timeline"
          title="timeline سیاست‌ها و رخدادهای فروشنده"
          description="timeline در workspace جدا مانده تا بعدا actionها، notes و state transitionها همین‌جا اضافه شوند."
          actions={<Pill tone="success">{`${new Intl.NumberFormat('fa-IR').format(timeline.length)} event`}</Pill>}
        >
          {timelineFeed.length ? (
            <ActivityFeed items={timelineFeed} />
          ) : (
            <div className="fm-message">برای این فروشنده هنوز timeline قابل‌نمایشی وجود ندارد.</div>
          )}
        </SectionCard>
      </LoadableState>
    </div>
  )
}

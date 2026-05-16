import { ActivityFeed, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type VendorRecord = Record<string, unknown>

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

  const storeId = readText(store ?? {}, ['storeId'], '')

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
  const status = readText(store ?? {}, ['vendorHealthStatus'], 'UNKNOWN')

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
      delta: `score ${formatPersianNumber(readText(store ?? {}, ['vendorHealthScore'], '—'))}`,
      detail: 'پایه تصمیم‌های review و policy',
      tone: getStatusTone(status),
    },
    {
      label: 'امتیاز مشتری',
      value: formatPersianNumber(readText(store ?? {}, ['customerRatingAverage'], '—')),
      delta: `${formatPersianNumber(readText(store ?? {}, ['customerRatingCount'], '—'))} رأی`,
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

  const actionCards = [
    {
      title: 'کنترل کیف پول و تسویه',
      description:
        'actionهای release، hold، بررسی موجودی و پیگیری settlement باید از این workspace متمرکز شروع شوند تا list page شلوغ نشود.',
    },
    {
      title: 'بازبینی policy ریسک',
      description:
        'manual override، محدودیت تخفیف و کنترل manual review باید در همین surface متمرکز انجام شوند، نه کنار فهرست فروشنده‌ها.',
    },
    {
      title: 'هماهنگی با تیم مالی/پشتیبانی',
      description:
        'وقتی فروشنده به refund، reversal یا escalation نیاز دارد، context این تصمیم باید در یک route متمرکز و قابل‌ردیابی بماند.',
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
          <div className="vendors-workspace-actions">
            {actionCards.map((item) => (
              <article className="vendors-workspace-action-card" key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
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

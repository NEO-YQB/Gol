import { Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi } from '../lib/api'
import { formatFaNumber, makeStats, readText } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type SummaryRecord = Record<string, unknown>

export function ReviewsPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState(() => makeStats([]))
  const [policyText, setPolicyText] = useState('')
  const [store, setStore] = useState<SummaryRecord>({})
  const [restrictions, setRestrictions] = useState<SummaryRecord>({})
  const [explanation, setExplanation] = useState<SummaryRecord>({})

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [health, policy] = await Promise.all([
          vendorApi.getHealthSummary(session),
          vendorApi.getPolicyRestrictions(session),
        ])
        if (!active) return

        const storeRecord = ((health as Record<string, unknown>).store as Record<string, unknown>) ?? {}
        const explanationRecord = ((policy as Record<string, unknown>).explanation as Record<string, unknown>) ?? {}
        const restrictionsRecord = ((policy as Record<string, unknown>).restrictions as Record<string, unknown>) ?? {}

        setStats(
          makeStats([
            {
              label: 'rating average',
              value: formatFaNumber(Number(storeRecord.customerRatingAverage ?? 0)),
              delta: `${formatFaNumber(Number(storeRecord.customerRatingCount ?? 0))} نظر`,
              detail: 'میانگین رضایت و تعداد reviewهای مشتری',
              tone: 'success',
            },
            {
              label: 'health score',
              value: formatFaNumber(Number(storeRecord.vendorHealthScore ?? 0)),
              delta: readText(storeRecord, ['vendorHealthStatus'], 'UNKNOWN'),
              detail: 'خروجی summary سلامت فروشگاه',
              tone: 'warning',
            },
            {
              label: 'manual review',
              value: restrictionsRecord.manualReviewRequired ? 'فعال' : 'غیرفعال',
              delta: restrictionsRecord.blockNewDiscounts ? 'تخفیف محدود' : 'تخفیف آزاد',
              detail: 'وضعیت restrictionهای موثر روی فروشگاه',
              tone: 'danger',
            },
          ]),
        )
        setStore(storeRecord)
        setRestrictions(restrictionsRecord)
        setExplanation(explanationRecord)
        setPolicyText(readText(explanationRecord, ['note'], 'فعلا توضیح اضافه‌ای برای policy موثر ثبت نشده است.'))
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری کیفیت و سلامت فروشگاه')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [session])

  const healthSnapshot = useMemo(
    () => [
      { label: 'امتیاز سلامت', value: formatFaNumber(Number(store.vendorHealthScore ?? 0)) },
      { label: 'وضعیت سلامت', value: readText(store, ['vendorHealthStatus'], 'UNKNOWN') },
      { label: 'میانگین امتیاز مشتری', value: formatFaNumber(Number(store.customerRatingAverage ?? 0)) },
      { label: 'تعداد نظرها', value: formatFaNumber(Number(store.customerRatingCount ?? 0)) },
    ],
    [store],
  )

  const restrictionSnapshot = useMemo(
    () => [
      {
        label: 'manual review',
        value: restrictions.manualReviewRequired ? 'فعال' : 'غیرفعال',
      },
      {
        label: 'تخفیف جدید',
        value: restrictions.blockNewDiscounts ? 'محدود شده' : 'آزاد',
      },
      {
        label: 'پرداخت / release',
        value: restrictions.blockPayouts ? 'مسدود' : 'فعال',
      },
      {
        label: 'نوع policy',
        value: readText(explanation, ['policyName', 'policyType', 'title'], '—'),
      },
    ],
    [explanation, restrictions],
  )

  return (
    <div className="fm-stack">
      <LoadableState loading={loading} error={error}>
        <div className="vendor-review-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="Health insight"
          title="جمع‌بندی وضعیت کیفیت و policy"
          description="در این بخش فروشنده باید بفهمد چه چیزی روی سلامت فروشگاهش اثر گذاشته و چه محدودیتی فعال شده است."
          actions={<Pill tone="warning">policy visibility</Pill>}
        >
          <div className="vendor-review-layout">
            <div className="vendor-review-column">
              <div className="vendor-review-detail-grid">
                {healthSnapshot.map((item) => (
                  <article className="vendor-review-detail-item" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>

              <div className="vendor-note-card">{policyText}</div>
            </div>

            <div className="vendor-review-column">
              <div className="vendor-review-restrictions">
                {restrictionSnapshot.map((item) => (
                  <article className="vendor-review-restriction-item" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>

              <div className="vendor-next-step">
                <strong>مرحله بعدی این workspace</strong>
                <p>در گام بعدی می‌شود reasonهای افت health score، روند زمانی policy و breakdown شفاف‌تر محدودیت‌ها را روی همین ساختار سوار کرد.</p>
              </div>
            </div>
          </div>
        </SectionCard>
      </LoadableState>
    </div>
  )
}

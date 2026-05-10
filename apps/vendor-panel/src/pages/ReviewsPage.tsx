import { Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi } from '../lib/api'
import { formatFaNumber, makeStats, readText } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

export function ReviewsPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState(() => makeStats([]))
  const [policyText, setPolicyText] = useState('')

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

        const store = ((health as Record<string, unknown>).store as Record<string, unknown>) ?? {}
        const explanation = ((policy as Record<string, unknown>).explanation as Record<string, unknown>) ?? {}
        const restrictions = ((policy as Record<string, unknown>).restrictions as Record<string, unknown>) ?? {}

        setStats(
          makeStats([
            {
              label: 'rating average',
              value: formatFaNumber(Number(store.customerRatingAverage ?? 0)),
              delta: `${formatFaNumber(Number(store.customerRatingCount ?? 0))} نظر`,
              detail: 'میانگین رضایت و تعداد reviewهای مشتری',
              tone: 'success',
            },
            {
              label: 'health score',
              value: formatFaNumber(Number(store.vendorHealthScore ?? 0)),
              delta: readText(store, ['vendorHealthStatus'], 'UNKNOWN'),
              detail: 'خروجی summary سلامت فروشگاه',
              tone: 'warning',
            },
            {
              label: 'manual review',
              value: restrictions.manualReviewRequired ? 'فعال' : 'غیرفعال',
              delta: restrictions.blockNewDiscounts ? 'تخفیف محدود' : 'تخفیف آزاد',
              detail: 'وضعیت restrictionهای موثر روی فروشگاه',
              tone: 'danger',
            },
          ]),
        )
        setPolicyText(readText(explanation, ['note'], 'فعلا توضیح اضافه‌ای برای policy موثر ثبت نشده است.'))
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
          <div className="vendor-note-card">{policyText}</div>
        </SectionCard>
      </LoadableState>
    </div>
  )
}

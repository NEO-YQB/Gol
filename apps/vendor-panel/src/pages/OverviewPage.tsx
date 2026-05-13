import { SectionCard, Spotlight, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { apiConfig, vendorApi } from '../lib/api'
import { formatFaNumber, makeStats, readNestedCount, readText } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

export function OverviewPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState(() => makeStats([]))
  const [storeName, setStoreName] = useState('فروشگاه شما')
  const [policyNote, setPolicyNote] = useState('فعلا توضیحی از policy موثر ثبت نشده است.')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [wallet, settlements, tickets, health, policy] = await Promise.all([
          vendorApi.getWalletSummary(session),
          vendorApi.getSettlementsSummary(session),
          vendorApi.getTicketsSummary(session),
          vendorApi.getHealthSummary(session),
          vendorApi.getPolicyRestrictions(session),
        ])

        if (!active) return

        const walletRecord = wallet as Record<string, unknown>
        const settlementsRecord = settlements as Record<string, unknown>
        const ticketsRecord = tickets as Record<string, unknown>
        const healthRecord = health as Record<string, unknown>
        const policyRecord = policy as Record<string, unknown>
        const store = (healthRecord.store as Record<string, unknown>) ?? {}
        const walletData = (walletRecord.wallet as Record<string, unknown>) ?? {}
        const counts = (settlementsRecord.counts as Record<string, unknown>) ?? {}
        const totals = (ticketsRecord.totals as Record<string, unknown>) ?? {}
        const restrictions = (policyRecord.restrictions as Record<string, unknown>) ?? {}
        const explanation = (policyRecord.explanation as Record<string, unknown>) ?? {}

        setStoreName(readText(store, ['name'], session.user.fullName || session.user.phoneNumber))
        setStats(
          makeStats([
            {
              label: 'موجودی قابل برداشت',
              value: formatFaNumber(Number(walletData.availableBalance ?? 0)),
              delta: `${formatFaNumber(Number(walletData.heldBalance ?? 0))} نگه‌داری‌شده`,
              detail: 'نمایش مستقیم از خلاصه کیف پول فروشنده',
              tone: 'primary',
            },
            {
              label: 'تسویه‌های در جریان',
              value: formatFaNumber(readNestedCount(counts, ['processing']) + readNestedCount(counts, ['pending'])),
              delta: `${formatFaNumber(readNestedCount(counts, ['onHold']))} مورد hold`,
              detail: 'ترکیب خلاصه تسویه و محدودیت‌های موثر',
              tone: 'warning',
            },
            {
              label: 'تیکت‌های باز',
              value: formatFaNumber(readNestedCount(totals, ['open']) + readNestedCount(totals, ['inReview'])),
              delta: `${formatFaNumber(readNestedCount(totals, ['escalatedToFinance']))} ارجاع مالی`,
              detail: 'خلاصه تیکت‌های مربوط به فروشنده',
              tone: 'danger',
            },
            {
              label: 'امتیاز سلامت',
              value: formatFaNumber(Number(store.vendorHealthScore ?? 0)),
              delta: readText(store, ['vendorHealthStatus'], 'UNKNOWN'),
              detail: 'خلاصه فعلی سلامت فروشگاه',
              tone: 'success',
            },
          ]),
        )
        const reviewBlock = Boolean(restrictions.blockNewDiscounts)
        const baseNote = readText(explanation, ['note'], 'در حال حاضر policy موثر توضیح اضافه‌ای ندارد.')
        setPolicyNote(
          reviewBlock ? `${baseNote} ایجاد تخفیف جدید فعلا محدود شده است.` : baseNote,
        )
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری نمای کلی فروشنده')
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
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>
      </LoadableState>

      <Spotlight
        eyebrow="نمای کلی فروشنده"
        title={`نمای کلی فروشگاه ${storeName}`}
        description="این صفحه از summaryهای واقعی backend پر می‌شود تا فروشنده خیلی سریع بفهمد وضعیت سفارش، پول، کیفیت و محدودیت‌های فروشگاهش چیست."
        metrics={[
          { label: 'API base', value: apiConfig.baseUrl },
          { label: 'نشست', value: 'فعال' },
          { label: 'کارتابل', value: 'فروشنده' },
          { label: 'کاربر', value: session.user.fullName || session.user.phoneNumber },
        ]}
      />

      <SectionCard
        eyebrow="یادداشت policy"
        title="خلاصه policy موثر"
        description="خروجی policy restrictions باید برای فروشنده واضح و قابل‌اقدام باشد، نه مبهم و سیستمی."
      >
        <div className="vendor-note-card">{policyNote}</div>
      </SectionCard>
    </div>
  )
}

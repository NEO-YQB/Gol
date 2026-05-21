import { Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi } from '../lib/api'
import { formatFaNumber, readText, toArray } from '../lib/normalize'
import type { VendorRoute } from '../lib/routes'
import type { AuthSession } from '../lib/session'

type OrderRecord = Record<string, unknown>

const orderStatusTranslations: Record<string, string> = {
  PENDING: 'در انتظار',
  ACCEPTED: 'تایید شده',
  PROCESSING: 'در حال آماده‌سازی',
  SHIPPED: 'ارسال شده',
  DELIVERED: 'تحویل شده',
  CANCELLED: 'لغوشده',
  CANCELLED_BY_VENDOR: 'لغوشده توسط فروشنده',
  CANCELLED_BY_ADMIN: 'لغوشده توسط ادمین',
}

const paymentStatusTranslations: Record<string, string> = {
  PENDING: 'در انتظار پرداخت',
  PAID: 'پرداخت شده',
  FAILED: 'ناموفق',
  REFUNDED: 'بازگشت کامل وجه',
  PARTIALLY_REFUNDED: 'بازگشت بخشی از وجه',
}

const supportStatusTranslations: Record<string, string> = {
  OPEN: 'باز',
  IN_REVIEW: 'در حال بررسی',
  WAITING_CUSTOMER: 'منتظر مشتری',
  WAITING_VENDOR: 'منتظر فروشنده',
  ESCALATED_TO_FINANCE: 'ارجاع به مالی',
  RESOLVED: 'حل‌شده',
  REJECTED: 'ردشده',
  CANCELLED: 'لغوشده',
}

const settlementStatusTranslations: Record<string, string> = {
  PENDING: 'در انتظار',
  ELIGIBLE: 'آماده آزادسازی',
  PROCESSING: 'در حال پردازش',
  SETTLED: 'تسویه‌شده',
  ON_HOLD: 'روی هولد',
  REVERSED: 'برگشتی',
}

function translateOrderStatus(value: string) {
  return orderStatusTranslations[value] ?? value ?? 'نامشخص'
}

function translatePaymentStatus(value: string) {
  return paymentStatusTranslations[value] ?? value ?? 'نامشخص'
}

function translateSupportStatus(value: string) {
  return supportStatusTranslations[value] ?? value ?? 'نامشخص'
}

function translateSettlementStatus(value: string) {
  return settlementStatusTranslations[value] ?? value ?? 'نامشخص'
}

function getOrderStatus(record: OrderRecord) {
  return readText(record, ['status'], 'UNKNOWN')
}

function getPaymentStatus(record: OrderRecord) {
  return readText(record, ['paymentStatus'], 'UNKNOWN')
}

function getCustomerText(record: OrderRecord) {
  return readText(record, ['customerName', 'customer', 'recipientName', 'userId'], '—')
}

function getTicketOrder(record: OrderRecord) {
  return readText(record, ['orderId'], readText((record.order as OrderRecord) ?? {}, ['id'], '—'))
}

function getSettlementStatus(record: OrderRecord) {
  return readText(record, ['settlementStatus', 'status'], 'UNKNOWN')
}

function getTotalAmount(record: OrderRecord) {
  const raw = readText(record, ['totalAmount', 'payableAmount', 'finalAmount'], '0')
  const numeric = Number(raw)
  if (Number.isNaN(numeric)) return raw
  return `${formatFaNumber(numeric)} تومان`
}

function formatJalaliDate(value: unknown, withTime = false) {
  if (typeof value !== 'string' || !value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(parsed)
}

export function OrderWorkspacePage({
  session,
  order,
  onNavigate,
  onBack,
}: {
  session: AuthSession
  order: Record<string, unknown> | null
  onNavigate: (route: VendorRoute) => void
  onBack: () => void
}) {
  const [loading, setLoading] = useState(Boolean(order))
  const [error, setError] = useState<string | null>(null)
  const [tickets, setTickets] = useState<OrderRecord[]>([])
  const [settlements, setSettlements] = useState<OrderRecord[]>([])
  const [walletMeta, setWalletMeta] = useState<OrderRecord>({})
  const [healthStore, setHealthStore] = useState<OrderRecord>({})
  const [restrictions, setRestrictions] = useState<OrderRecord>({})

  const orderId = readText(order ?? {}, ['id'], '')

  useEffect(() => {
    let active = true

    async function load() {
      if (!orderId) {
        setLoading(false)
        setError('برای ورود به میزکار سفارش، ابتدا یک سفارش را از کارتابل انتخاب کن.')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const [ticketsPayload, walletPayload, settlementsPayload, healthPayload, policyPayload] =
          await Promise.all([
            vendorApi.getTicketsSummary(session),
            vendorApi.getWalletSummary(session),
            vendorApi.getSettlementsSummary(session),
            vendorApi.getHealthSummary(session),
            vendorApi.getPolicyRestrictions(session),
          ])

        if (!active) return

        const ticketList = toArray(ticketsPayload)
        const settlementRecord = (settlementsPayload as Record<string, unknown>) ?? {}
        const settlementList = toArray(settlementRecord.recentOrders ?? settlementsPayload)
        const walletRecord = (walletPayload as Record<string, unknown>) ?? {}
        const healthRecord = (healthPayload as Record<string, unknown>) ?? {}
        const policyRecord = (policyPayload as Record<string, unknown>) ?? {}

        setTickets(ticketList)
        setSettlements(settlementList)
        setWalletMeta(((walletRecord.wallet as Record<string, unknown>) ?? {}))
        setHealthStore(((healthRecord.store as Record<string, unknown>) ?? {}))
        setRestrictions(((policyRecord.restrictions as Record<string, unknown>) ?? {}))
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری میزکار سفارش')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [orderId, session])

  const relatedTickets = useMemo(() => tickets.filter((item) => getTicketOrder(item) === orderId), [orderId, tickets])

  const selectedSettlement = useMemo(
    () => settlements.find((item) => readText(item, ['id', 'orderId'], '') === orderId) ?? null,
    [orderId, settlements],
  )

  const stats = order
    ? [
        {
          label: 'وضعیت سفارش',
          value: translateOrderStatus(getOrderStatus(order)),
          delta: translatePaymentStatus(getPaymentStatus(order)),
          detail: 'جایگاه فعلی سفارش در مسیر اجرا',
          tone: 'primary' as const,
        },
        {
          label: 'پشتیبانی مرتبط',
          value: formatFaNumber(relatedTickets.length),
          delta: relatedTickets.length ? translateSupportStatus(readText(relatedTickets[0], ['status'], 'UNKNOWN')) : 'بدون تیکت',
          detail: 'هر موردی که باید در route پشتیبانی ادامه یابد',
          tone: 'warning' as const,
        },
        {
          label: 'وضعیت مالی',
          value: selectedSettlement ? translateSettlementStatus(getSettlementStatus(selectedSettlement)) : 'نامشخص',
          delta: `${formatFaNumber(Number(walletMeta.availableBalance ?? 0))} تومان موجودی آزاد`,
          detail: 'ارتباط این سفارش با release، hold یا برگشت',
          tone: 'success' as const,
        },
        {
          label: 'اثر روی کیفیت',
          value: getOrderStatus(order) === 'DELIVERED' ? 'قابل اثرگذاری' : 'هنوز زود است',
          delta: `${formatFaNumber(Number(healthStore.customerRatingCount ?? 0))} نظر ثبت‌شده`,
          detail: 'بازخورد این سفارش باید در کنار سلامت فروشگاه خوانده شود',
          tone: 'danger' as const,
        },
      ]
    : []

  const workflowSteps = order
    ? [
        {
          label: '۱. جمع‌بندی وضعیت سفارش',
          value: `${translateOrderStatus(getOrderStatus(order))} / ${translatePaymentStatus(getPaymentStatus(order))}`,
          detail: 'اول خود سفارش باید خوانده شود تا context پایه روشن بماند.',
        },
        {
          label: '۲. رفتن به پشتیبانی در صورت نیاز',
          value: relatedTickets.length ? `${formatFaNumber(relatedTickets.length)} مورد مرتبط` : 'نیازی دیده نشد',
          detail: 'اگر مشتری یا تیم عملیات برای این سفارش پرونده دارند، ادامه رسیدگی باید از route پشتیبانی انجام شود.',
        },
        {
          label: '۳. رفتن به مالی در صورت گره تسویه',
          value: selectedSettlement ? translateSettlementStatus(getSettlementStatus(selectedSettlement)) : 'summary مالی مشخص نیست',
          detail: 'release، hold و reversal نباید از روی حدس پیش بروند؛ context مالی را جدا ببین.',
        },
        {
          label: '۴. بررسی اثر روی کیفیت',
          value: getOrderStatus(order) === 'DELIVERED' ? 'سفارش تحویل شده' : 'در انتظار تکمیل',
          detail: 'برای سفارش تحویل‌شده باید اثر آن بر perception مشتری و سلامت فروشگاه را هم ببینی.',
        },
      ]
    : []

  const summaryCards = order
    ? [
        { label: 'شناسه سفارش', value: readText(order, ['id'], '—') },
        { label: 'مشتری', value: getCustomerText(order) },
        { label: 'مبلغ', value: getTotalAmount(order) },
        { label: 'ثبت سفارش', value: formatJalaliDate(order.createdAt ?? order.updatedAt, true) },
        { label: 'بازه تحویل', value: formatJalaliDate(order.deliveredAt ?? order.deliveryDate ?? order.scheduledFor, true) },
        { label: 'شماره تماس', value: readText(order, ['recipientPhoneNumber', 'phoneNumber'], '—') },
      ]
    : []

  const dependencyCards = order
    ? [
        {
          label: 'پشتیبانی سفارش',
          value: relatedTickets.length ? `${formatFaNumber(relatedTickets.length)} تیکت` : 'بدون تیکت فعال',
          detail: relatedTickets.length ? `آخرین وضعیت: ${translateSupportStatus(readText(relatedTickets[0], ['status'], 'UNKNOWN'))}` : 'برای این سفارش هنوز تیکت فعالی دیده نشده است.',
          action: 'رفتن به پشتیبانی',
          route: 'support' as const,
        },
        {
          label: 'مالی و تسویه سفارش',
          value: selectedSettlement ? translateSettlementStatus(getSettlementStatus(selectedSettlement)) : 'رکورد مالی روشن دیده نشد',
          detail: selectedSettlement ? `آخرین بروزرسانی: ${formatJalaliDate(selectedSettlement.updatedAt ?? selectedSettlement.createdAt, true)}` : 'برای بررسی دقیق‌تر، route کیف پول و تسویه را باز کن.',
          action: 'رفتن به کیف پول',
          route: 'wallet' as const,
        },
        {
          label: 'کیفیت و بازخورد',
          value: getOrderStatus(order) === 'DELIVERED' ? 'این سفارش می‌تواند بازخورد بسازد' : 'هنوز در مرحله قبل از بازخورد است',
          detail: `میانگین فعلی فروشگاه ${formatFaNumber(Number(healthStore.customerRatingAverage ?? 0))} از ۵ است.`,
          action: 'رفتن به کیفیت و سلامت',
          route: 'reviews' as const,
        },
      ]
    : []

  const reviewContext = order
    ? [
        {
          label: 'آمادگی برای نظر مشتری',
          value: getOrderStatus(order) === 'DELIVERED' ? 'بله' : 'خیر',
          detail: 'نظرات به سفارش متصل‌اند و بهترین جایشان همین context سفارش است.',
        },
        {
          label: 'میانگین امتیاز فعلی فروشگاه',
          value: `${formatFaNumber(Number(healthStore.customerRatingAverage ?? 0))} از ۵`,
          detail: `${formatFaNumber(Number(healthStore.customerRatingCount ?? 0))} نظر ثبت شده است.`,
        },
        {
          label: 'وضعیت محدودیت',
          value: restrictions.manualReviewRequired ? 'بازبینی دستی فعال است' : 'بازبینی دستی فعال نیست',
          detail: restrictions.blockNewDiscounts ? 'ایجاد تخفیف تازه محدود شده است.' : 'محدودیت تازه‌ای روی تخفیف دیده نمی‌شود.',
        },
      ]
    : []

  return (
    <div className="fm-stack">
      <div className="vendor-order-workspace-topbar">
        <button className="vendor-order-workspace-back" onClick={onBack} type="button">
          بازگشت به فهرست سفارش‌ها
        </button>
        <Pill tone="primary">{order ? `سفارش #${orderId}` : 'بدون سفارش'}</Pill>
      </div>

      <LoadableState loading={loading} error={error}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="هویت سفارش"
          title={order ? `رسیدگی متمرکز به سفارش #${orderId}` : 'میزکار سفارش'}
          description="این workspace فقط برای یک سفارش ساخته شده تا dependencyها و actionها در context همان سفارش جمع شوند و اسکرول اضافی از route اصلی حذف شود."
          hint="اگر کار روی این سفارش تمام شد، برگرد به کارتابل و سفارش بعدی را جداگانه باز کن."
          actions={<Pill tone="warning">{order ? translateOrderStatus(getOrderStatus(order)) : 'در حال انتظار'}</Pill>}
        >
          {summaryCards.length ? (
            <div className="vendor-order-workspace-summary-grid">
              {summaryCards.map((item) => (
                <article className="vendor-order-workspace-summary-card" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          ) : (
            <div className="vendor-note-card">برای نمایش جزئیات، ابتدا یک سفارش از کارتابل انتخاب کن.</div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="workflow سفارش"
          title="مسیر کامل رسیدگی به همین سفارش"
          description="این چهار گام کمک می‌کند کاربر به‌ترتیب درست تصمیم بگیرد و بین چند domain پراکنده نشود."
          hint="هرجا لازم شد، از actionهای پایین همین صفحه وارد route وابسته شو."
          actions={<Pill tone="primary">workflow روشن</Pill>}
        >
          <div className="vendor-order-workspace-workflow-grid">
            {workflowSteps.map((item) => (
              <article className="vendor-order-workspace-workflow-item" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="domainهای وابسته"
          title="پشتیبانی، مالی و کیفیت مرتبط با این سفارش"
          description="این سه بخش به سفارش وصل‌اند و از همین workspace به‌صورت تصمیم‌محور دیده می‌شوند."
          hint="اگر هرکدام نیاز به کار عمیق‌تر داشت، با دکمه همان کارت وارد route تخصصی‌اش شو."
          actions={<Pill tone="neutral">context وابسته</Pill>}
        >
          <div className="vendor-order-workspace-dependency-grid">
            {dependencyCards.map((item) => (
              <article className="vendor-order-workspace-dependency-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
                <button className="fm-button fm-button--secondary" onClick={() => onNavigate(item.route)} type="button">
                  {item.action}
                </button>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="بازخورد و سلامت"
          title="جایگاه review در context همین سفارش"
          description="به‌جای اینکه review در route سفارش گم شود یا جدا از order دیده شود، context آن در همین workspace حفظ شده است."
          hint="route کیفیت و سلامت هنوز برای نمای کلی مفید است، اما review به‌لحاظ UX از همین سفارش شروع می‌شود."
          actions={<Pill tone="warning">review-aware</Pill>}
        >
          <div className="vendor-order-workspace-review-grid">
            {reviewContext.map((item) => (
              <article className="vendor-order-workspace-review-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </LoadableState>
    </div>
  )
}

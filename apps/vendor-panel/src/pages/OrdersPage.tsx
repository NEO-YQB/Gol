import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi } from '../lib/api'
import { formatFaNumber, readText, toArray } from '../lib/normalize'
import type { VendorRoute } from '../lib/routes'
import type { AuthSession } from '../lib/session'

type OrderRecord = Record<string, unknown>

const orderColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'customer', label: 'مشتری' },
  { key: 'status', label: 'وضعیت سفارش' },
  { key: 'payment', label: 'وضعیت پرداخت' },
  { key: 'total', label: 'مبلغ' },
]

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
    ...(withTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {}),
  }).format(parsed)
}

function statusOptions(items: OrderRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getOrderStatus(item))))
  return ['ALL', ...unique]
}

function getSettlementStatus(record: OrderRecord) {
  return readText(record, ['settlementStatus', 'status'], 'UNKNOWN')
}

function getTicketOrder(record: OrderRecord) {
  return readText(record, ['orderId'], readText((record.order as OrderRecord) ?? {}, ['id'], '—'))
}

export function OrdersPage({
  session,
  onNavigate,
}: {
  session: AuthSession
  onNavigate: (route: VendorRoute) => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [tickets, setTickets] = useState<OrderRecord[]>([])
  const [settlements, setSettlements] = useState<OrderRecord[]>([])
  const [walletMeta, setWalletMeta] = useState<OrderRecord>({})
  const [healthStore, setHealthStore] = useState<OrderRecord>({})
  const [restrictions, setRestrictions] = useState<OrderRecord>({})
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [ordersPayload, ticketsPayload, walletPayload, settlementsPayload, healthPayload, policyPayload] =
          await Promise.all([
            vendorApi.getVendorOrders(session),
            vendorApi.getTicketsSummary(session),
            vendorApi.getWalletSummary(session),
            vendorApi.getSettlementsSummary(session),
            vendorApi.getHealthSummary(session),
            vendorApi.getPolicyRestrictions(session),
          ])

        if (!active) return

        const orderList = toArray(ordersPayload)
        const ticketList = toArray(ticketsPayload)
        const settlementRecord = (settlementsPayload as Record<string, unknown>) ?? {}
        const settlementList = toArray(settlementRecord.recentOrders ?? settlementsPayload)
        const walletRecord = (walletPayload as Record<string, unknown>) ?? {}
        const healthRecord = (healthPayload as Record<string, unknown>) ?? {}
        const policyRecord = (policyPayload as Record<string, unknown>) ?? {}

        setOrders(orderList)
        setTickets(ticketList)
        setSettlements(settlementList)
        setWalletMeta(((walletRecord.wallet as Record<string, unknown>) ?? {}))
        setHealthStore(((healthRecord.store as Record<string, unknown>) ?? {}))
        setRestrictions(((policyRecord.restrictions as Record<string, unknown>) ?? {}))

        if (orderList.length > 0) {
          setSelectedOrderId((current) => current ?? readText(orderList[0], ['id'], ''))
        }
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری workspace سفارش‌های فروشگاه')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [session])

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return orders.filter((item) => {
      const matchesStatus = statusFilter === 'ALL' || getOrderStatus(item) === statusFilter
      if (!matchesStatus) return false
      if (!normalizedSearch) return true

      const haystack = [
        readText(item, ['id'], ''),
        getCustomerText(item),
        translateOrderStatus(getOrderStatus(item)),
        translatePaymentStatus(getPaymentStatus(item)),
        readText(item, ['recipientPhoneNumber', 'phoneNumber'], ''),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [orders, search, statusFilter])

  useEffect(() => {
    if (filteredOrders.length === 0) {
      setSelectedOrderId(null)
      return
    }

    const hasSelected = filteredOrders.some((item) => readText(item, ['id'], '') === selectedOrderId)
    if (!hasSelected) {
      setSelectedOrderId(readText(filteredOrders[0], ['id'], ''))
    }
  }, [filteredOrders, selectedOrderId])

  const rows = useMemo(
    () =>
      filteredOrders.slice(0, 20).map((item, index) => ({
        id: readText(item, ['id'], String(index + 1)),
        customer: getCustomerText(item),
        status: translateOrderStatus(getOrderStatus(item)),
        payment: translatePaymentStatus(getPaymentStatus(item)),
        total: getTotalAmount(item),
      })),
    [filteredOrders],
  )

  const stats = useMemo(
    () => [
      {
        label: 'کل سفارش‌ها',
        value: formatFaNumber(orders.length),
        delta: `${formatFaNumber(filteredOrders.length)} در view فعلی`,
        detail: 'پایه اصلی صف کاری سفارش‌های فروشگاه',
        tone: 'primary' as const,
      },
      {
        label: 'نیازمند توجه پرداخت',
        value: formatFaNumber(orders.filter((item) => getPaymentStatus(item) !== 'PAID').length),
        delta: 'پایش وضعیت پرداخت',
        detail: 'برای تشخیص سفارش‌های معطل یا ناقص',
        tone: 'warning' as const,
      },
      {
        label: 'وابسته به پشتیبانی',
        value: formatFaNumber(tickets.length),
        delta: `${formatFaNumber(tickets.filter((item) => readText(item, ['status'], '') !== 'RESOLVED').length)} باز یا در جریان`,
        detail: 'فشار پشتیبانی‌ای که می‌تواند روی سفارش‌ها اثر بگذارد',
        tone: 'danger' as const,
      },
      {
        label: 'سفارش‌های تحویل‌شده',
        value: formatFaNumber(orders.filter((item) => getOrderStatus(item) === 'DELIVERED').length),
        delta: `${formatFaNumber(Number(healthStore.customerRatingCount ?? 0))} نظر ثبت‌شده`,
        detail: 'بخشی از صف که به بازخورد مشتری و کیفیت سرویس وصل می‌شود',
        tone: 'success' as const,
      },
    ],
    [filteredOrders.length, healthStore.customerRatingCount, orders, tickets],
  )

  const selectedOrder = useMemo(
    () => filteredOrders.find((item) => readText(item, ['id'], '') === selectedOrderId) ?? null,
    [filteredOrders, selectedOrderId],
  )

  const selectedSettlement = useMemo(
    () =>
      settlements.find((item) => readText(item, ['id', 'orderId'], '') === readText(selectedOrder ?? {}, ['id'], '')) ??
      null,
    [selectedOrder, settlements],
  )

  const relatedTickets = useMemo(
    () => tickets.filter((item) => getTicketOrder(item) === readText(selectedOrder ?? {}, ['id'], '')),
    [selectedOrder, tickets],
  )

  const selectedSummary = selectedOrder
    ? [
        { label: 'مشتری', value: getCustomerText(selectedOrder) },
        { label: 'وضعیت سفارش', value: translateOrderStatus(getOrderStatus(selectedOrder)) },
        { label: 'وضعیت پرداخت', value: translatePaymentStatus(getPaymentStatus(selectedOrder)) },
        { label: 'مبلغ', value: getTotalAmount(selectedOrder) },
        {
          label: 'تاریخ ثبت',
          value: formatJalaliDate(selectedOrder.createdAt ?? selectedOrder.updatedAt, true),
        },
        {
          label: 'تحویل / بازه',
          value: formatJalaliDate(
            selectedOrder.deliveredAt ?? selectedOrder.deliveryDate ?? selectedOrder.scheduledFor,
            true,
          ),
        },
      ]
    : []

  const dependencyCards = selectedOrder
    ? [
        {
          label: 'پشتیبانی مرتبط',
          value: `${formatFaNumber(relatedTickets.length)} تیکت`,
          detail:
            relatedTickets.length > 0
              ? `آخرین وضعیت: ${translateSupportStatus(readText(relatedTickets[0], ['status'], 'UNKNOWN'))}`
              : 'برای این سفارش هنوز تیکت ثبت نشده است.',
          action: 'رفتن به پشتیبانی',
          route: 'support' as const,
        },
        {
          label: 'تسویه و کیف پول',
          value: selectedSettlement
            ? translateSettlementStatus(getSettlementStatus(selectedSettlement))
            : 'هنوز رکورد روشنی دیده نشد',
          detail: `موجودی آزاد فعلی: ${formatFaNumber(Number(walletMeta.availableBalance ?? 0))} تومان`,
          action: 'رفتن به کیف پول',
          route: 'wallet' as const,
        },
        {
          label: 'بازخورد و سلامت',
          value:
            getOrderStatus(selectedOrder) === 'DELIVERED'
              ? 'این سفارش می‌تواند روی نظر مشتری اثر بگذارد'
              : 'بعد از تحویل، بازخورد این سفارش مهم می‌شود',
          detail: `میانگین فعلی فروشگاه ${formatFaNumber(Number(healthStore.customerRatingAverage ?? 0))} از ۵ و ${formatFaNumber(Number(healthStore.customerRatingCount ?? 0))} نظر`,
          action: 'رفتن به کیفیت و سلامت',
          route: 'reviews' as const,
        },
      ]
    : []

  const workflowSteps = selectedOrder
    ? [
        {
          label: '۱. خواندن وضعیت سفارش',
          value: `${translateOrderStatus(getOrderStatus(selectedOrder))} / ${translatePaymentStatus(getPaymentStatus(selectedOrder))}`,
          detail: 'اول مطمئن شو سفارش در چه مرحله‌ای است و آیا پرداخت آن نهایی شده یا نه.',
        },
        {
          label: '۲. سنجش وابستگی مالی',
          value: selectedSettlement
            ? translateSettlementStatus(getSettlementStatus(selectedSettlement))
            : 'بدون summary مالی روشن',
          detail: 'اگر سفارش روی هولد، در انتظار یا برگشتی است باید قبل از هر تصمیم، مسیر مالی آن خوانده شود.',
        },
        {
          label: '۳. سنجش وابستگی پشتیبانی',
          value:
            relatedTickets.length > 0
              ? `${formatFaNumber(relatedTickets.length)} تیکت مرتبط`
              : 'تیکت فعالی دیده نشد',
          detail: 'اگر مشتری یا تیم عملیات روی این سفارش پرونده باز کرده‌اند، پاسخ و پیگیری باید همان‌جا ادامه پیدا کند.',
        },
        {
          label: '۴. خواندن اثر روی کیفیت',
          value:
            getOrderStatus(selectedOrder) === 'DELIVERED'
              ? 'آماده اثرگذاری روی بازخورد مشتری'
              : 'هنوز زود است برای داوری بازخورد',
          detail: 'نظر مشتری، health score و policyهای موثر باید در تصمیم نهایی برای این سفارش دیده شوند.',
        },
      ]
    : []

  const actionBoard = selectedOrder
    ? [
        {
          title: 'باز کردن پشتیبانی مرتبط',
          description: 'اگر تیکت یا پیگیری مشتری وجود دارد، ادامه کار باید در route پشتیبانی انجام شود.',
          button: 'رفتن به پشتیبانی',
          route: 'support' as const,
          tone: 'warning' as const,
        },
        {
          title: 'رفتن به کیف پول و تسویه',
          description: 'اگر وضعیت سفارش با release، hold یا reversal گره خورده، از اینجا وارد کارتابل مالی شو.',
          button: 'رفتن به کیف پول',
          route: 'wallet' as const,
          tone: 'success' as const,
        },
        {
          title: 'دیدن کیفیت و بازخورد',
          description: 'برای دیدن اثر سفارش‌های تحویل‌شده روی امتیاز فروشگاه و محدودیت‌های فعال، این مسیر را باز کن.',
          button: 'رفتن به کیفیت و سلامت',
          route: 'reviews' as const,
          tone: 'primary' as const,
        },
      ]
    : []

  const reviewContext = selectedOrder
    ? [
        {
          label: 'آمادگی برای بازخورد',
          value: getOrderStatus(selectedOrder) === 'DELIVERED' ? 'بله' : 'هنوز نه',
          detail: 'بازخورد مشتری بعد از تحویل کامل ارزش عملیاتی پیدا می‌کند.',
        },
        {
          label: 'میانگین امتیاز فروشگاه',
          value: `${formatFaNumber(Number(healthStore.customerRatingAverage ?? 0))} از ۵`,
          detail: `${formatFaNumber(Number(healthStore.customerRatingCount ?? 0))} نظر ثبت شده تا این لحظه`,
        },
        {
          label: 'بررسی دستی',
          value: restrictions.manualReviewRequired ? 'فعال' : 'غیرفعال',
          detail: restrictions.blockNewDiscounts ? 'محدودیت تخفیف هم فعال است.' : 'محدودیت تخفیف فعالی دیده نمی‌شود.',
        },
      ]
    : []

  return (
    <div className="fm-stack">
      <LoadableState loading={loading} error={error}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="کارتابل سفارش‌ها"
          title="workspace سفارش‌های فروشگاه"
          description="این route حالا فقط لیست سفارش نیست؛ workflow سفارش، وابستگی‌های مالی و پشتیبانی، و context بازخورد مشتری را هم کنار هم جمع می‌کند."
          hint="اول سفارش را انتخاب کن، بعد با workflow پایین مشخص می‌شود ادامه کار باید در همین صفحه بماند یا به پشتیبانی، مالی و کیفیت برود."
          actions={<Pill tone="primary">سفارش‌ها v3</Pill>}
        >
          <div className="vendor-orders-toolbar">
            <div className="fm-field vendor-orders-search">
              <label htmlFor="vendor-orders-search">جستجو</label>
              <input
                id="vendor-orders-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="شناسه، مشتری، وضعیت یا شماره تماس"
                value={search}
              />
            </div>

            <div className="vendor-orders-filters">
              {statusOptions(orders).map((status) => (
                <button
                  className={`vendor-orders-filter-chip ${status === statusFilter ? 'is-active' : ''}`}
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  type="button"
                >
                  {status === 'ALL' ? 'همه' : translateOrderStatus(status)}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="صف سفارش‌ها"
          title="فهرست و انتخاب سریع سفارش"
          description="این بخش برای اسکن سریع صف و انتخاب سفارش مناسب است؛ summaryهای عمیق‌تر پایین آمده‌اند تا صفحه نکشد."
          hint="لیست را برای مقایسه سریع ببین و از ستون انتخاب برای رفتن روی سفارش درست استفاده کن."
          actions={<Pill tone="success">{`${formatFaNumber(filteredOrders.length)} سفارش`}</Pill>}
        >
          <div className="vendor-orders-table-card">
            <DataTable columns={orderColumns} rows={rows} />

            <div className="vendor-orders-selection-list">
              {filteredOrders.slice(0, 8).map((item) => {
                const id = readText(item, ['id'], '—')
                const isActive = id === selectedOrderId

                return (
                  <button
                    className={`vendor-orders-selection-item ${isActive ? 'is-active' : ''}`}
                    key={id}
                    onClick={() => setSelectedOrderId(id)}
                    type="button"
                  >
                    <strong>سفارش #{id}</strong>
                    <span>{getCustomerText(item)}</span>
                    <small>
                      {translateOrderStatus(getOrderStatus(item))} - {translatePaymentStatus(getPaymentStatus(item))}
                    </small>
                  </button>
                )
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="سفارش انتخاب‌شده"
          title={selectedOrder ? `خلاصه سفارش #${readText(selectedOrder, ['id'], '—')}` : 'سفارشی انتخاب نشده'}
          description="این summary به‌جای یک side panel کشیده، پایین route نشسته تا context سفارش کامل اما جمع‌وجور بماند."
          hint="اگر هنوز تصمیم بعدی روشن نیست، همین خلاصه را با workflow و dependencyها کنار هم بخوان."
          actions={<Pill tone="warning">{selectedOrder ? translateOrderStatus(getOrderStatus(selectedOrder)) : 'بدون انتخاب'}</Pill>}
        >
          {selectedSummary.length ? (
            <div className="vendor-orders-detail-grid">
              {selectedSummary.map((item) => (
                <article className="vendor-orders-detail-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
              <article className="vendor-orders-detail-item vendor-orders-detail-item--wide">
                <span>جمع‌بندی فوری</span>
                <strong>
                  این سفارش باید هم‌زمان از نظر وضعیت، پرداخت، پشتیبانی، مالی و اثر روی بازخورد مشتری خوانده شود تا تصمیم فروشنده ناقص نماند.
                </strong>
              </article>
            </div>
          ) : (
            <div className="vendor-note-card">در این فیلتر هنوز سفارشی برای نمایش جزئیات پیدا نشده است.</div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="workflow سفارش"
          title="مراحل رسیدگی به سفارش"
          description="تمام actionهای عملی این route در این workflow چیده شده‌اند تا فروشنده بداند از خود سفارش به کدام route وابسته باید برود."
          hint="این workflow ترتیب فکر کردن را روشن می‌کند: اول سفارش، بعد مالی، بعد پشتیبانی و در نهایت کیفیت."
          actions={<Pill tone="primary">چهار گام اصلی</Pill>}
        >
          {workflowSteps.length ? (
            <div className="vendor-orders-workflow-grid">
              {workflowSteps.map((item) => (
                <article className="vendor-orders-workflow-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="vendor-note-card">بعد از انتخاب سفارش، workflow رسیدگی اینجا کامل می‌شود.</div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="وابستگی‌های سفارش"
          title="پشتیبانی، مالی و کیفیت مرتبط با این سفارش"
          description="این بخش مشخص می‌کند برای همین سفارش چه dependencyهایی فعال‌اند تا فروشنده لازم نباشد حدس بزند ادامه کار کجاست."
          hint="اگر یکی از این سه بخش روشن کرد که کار باید در route دیگری ادامه پیدا کند، از همان action کنار کارت استفاده کن."
          actions={<Pill tone="neutral">dependency map</Pill>}
        >
          {dependencyCards.length ? (
            <div className="vendor-orders-dependency-grid">
              {dependencyCards.map((item) => (
                <article className="vendor-orders-dependency-card" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.detail}</p>
                  <button className="fm-button fm-button--secondary" onClick={() => onNavigate(item.route)} type="button">
                    {item.action}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="vendor-note-card">بعد از انتخاب سفارش، وابستگی‌های آن اینجا نمایش داده می‌شود.</div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="actionهای بعدی"
          title="ورود از سفارش به routeهای عملیاتی وابسته"
          description="در این بخش actionهای قابل‌اجرا از دل workflow بیرون آمده‌اند تا route سفارش، نقطه شروع عملیات بماند."
          hint="اگر هدف تو پاسخ به مشتری، فهم release یا بررسی اثر روی کیفیت است، از همین سه دکمه وارد route درست شو."
          actions={<Pill tone="success">action-ready</Pill>}
        >
          {actionBoard.length ? (
            <div className="vendor-orders-action-grid">
              {actionBoard.map((item) => (
                <article className="vendor-orders-action-card" key={item.title}>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  <button className="fm-button fm-button--primary" onClick={() => onNavigate(item.route)} type="button">
                    {item.button}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="vendor-note-card">پس از انتخاب سفارش، actionهای وابسته در اینجا آماده می‌شوند.</div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="بازخورد و سلامت"
          title="اثر سفارش روی نظر مشتری و سلامت فروشگاه"
          description="با اینکه review هنوز route تحلیلی عمیق‌تری نگرفته، context آن از همین حالا در سفارش دیده می‌شود چون بازخورد به order وابسته است."
          hint="این بخش جایگزین route کیفیت نیست؛ فقط کمک می‌کند فروشنده اثر هر سفارش روی perception مشتری را گم نکند."
          actions={<Pill tone="warning">review context</Pill>}
        >
          {reviewContext.length ? (
            <div className="vendor-orders-review-grid">
              {reviewContext.map((item) => (
                <article className="vendor-orders-review-card" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="vendor-note-card">برای ساخت context بازخورد، ابتدا یک سفارش انتخاب کن.</div>
          )}
        </SectionCard>
      </LoadableState>
    </div>
  )
}

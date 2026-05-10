import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi } from '../lib/api'
import { formatFaNumber, makeRows, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type OrderRecord = Record<string, unknown>

const orderColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'customer', label: 'مشتری' },
  { key: 'status', label: 'وضعیت' },
  { key: 'payment', label: 'پرداخت' },
  { key: 'total', label: 'مبلغ' },
]

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
  return Number.isNaN(numeric) ? raw : formatFaNumber(numeric)
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

function statusOptions(items: OrderRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getOrderStatus(item))))
  return ['ALL', ...unique]
}

export function OrdersPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const payload = await vendorApi.getVendorOrders(session)
        if (!active) return
        const orderList = toArray(payload)
        setOrders(orderList)
        if (orderList.length > 0) {
          setSelectedOrderId(readText(orderList[0], ['id'], ''))
        }
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری سفارش‌های فروشگاه')
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
        getOrderStatus(item),
        getPaymentStatus(item),
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
      makeRows(filteredOrders.slice(0, 20), [
        { key: 'id', source: ['id'] },
        { key: 'customer', source: ['customerName', 'customer', 'recipientName', 'userId'] },
        { key: 'status', source: ['status'] },
        { key: 'payment', source: ['paymentStatus'] },
        { key: 'total', source: ['totalAmount', 'payableAmount', 'finalAmount'] },
      ]),
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
        delta: 'payment status scan',
        detail: 'برای تشخیص سفارش‌های معطل یا ناقص',
        tone: 'warning' as const,
      },
      {
        label: 'سفارش‌های تحویل‌شده',
        value: formatFaNumber(orders.filter((item) => getOrderStatus(item) === 'DELIVERED').length),
        delta: 'completed flow',
        detail: 'نمای سریع از سفارش‌های نهایی‌شده',
        tone: 'success' as const,
      },
      {
        label: 'وضعیت‌های فعال',
        value: formatFaNumber(statusOptions(orders).length - 1),
        delta: statusFilter === 'ALL' ? 'همه وضعیت‌ها' : statusFilter,
        detail: 'پایه ساخت saved views و filter chips',
        tone: 'danger' as const,
      },
    ],
    [orders, filteredOrders.length, statusFilter],
  )

  const selectedOrder = useMemo(
    () => filteredOrders.find((item) => readText(item, ['id'], '') === selectedOrderId) ?? null,
    [filteredOrders, selectedOrderId],
  )

  const selectedSummary = selectedOrder
    ? [
        { label: 'مشتری', value: getCustomerText(selectedOrder) },
        { label: 'وضعیت سفارش', value: getOrderStatus(selectedOrder) },
        { label: 'وضعیت پرداخت', value: getPaymentStatus(selectedOrder) },
        { label: 'مبلغ', value: getTotalAmount(selectedOrder) },
        {
          label: 'تاریخ ثبت',
          value: formatJalaliDate(selectedOrder.createdAt ?? selectedOrder.updatedAt),
        },
        {
          label: 'تحویل / بازه',
          value: formatJalaliDate(
            selectedOrder.deliveredAt ?? selectedOrder.deliveryDate ?? selectedOrder.scheduledFor,
          ),
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
          eyebrow="Vendor orders"
          title="workspace سفارش‌های فروشگاه"
          description="این route دیگر فقط یک جدول خام نیست؛ search، filter، selection و خلاصه سفارش فعال را برای کار روزمره فروشنده در یک surface جمع می‌کند."
          actions={<Pill tone="primary">vendor orders v2</Pill>}
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
                  {status === 'ALL' ? 'همه' : status}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        <div className="vendor-orders-layout">
          <SectionCard
            eyebrow="Orders table"
            title="لیست سفارش‌های قابل اسکن"
            description="برای اینکه فروشنده سریع وضعیت صف سفارش‌ها را ببیند، table و selection list کنار هم آمده‌اند."
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
                        {getOrderStatus(item)} - {getPaymentStatus(item)}
                      </small>
                    </button>
                  )
                })}
              </div>
            </div>
          </SectionCard>

          <div className="vendor-orders-detail-column">
            <SectionCard
              eyebrow="Selected order"
              title={selectedOrder ? `سفارش #${readText(selectedOrder, ['id'], '—')}` : 'سفارشی انتخاب نشده'}
              description="این summary پایه detail panel بعدی است تا فروشنده بدون خروج از view اصلی، context سفارش را ببیند."
              actions={<Pill tone="warning">{selectedOrder ? getOrderStatus(selectedOrder) : 'بدون انتخاب'}</Pill>}
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
                    <span>یادداشت workspace</span>
                    <strong>
                      این بخش آماده است تا بعدا actionهای سفارش، note داخلی، وضعیت ارسال و drill-down دقیق‌تر روی همین surface سوار شوند.
                    </strong>
                  </article>
                </div>
              ) : (
                <div className="vendor-note-card">در این فیلتر هنوز سفارشی برای نمایش جزئیات پیدا نشده است.</div>
              )}
            </SectionCard>
          </div>
        </div>
      </LoadableState>
    </div>
  )
}

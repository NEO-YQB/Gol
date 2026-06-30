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

function translateOrderStatus(value: string) {
  return orderStatusTranslations[value] ?? value ?? 'نامشخص'
}

function translatePaymentStatus(value: string) {
  return paymentStatusTranslations[value] ?? value ?? 'نامشخص'
}

function getOrderStatus(record: OrderRecord) {
  return readText(record, ['status'], 'UNKNOWN')
}

function getPaymentStatus(record: OrderRecord) {
  return readText(record, ['paymentStatus'], 'UNKNOWN')
}

function getCustomerText(record: OrderRecord) {
  return readText(record, ['customerName', 'recipientName', 'recipientPhoneNumber', 'phoneNumber'], 'بدون نام')
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

function statusOptions(items: OrderRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getOrderStatus(item))))
  return ['ALL', ...unique]
}

export function OrdersPage({
  session,
  onNavigate,
  onSelectOrder,
}: {
  session: AuthSession
  onNavigate: (route: VendorRoute) => void
  onSelectOrder: (order: Record<string, unknown> | null) => void
}) {
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
          setSelectedOrderId((current) => current ?? readText(orderList[0], ['id'], ''))
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
      onSelectOrder(null)
      return
    }

    const hasSelected = filteredOrders.some((item) => readText(item, ['id'], '') === selectedOrderId)
    if (!hasSelected) {
      setSelectedOrderId(readText(filteredOrders[0], ['id'], ''))
    }
  }, [filteredOrders, onSelectOrder, selectedOrderId])

  const stats = useMemo(
    () => [
      {
        label: 'کل سفارش‌ها',
        value: formatFaNumber(orders.length),
        delta: `${formatFaNumber(filteredOrders.length)} در view فعلی`,
        detail: '',
        tone: 'primary' as const,
      },
      {
        label: 'نیازمند توجه پرداخت',
        value: formatFaNumber(orders.filter((item) => getPaymentStatus(item) !== 'PAID').length),
        delta: 'پایش وضعیت پرداخت',
        detail: '',
        tone: 'warning' as const,
      },
      {
        label: 'سفارش‌های تحویل‌شده',
        value: formatFaNumber(orders.filter((item) => getOrderStatus(item) === 'DELIVERED').length),
        delta: 'جریان تکمیل‌شده',
        detail: '',
        tone: 'success' as const,
      },
      {
        label: 'وضعیت‌های فعال',
        value: formatFaNumber(statusOptions(orders).length - 1),
        delta: statusFilter === 'ALL' ? 'همه وضعیت‌ها' : translateOrderStatus(statusFilter),
        detail: '',
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
        { label: 'وضعیت سفارش', value: translateOrderStatus(getOrderStatus(selectedOrder)) },
        { label: 'وضعیت پرداخت', value: translatePaymentStatus(getPaymentStatus(selectedOrder)) },
        { label: 'مبلغ', value: getTotalAmount(selectedOrder) },
        { label: 'تاریخ ثبت', value: formatJalaliDate(selectedOrder.createdAt ?? selectedOrder.updatedAt, true) },
      ]
    : []

  function openWorkspace() {
    if (!selectedOrder) return
    onSelectOrder(selectedOrder)
    onNavigate('order-workspace')
  }

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
          title="سفارش‌ها"
          actions={<Pill tone="primary">{`${formatFaNumber(filteredOrders.length)} سفارش`}</Pill>}
        >
          <div className="vendor-orders-toolbar">
            <div className="fm-field vendor-orders-search">
              <label htmlFor="vendor-orders-search">جستجو</label>
              <input
                id="vendor-orders-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="شناسه، مشتری یا شماره"
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

        {selectedOrder ? (
          <div className="vendor-orders-selected-bar">
            <div>
              <span>انتخاب شده</span>
              <strong>{`#${readText(selectedOrder, ['id'], '—')} · ${getCustomerText(selectedOrder)}`}</strong>
            </div>
            <Pill tone="warning">{translateOrderStatus(getOrderStatus(selectedOrder))}</Pill>
            <button className="fm-button fm-button--secondary" onClick={openWorkspace} type="button">
              میزکار سفارش
            </button>
          </div>
        ) : null}

        <div className="vendor-orders-layout">
          <SectionCard eyebrow="لیست" title="سفارش‌ها" actions={<Pill tone="success">{`${formatFaNumber(filteredOrders.length)} مورد`}</Pill>}>
            <div className="vendor-orders-table-card">
              <div className="vendor-orders-board-list">
                {filteredOrders.slice(0, 20).map((item) => {
                  const id = readText(item, ['id'], '—')
                  const isActive = id === selectedOrderId

                  return (
                    <button
                      className={`vendor-orders-board-item ${isActive ? 'is-active' : ''}`}
                      key={id}
                      onClick={() => setSelectedOrderId(id)}
                      type="button"
                    >
                      <span className="vendor-orders-board-id">{`#${id}`}</span>
                      <strong>{getCustomerText(item)}</strong>
                      <span>{translateOrderStatus(getOrderStatus(item))}</span>
                      <span>{translatePaymentStatus(getPaymentStatus(item))}</span>
                      <span>{getTotalAmount(item)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </SectionCard>

          <div className="vendor-orders-detail-column">
            <SectionCard
              eyebrow="سفارش انتخاب‌شده"
              title={selectedOrder ? `#${readText(selectedOrder, ['id'], '—')}` : 'بدون انتخاب'}
              actions={
                <div className="vendor-products-actions">
                  <Pill tone="warning">{selectedOrder ? translateOrderStatus(getOrderStatus(selectedOrder)) : 'بدون انتخاب'}</Pill>
                  <button className="fm-button fm-button--secondary" disabled={!selectedOrder} onClick={openWorkspace} type="button">
                    میزکار سفارش
                  </button>
                </div>
              }
            >
              {selectedSummary.length ? (
                <div className="vendor-orders-detail-grid">
                  {selectedSummary.map((item) => (
                    <article className="vendor-orders-detail-item" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="vendor-note-card">سفارشی انتخاب نشده.</div>
              )}
            </SectionCard>
          </div>
        </div>
      </LoadableState>
    </div>
  )
}

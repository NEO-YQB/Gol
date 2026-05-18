import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type OrderRecord = Record<string, unknown>

const orderColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'customer', label: 'مشتری' },
  { key: 'status', label: 'وضعیت سفارش' },
  { key: 'payment', label: 'پرداخت' },
  { key: 'settlement', label: 'تسویه' },
]

const exceptionColumns = [
  { key: 'id', label: 'شناسه سفارش' },
  { key: 'status', label: 'وضعیت' },
  { key: 'payment', label: 'پرداخت' },
  { key: 'settlement', label: 'تسویه' },
  { key: 'reason', label: 'علت نیاز به رسیدگی' },
]

function getOrderStatus(record: OrderRecord) {
  return readText(record, ['status'], 'UNKNOWN')
}

function getPaymentStatus(record: OrderRecord) {
  return readText(record, ['paymentStatus'], 'UNKNOWN')
}

function getSettlementStatus(record: OrderRecord) {
  return readText(record, ['settlementStatus'], 'UNKNOWN')
}

function getCustomerText(record: OrderRecord) {
  return readText(record, ['customerName', 'customer', 'recipientName', 'userId'], '—')
}

function getExceptionSummary(record: OrderRecord) {
  const reasons = Array.isArray(record.exceptionReasons) ? record.exceptionReasons.map((item) => String(item)) : []
  return reasons.length ? reasons.map((item) => getExceptionReasonLabel(item)).join(' / ') : 'بدون برچسب'
}

function getExceptionReasonLabel(reason: string) {
  switch (reason) {
    case 'PAYMENT_STATE_NEEDS_ATTENTION':
      return 'پرداخت نیازمند رسیدگی است'
    case 'DELIVERED_NOT_HELD':
      return 'سفارش تحویل شده ولی نگه داری تسویه ثبت نشده'
    case 'SETTLEMENT_OVERDUE':
      return 'مهلت آزادسازی تسویه گذشته است'
    default:
      return reason || 'نامشخص'
  }
}

function getOrderStatusLabel(status: string) {
  switch (status) {
    case 'PENDING':
      return 'در انتظار تایید'
    case 'PAID':
      return 'پرداخت شده'
    case 'ACCEPTED':
      return 'تایید شده'
    case 'PROCESSING':
      return 'در حال آماده سازی'
    case 'SHIPPED':
      return 'ارسال شده'
    case 'DELIVERED':
      return 'تحویل شده'
    case 'REJECTED_BY_VENDOR':
      return 'رد شده توسط فروشنده'
    case 'CANCELLED':
      return 'لغو شده'
    case 'CANCELLED_BY_ADMIN':
      return 'لغو شده توسط ادمین'
    case 'CANCELLED_BY_CUSTOMER':
      return 'لغو شده توسط مشتری'
    default:
      return status || 'نامشخص'
  }
}

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case 'PENDING':
      return 'در انتظار پرداخت'
    case 'PAID':
      return 'پرداخت موفق'
    case 'FAILED':
      return 'ناموفق'
    case 'EXPIRED':
      return 'منقضی شده'
    case 'REFUNDED':
      return 'بازگشت کامل وجه'
    case 'PARTIALLY_REFUNDED':
      return 'بازگشت جزئی وجه'
    default:
      return status || 'نامشخص'
  }
}

function getSettlementStatusLabel(status: string) {
  switch (status) {
    case 'PENDING':
      return 'در انتظار نگه داری'
    case 'ON_HOLD':
      return 'در نگه داری'
    case 'RELEASED':
      return 'آزاد شده'
    case 'REVERSED':
      return 'برگشت خورده'
    default:
      return status || 'نامشخص'
  }
}

function statusOptions(items: OrderRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getOrderStatus(item))))
  return ['ALL', ...unique]
}

export function OrdersPage({
  session,
  onOpenOrdersWorkspace,
}: {
  session: AuthSession
  onOpenOrdersWorkspace: (order: Record<string, unknown>) => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [exceptions, setExceptions] = useState<OrderRecord[]>([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [ordersPayload, exceptionsPayload] = await Promise.all([
          adminApi.getAdminOrders(session),
          adminApi.getOrderExceptions(session),
        ])

        if (!active) return

        const orderList = toArray(ordersPayload)
        const exceptionList = toArray(exceptionsPayload)
        setOrders(orderList)
        setExceptions(exceptionList)
        if (orderList.length > 0) {
          setSelectedOrderId(readText(orderList[0], ['id'], ''))
        }
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری کارتابل سفارش‌ها')
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
        getSettlementStatus(item),
        readText(item, ['storeName'], ''),
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

  const orderRows = useMemo(
    () =>
      filteredOrders.slice(0, 20).map((item, index) => ({
        id: readText(item, ['id'], String(index + 1)),
        customer: getCustomerText(item),
        status: getOrderStatusLabel(getOrderStatus(item)),
        payment: getPaymentStatusLabel(getPaymentStatus(item)),
        settlement: getSettlementStatusLabel(getSettlementStatus(item)),
      })),
    [filteredOrders],
  )

  const exceptionRows = useMemo(
    () =>
      exceptions.slice(0, 10).map((item, index) => ({
        id: readText(item, ['id'], String(index + 1)),
        status: getOrderStatusLabel(getOrderStatus(item)),
        payment: getPaymentStatusLabel(getPaymentStatus(item)),
        settlement: getSettlementStatusLabel(getSettlementStatus(item)),
        reason: getExceptionSummary(item),
      })),
    [exceptions],
  )

  const selectedOrder =
    filteredOrders.find((item) => readText(item, ['id'], '') === selectedOrderId) ??
    orders.find((item) => readText(item, ['id'], '') === selectedOrderId) ??
    null

  const selectedSummary = selectedOrder
    ? [
        { label: 'مشتری', value: getCustomerText(selectedOrder) },
        { label: 'وضعیت سفارش', value: getOrderStatusLabel(getOrderStatus(selectedOrder)) },
        { label: 'وضعیت پرداخت', value: getPaymentStatusLabel(getPaymentStatus(selectedOrder)) },
        { label: 'وضعیت تسویه', value: getSettlementStatusLabel(getSettlementStatus(selectedOrder)) },
        { label: 'مبلغ', value: readText(selectedOrder, ['totalAmount'], '—') },
        { label: 'فروشگاه', value: readText(selectedOrder, ['storeName', 'storeId'], '—') },
      ]
    : []

  const selectedExceptions = selectedOrder
    ? exceptions.filter((item) => readText(item, ['id'], '') === readText(selectedOrder, ['id'], ''))
    : []

  const stats = [
    {
      label: 'کل سفارش‌ها',
      value: String(orders.length),
      delta: `${filteredOrders.length} مورد در نمای فعلی`,
      detail: 'پایه جدول و ورود به میزکار',
      tone: 'primary' as const,
    },
    {
      label: 'سفارش‌های نیازمند action',
      value: String(
        orders.filter((item) => ['PENDING', 'PAID', 'ACCEPTED', 'SHIPPED'].includes(getOrderStatus(item))).length,
      ),
      delta: 'جریان‌های باز',
      detail: 'کاندیدهای اصلی برای میزکار متمرکز',
      tone: 'warning' as const,
    },
    {
      label: 'استثناهای عملیاتی',
      value: String(exceptions.length),
      delta: 'صف سفارش و مالی',
      detail: 'موارد نیازمند رسیدگی فوری',
      tone: 'danger' as const,
    },
    {
      label: 'فیلترهای فعال',
      value: String(statusOptions(orders).length - 1),
      delta: statusFilter === 'ALL' ? 'همه وضعیت‌ها' : statusFilter,
      detail: 'آماده برای نماهای ذخیره شده بعدی',
      tone: 'success' as const,
    },
  ]

  return (
    <div className="fm-stack">
      <LoadableState error={error} loading={loading}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="کارتابل سفارش"
          title="فهرست سفارش‌ها و صف ورود به میزکار"
          description="این route عمدا فقط نقش کارتابل، فیلتر، جدول و handoff به جریان متمرکز را دارد؛ actionهای سنگین از این سطح جدا شده‌اند."
          actions={<Pill tone="primary">کارتابل فهرست</Pill>}
        >
          <div className="orders-toolbar">
            <div className="fm-field orders-search">
              <label htmlFor="orders-search">جستجو</label>
              <input
                id="orders-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="شناسه سفارش، مشتری، فروشگاه، پرداخت یا تسویه"
                value={search}
              />
            </div>

            <div className="orders-filters">
              {statusOptions(orders).map((status) => (
                <button
                  className={`orders-filter-chip${status === statusFilter ? ' is-active' : ''}`}
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  type="button"
                >
                  {status === 'ALL' ? 'همه وضعیت‌ها' : getOrderStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>

          <div className="orders-layout">
            <div className="orders-table-card">
              <DataTable columns={orderColumns} rows={orderRows} />

              <div className="orders-selection-list">
                {filteredOrders.slice(0, 8).map((item) => {
                  const orderId = readText(item, ['id'], '')
                  const isActive = selectedOrderId === orderId

                  return (
                    <button
                      className={`orders-selection-item${isActive ? ' is-active' : ''}`}
                      key={orderId}
                      onClick={() => setSelectedOrderId(orderId)}
                      type="button"
                    >
                      <strong>{`سفارش #${orderId}`}</strong>
                      <span>{`${getCustomerText(item)} - ${getOrderStatusLabel(getOrderStatus(item))}`}</span>
                      <small>{`${getPaymentStatusLabel(getPaymentStatus(item))} / ${getSettlementStatusLabel(getSettlementStatus(item))}`}</small>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="orders-detail-column">
              <SectionCard
                eyebrow="سفارش انتخاب شده"
                title={selectedOrder ? `آماده ورود به میزکار سفارش #${readText(selectedOrder, ['id'], '—')}` : 'سفارشی انتخاب نشده'}
                description="این summary کوتاه نگه داشته شده تا اپراتور بعد از انتخاب، وارد سطح متمرکز سفارش شود."
                actions={<Pill tone="warning">{selectedOrder ? getOrderStatus(selectedOrder) : 'بدون انتخاب'}</Pill>}
              >
                {selectedSummary.length ? (
                  <div className="orders-detail-grid">
                    {selectedSummary.map((item) => (
                      <article className="orders-detail-item" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="fm-message">برای ادامه، یک سفارش را از فهرست انتخاب کن.</div>
                )}

                <div className="orders-workspace-entry">
                  <p>
                    actionهای عملیاتی سنگین مثل تایید، ارسال، تحویل، بررسی پرداخت، بازگشت وجه و آزادسازی تسویه از این
                    صفحه جدا شده‌اند.
                  </p>
                  <button
                    className="orders-primary-button"
                    disabled={!selectedOrder}
                    onClick={() => selectedOrder && onOpenOrdersWorkspace(selectedOrder)}
                    type="button"
                  >
                    ورود به میزکار سفارش
                  </button>
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="صف استثناها"
                title="مواردی که باید زودتر triage شوند"
                description="اگر سفارش انتخاب‌شده جزو exceptionها باشد، از همین‌جا به میزکار آن وارد شو تا رسیدگی کامل را انجام بدهی."
                actions={<Pill tone="danger">{`${exceptions.length} استثنا`}</Pill>}
              >
                <DataTable columns={exceptionColumns} rows={exceptionRows} />

                <div className="orders-exception-list">
                  {selectedExceptions.length ? (
                    selectedExceptions.map((item, index) => (
                      <article className="orders-exception-list-item" key={readText(item, ['id'], String(index + 1))}>
                        <strong>{`سفارش #${readText(item, ['id'], '—')}`}</strong>
                        <span>{getExceptionSummary(item)}</span>
                      </article>
                    ))
                  ) : (
                    <div className="fm-message">برای سفارش انتخاب‌شده در صف استثناها مورد مستقیمی دیده نمی‌شود.</div>
                  )}
                </div>
              </SectionCard>
            </div>
          </div>
        </SectionCard>
      </LoadableState>
    </div>
  )
}

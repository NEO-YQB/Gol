import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type OrderRecord = Record<string, unknown>
const ordersPerPage = 10
const exceptionsPerPage = 5

const orderColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'customer', label: 'مشتری' },
  { key: 'nationalId', label: 'کد ملی' },
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
  const [ordersPage, setOrdersPage] = useState(1)
  const [exceptionsPage, setExceptionsPage] = useState(1)

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
    setOrdersPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    setExceptionsPage(1)
  }, [selectedOrderId])

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

  const ordersPageCount = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage))
  const currentOrders = useMemo(() => {
    const start = (ordersPage - 1) * ordersPerPage
    return filteredOrders.slice(start, start + ordersPerPage)
  }, [filteredOrders, ordersPage])

  useEffect(() => {
    setOrdersPage((current) => Math.min(current, ordersPageCount))
  }, [ordersPageCount])

  const orderRows = useMemo(
    () =>
      currentOrders.map((item, index) => ({
        id: readText(item, ['id'], String(index + 1)),
        customer: getCustomerText(item),
        nationalId: readText(item, ['customerNationalId'], '—'),
        status: getOrderStatusLabel(getOrderStatus(item)),
        payment: getPaymentStatusLabel(getPaymentStatus(item)),
        settlement: getSettlementStatusLabel(getSettlementStatus(item)),
      })),
    [currentOrders],
  )

  const exceptionsPageCount = Math.max(1, Math.ceil(exceptions.length / exceptionsPerPage))
  const currentExceptions = useMemo(() => {
    const start = (exceptionsPage - 1) * exceptionsPerPage
    return exceptions.slice(start, start + exceptionsPerPage)
  }, [exceptions, exceptionsPage])

  useEffect(() => {
    setExceptionsPage((current) => Math.min(current, exceptionsPageCount))
  }, [exceptionsPageCount])

  const exceptionRows = useMemo(
    () =>
      currentExceptions.map((item, index) => ({
        id: readText(item, ['id'], String(index + 1)),
        status: getOrderStatusLabel(getOrderStatus(item)),
        payment: getPaymentStatusLabel(getPaymentStatus(item)),
        settlement: getSettlementStatusLabel(getSettlementStatus(item)),
        reason: getExceptionSummary(item),
      })),
    [currentExceptions],
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
      hint: 'این کارت نشان می‌دهد چند سفارش در کل داریم و چند سفارش با فیلترهای فعلی دیده می‌شوند.',
      tone: 'primary' as const,
    },
    {
      label: 'سفارش‌های نیازمند اقدام',
      value: String(
        orders.filter((item) => ['PENDING', 'PAID', 'ACCEPTED', 'SHIPPED'].includes(getOrderStatus(item))).length,
      ),
      delta: 'جریان‌های باز',
      detail: 'کاندیدهای اصلی برای میزکار متمرکز',
      hint: 'این عدد کمک می‌کند سریع بفهمی چند سفارش هنوز به تصمیم یا اقدام عملیاتی نیاز دارند.',
      tone: 'warning' as const,
    },
    {
      label: 'استثناهای عملیاتی',
      value: String(exceptions.length),
      delta: 'صف سفارش و مالی',
      detail: 'موارد نیازمند رسیدگی فوری',
      hint: 'این بخش سفارش‌هایی را می‌شمارد که از نظر پرداخت یا تسویه به رسیدگی فوری نیاز دارند.',
      tone: 'danger' as const,
    },
    {
      label: 'فیلترهای فعال',
      value: String(statusOptions(orders).length - 1),
      delta: statusFilter === 'ALL' ? 'همه وضعیت‌ها' : getOrderStatusLabel(statusFilter),
      detail: 'آماده برای نماهای ذخیره شده بعدی',
      hint: 'از اینجا می‌توانی بفهمی چند وضعیت مختلف در فهرست فعلی حضور دارند.',
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
          description="این صفحه فقط برای پیدا کردن سفارش، دیدن وضعیت کلی و ورود به میزکار رسیدگی است. همه کارهای سنگین در میزکار انجام می‌شوند تا صفحه شلوغ نشود."
          hint="ابتدا سفارش را پیدا کن، بعد خلاصه کوتاه آن را ببین و سپس وارد میزکار شو تا ادامه رسیدگی را آنجا انجام دهی."
          actions={<Pill tone="primary">کارتابل فهرست</Pill>}
        >
          <div className="orders-toolbar">
            <div className="fm-field orders-search">
              <label htmlFor="orders-search">جستجو</label>
              <input
                id="orders-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="شناسه سفارش، نام مشتری، فروشگاه، وضعیت پرداخت یا وضعیت تسویه"
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

              {ordersPageCount > 1 ? (
                <div className="orders-pagination">
                  <button
                    className="orders-pagination-button"
                    disabled={ordersPage === 1}
                    onClick={() => setOrdersPage((current) => Math.max(1, current - 1))}
                    type="button"
                  >
                    صفحه قبل
                  </button>
                  <span>{`صفحه ${ordersPage} از ${ordersPageCount}`}</span>
                  <button
                    className="orders-pagination-button"
                    disabled={ordersPage === ordersPageCount}
                    onClick={() => setOrdersPage((current) => Math.min(ordersPageCount, current + 1))}
                    type="button"
                  >
                    صفحه بعد
                  </button>
                </div>
              ) : null}

              <div className="orders-selection-list">
                {currentOrders.map((item) => {
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
                description="این خلاصه کوتاه است تا فقط تصمیم ورود به میزکار را آسان کند. جزئیات اصلی و کارهای عملیاتی در میزکار نمایش داده می‌شوند."
                hint="اگر اطلاعات این بخش کافی نبود، طبیعی است. اینجا فقط برای انتخاب است و ادامه کار در میزکار انجام می‌شود."
                actions={<Pill tone="warning">{selectedOrder ? getOrderStatusLabel(getOrderStatus(selectedOrder)) : 'بدون انتخاب'}</Pill>}
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
                    کارهای اصلی مثل تایید سفارش، ثبت ارسال، ثبت تحویل، رسیدگی به پرداخت، بازگشت وجه و آزادسازی تسویه
                    از این صفحه جدا شده‌اند تا روند کار ساده و روشن بماند.
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
                title="مواردی که باید زودتر بررسی شوند"
                description="این فهرست برای سفارش‌هایی است که از نظر پرداخت یا تسویه نیاز به توجه بیشتری دارند."
                hint="اگر سفارشی در این بخش دیده می‌شود، بهتر است زودتر وارد میزکار همان سفارش شوی و دلیل مشکل را بررسی کنی."
                actions={<Pill tone="danger">{`${exceptions.length} استثنا`}</Pill>}
              >
                <DataTable columns={exceptionColumns} rows={exceptionRows} />

                {exceptionsPageCount > 1 ? (
                  <div className="orders-pagination">
                    <button
                      className="orders-pagination-button"
                      disabled={exceptionsPage === 1}
                      onClick={() => setExceptionsPage((current) => Math.max(1, current - 1))}
                      type="button"
                    >
                      صفحه قبل
                    </button>
                    <span>{`صفحه ${exceptionsPage} از ${exceptionsPageCount}`}</span>
                    <button
                      className="orders-pagination-button"
                      disabled={exceptionsPage === exceptionsPageCount}
                      onClick={() => setExceptionsPage((current) => Math.min(exceptionsPageCount, current + 1))}
                      type="button"
                    >
                      صفحه بعد
                    </button>
                  </div>
                ) : null}

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

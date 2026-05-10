import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { makeRows, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type OrderRecord = Record<string, unknown>

const orderColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'customer', label: 'مشتری' },
  { key: 'status', label: 'وضعیت' },
  { key: 'payment', label: 'پرداخت' },
]

const exceptionColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'type', label: 'نوع' },
  { key: 'status', label: 'وضعیت' },
  { key: 'note', label: 'یادداشت' },
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

function statusOptions(items: OrderRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getOrderStatus(item))))
  return ['ALL', ...unique]
}

export function OrdersPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [exceptions, setExceptions] = useState<OrderRecord[]>([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null)

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
          setSelectedOrderId(String(readText(orderList[0], ['id'], '')))
        }
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری سفارش‌ها')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [session])

  useEffect(() => {
    if (!selectedOrderId) {
      setSelectedOrder(null)
      setDetailError(null)
      return
    }

    let active = true

    async function loadDetail() {
      setDetailLoading(true)
      setDetailError(null)

      try {
        const payload = await adminApi.getOrderDetail(session, selectedOrderId)
        if (!active) return
        setSelectedOrder((payload as Record<string, unknown>) ?? null)
      } catch (loadError) {
        if (!active) return
        setDetailError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری جزئیات سفارش')
      } finally {
        if (active) setDetailLoading(false)
      }
    }

    void loadDetail()

    return () => {
      active = false
    }
  }, [selectedOrderId, session])

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
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [orders, search, statusFilter])

  const orderRows = useMemo(
    () =>
      makeRows(filteredOrders.slice(0, 20), [
        { key: 'id', source: ['id'] },
        { key: 'customer', source: ['customerName', 'customer', 'recipientName', 'userId'] },
        { key: 'status', source: ['status'] },
        { key: 'payment', source: ['paymentStatus'] },
      ]),
    [filteredOrders],
  )

  const exceptionRows = useMemo(
    () =>
      makeRows(exceptions.slice(0, 10), [
        { key: 'id', source: ['id', 'orderId'] },
        { key: 'type', source: ['type', 'reason', 'status'] },
        { key: 'status', source: ['status'] },
        { key: 'note', source: ['note', 'message', 'description'] },
      ]),
    [exceptions],
  )

  const stats = useMemo(
    () => [
      {
        label: 'کل سفارش‌ها',
        value: String(orders.length),
        delta: `${filteredOrders.length} در view فعلی`,
        detail: 'پایه اصلی table و search/filter',
        tone: 'primary' as const,
      },
      {
        label: 'پرداخت‌های نیازمند توجه',
        value: String(orders.filter((item) => getPaymentStatus(item) !== 'PAID').length),
        delta: 'payment status scan',
        detail: 'برای reconciliation و review بعدی',
        tone: 'warning' as const,
      },
      {
        label: 'exceptionها',
        value: String(exceptions.length),
        delta: 'ops queue',
        detail: 'stuck order, anomaly و نیازمند follow-up',
        tone: 'danger' as const,
      },
      {
        label: 'وضعیت‌های فعال',
        value: String(statusOptions(orders).length - 1),
        delta: statusFilter === 'ALL' ? 'همه وضعیت‌ها' : statusFilter,
        detail: 'برای ساخت saved views و filter chips',
        tone: 'success' as const,
      },
    ],
    [orders, filteredOrders.length, exceptions.length, statusFilter],
  )

  const selectedSummary = selectedOrder
    ? [
        { label: 'مشتری', value: getCustomerText(selectedOrder) },
        { label: 'وضعیت سفارش', value: getOrderStatus(selectedOrder) },
        { label: 'وضعیت پرداخت', value: getPaymentStatus(selectedOrder) },
        { label: 'مبلغ', value: readText(selectedOrder, ['totalAmount'], '—') },
      ]
    : []

  return (
    <div className="fm-stack">
      <LoadableState error={error} loading={loading}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="Orders workspace"
          title="workspace سفارش‌های ادمین"
          description="این صفحه حالا فقط یک table خام نیست؛ search، filter، exception queue و order detail summary را در یک workspace واحد جمع می‌کند."
          actions={<Pill tone="primary">workspace v1</Pill>}
        >
          <div className="orders-toolbar">
            <div className="fm-field orders-search">
              <label htmlFor="orders-search">جستجو</label>
              <input
                id="orders-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="شناسه سفارش، مشتری، وضعیت یا پرداخت"
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
                  {status === 'ALL' ? 'همه' : status}
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
                  return (
                    <button
                      className={`orders-selection-item${selectedOrderId === orderId ? ' is-active' : ''}`}
                      key={orderId}
                      onClick={() => setSelectedOrderId(orderId)}
                      type="button"
                    >
                      <strong>سفارش #{orderId}</strong>
                      <span>{getCustomerText(item)}</span>
                      <small>
                        {getOrderStatus(item)} / {getPaymentStatus(item)}
                      </small>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="orders-detail-column">
              <SectionCard
                eyebrow="Selected order"
                title={selectedOrderId ? `جزئیات سفارش #${selectedOrderId}` : 'هیچ سفارشی انتخاب نشده'}
                description="این بلوک فعلا summary detail را از `/orders/:id` می‌گیرد و بعدا به full detail panel تبدیل می‌شود."
                actions={<Pill tone="success">detail ready</Pill>}
              >
                {detailLoading ? <div className="fm-message">در حال بارگذاری جزئیات سفارش...</div> : null}
                {detailError ? <div className="fm-message fm-message--danger">{detailError}</div> : null}
                {!detailLoading && !detailError && selectedSummary.length > 0 ? (
                  <div className="orders-detail-grid">
                    {selectedSummary.map((item) => (
                      <article className="orders-detail-item" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </article>
                    ))}
                    <article className="orders-detail-item orders-detail-item--wide">
                      <span>timeline / notes readiness</span>
                      <strong>
                        این detail block در مرحله بعدی به timeline، items، notes و actionهای order متصل می‌شود.
                      </strong>
                    </article>
                  </div>
                ) : null}
              </SectionCard>

              <SectionCard
                eyebrow="Exceptions"
                title="صف exceptionها"
                description="queueهای exception باید برای ادمین سریع، اسکن‌پذیر و action-oriented باشند."
                actions={<Pill tone="warning">ops queue</Pill>}
              >
                <DataTable columns={exceptionColumns} rows={exceptionRows} />
              </SectionCard>
            </div>
          </div>
        </SectionCard>
      </LoadableState>
    </div>
  )
}

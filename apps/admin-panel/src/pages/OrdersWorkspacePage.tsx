import { ActivityFeed, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import { hasPermission } from '../lib/permissions'
import type { AuthSession } from '../lib/session'

type OrderRecord = Record<string, unknown>
type WorkspaceLane = 'overview' | 'payment' | 'fulfillment' | 'exceptions'
const itemsPerPage = 4
const feedPerPage = 5
const alertsPerPage = 4

function toObject(value: unknown): OrderRecord {
  return typeof value === 'object' && value !== null ? (value as OrderRecord) : {}
}

function formatJalaliDate(value: unknown, withTime = false) {
  if (typeof value !== 'string' || !value) return '—'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

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

function formatPersianNumber(value: unknown) {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('fa-IR').format(value)
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      return new Intl.NumberFormat('fa-IR').format(parsed)
    }

    return value
  }

  return '—'
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

function getReviewStatusLabel(status: string) {
  switch (status) {
    case 'NEEDS_REVIEW':
      return 'نیازمند بررسی'
    case 'UNDER_REVIEW':
      return 'در حال بررسی'
    case 'APPROVED':
      return 'تایید شده'
    case 'REJECTED':
      return 'رد شده'
    case 'RESOLVED':
      return 'حل شده'
    default:
      return status || 'نامشخص'
  }
}

function getPaymentMethodLabel(method: string) {
  switch (method) {
    case 'ONLINE':
      return 'آنلاین'
    case 'COD':
      return 'پرداخت در محل'
    default:
      return method || 'نامشخص'
  }
}

function getToneByStatus(status: string) {
  if (
    status === 'FAILED' ||
    status === 'EXPIRED' ||
    status === 'REJECTED_BY_VENDOR' ||
    status === 'CANCELLED' ||
    status === 'CANCELLED_BY_ADMIN' ||
    status === 'REFUNDED' ||
    status === 'REVERSED'
  ) {
    return 'danger' as const
  }

  if (
    status === 'PENDING' ||
    status === 'PROCESSING' ||
    status === 'UNDER_REVIEW' ||
    status === 'NEEDS_REVIEW' ||
    status === 'ON_HOLD'
  ) {
    return 'warning' as const
  }

  if (status === 'PAID' || status === 'DELIVERED' || status === 'RELEASED' || status === 'APPROVED') {
    return 'success' as const
  }

  return 'primary' as const
}

function getCustomerLabel(order: OrderRecord) {
  const user = toObject(order.user)
  return readText(user, ['fullName'], readText(order, ['customerName'], readText(user, ['phoneNumber'], readText(order, ['customerPhoneNumber'], 'بدون نام'))))
}

function getStoreLabel(order: OrderRecord) {
  const store = toObject(order.store)
  return readText(store, ['name', 'slug'], readText(order, ['storeName', 'storeId'], '—'))
}

function getAddressLabel(order: OrderRecord) {
  const address = toObject(order.address)
  const line = [
    readText(address, ['title'], ''),
    readText(address, ['province'], ''),
    readText(address, ['city'], ''),
    readText(address, ['addressLine1', 'address'], ''),
  ]
    .filter(Boolean)
    .join(' | ')

  return line || 'ثبت نشده'
}

function getNationalIdLabel(order: OrderRecord) {
  return readText(order, ['customerNationalId', 'user.nationalId'], 'ثبت نشده')
}

function getExceptionLabel(reason: string) {
  switch (reason) {
    case 'PAYMENT_STATE_NEEDS_ATTENTION':
      return 'وضعیت پرداخت نیازمند رسیدگی است'
    case 'DELIVERED_NOT_HELD':
      return 'سفارش تحویل شده ولی نگه داری تسویه ثبت نشده'
    case 'SETTLEMENT_OVERDUE':
      return 'مهلت آزادسازی تسویه رسیده و هنوز انجام نشده'
    case 'PAYMENT_EXPIRED':
      return 'پرداخت منقضی شده'
    case 'SETTLEMENT_NOT_HELD':
      return 'سفارش تحویل شده اما نگه داری تسویه ثبت نشده'
    case 'REVIEW_REQUIRED':
      return 'پرداخت نیازمند بررسی دستی است'
    case 'PAYMENT_FAILED':
      return 'پرداخت ناموفق شده'
    default:
      return reason || 'مورد ناشناخته'
  }
}


function getRecommendedActionLabel(options: {
  canAccept: boolean
  canShip: boolean
  canDeliver: boolean
  canCancel: boolean
  canInitiatePayment: boolean
  canManualRefund: boolean
  canReleaseSettlement: boolean
  paymentExceptionsCount: number
  operationalFlagsCount: number
}) {
  if (options.paymentExceptionsCount > 0 || options.operationalFlagsCount > 0) {
    return 'بررسی استثناها'
  }

  if (options.canInitiatePayment) {
    return 'ایجاد پرداخت'
  }

  if (options.canAccept) {
    return 'تایید سفارش'
  }

  if (options.canShip) {
    return 'ثبت ارسال'
  }

  if (options.canDeliver) {
    return 'ثبت تحویل'
  }

  if (options.canReleaseSettlement) {
    return 'آزادسازی تسویه'
  }

  if (options.canManualRefund) {
    return 'بازگشت وجه'
  }

  if (options.canCancel) {
    return 'لغو سفارش'
  }

  return 'اقدام مستقیمی نیست'
}

function toPositiveNumber(value: string) {
  const parsed = Number(value)
  return Number.isNaN(parsed) || parsed <= 0 ? undefined : parsed
}

export function OrdersWorkspacePage({
  session,
  order,
  onBack,
}: {
  session: AuthSession
  order: Record<string, unknown> | null
  onBack: () => void
}) {
  const [loading, setLoading] = useState(Boolean(order))
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<OrderRecord | null>(null)
  const [paymentDetail, setPaymentDetail] = useState<OrderRecord | null>(null)
  const [paymentExceptions, setPaymentExceptions] = useState<OrderRecord[]>([])
  const [activeLane, setActiveLane] = useState<WorkspaceLane>('overview')
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  useNoticeEffect(actionMessage, 'success')
  useNoticeEffect(actionError, 'error')
  const [progressNote, setProgressNote] = useState('')
  const [cancelForm, setCancelForm] = useState({ reason: '', note: '' })
  const [vendorCancelForm, setVendorCancelForm] = useState({ reason: '', note: '' })
  const [paymentInitForm, setPaymentInitForm] = useState({ gatewayConfigId: '', gatewayKey: '' })
  const [reviewForm, setReviewForm] = useState({
    reviewStatus: 'NEEDS_REVIEW',
    reviewReason: '',
    reviewNote: '',
  })
  const [refundForm, setRefundForm] = useState({ reason: '', note: '' })
  const [itemsPage, setItemsPage] = useState(1)
  const [feedPage, setFeedPage] = useState(1)
  const [flagsPage, setFlagsPage] = useState(1)
  const [paymentExceptionsPage, setPaymentExceptionsPage] = useState(1)

  const orderId = readText(order ?? {}, ['id'], '')

  const loadWorkspace = useCallback(async () => {
    if (!orderId) {
      setLoading(false)
      setDetail(null)
      setPaymentDetail(null)
      setError('برای ورود به میزکار سفارش، ابتدا یک سفارش را از کارتابل انتخاب کن.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const orderPayload = await adminApi.getOrderDetail(session, orderId)
      const nextDetail = toObject(orderPayload)
      const paymentRecord = toObject(nextDetail.payment)
      const paymentId = readText(paymentRecord, ['id'], '')

      let nextPaymentDetail: OrderRecord | null = null
      if (paymentId && paymentId !== '—') {
        const payload = await adminApi.getPaymentDetail(session, paymentId)
        nextPaymentDetail = toObject(payload)
      }

      const exceptionPayload = await adminApi.getPaymentExceptions(session)
      const exceptions = toArray(exceptionPayload).filter(
        (item) => readText(toObject(item.order), ['id'], '') === orderId || readText(item, ['orderId'], '') === orderId,
      )

      setDetail(nextDetail)
      setPaymentDetail(nextPaymentDetail)
      setPaymentExceptions(exceptions)
      setReviewForm((current) => ({
        reviewStatus: readText(nextPaymentDetail ?? {}, ['reviewStatus'], current.reviewStatus),
        reviewReason: readText(nextPaymentDetail ?? {}, ['reviewReason'], current.reviewReason),
        reviewNote: readText(nextPaymentDetail ?? {}, ['reviewNote'], current.reviewNote),
      }))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری میزکار سفارش')
    } finally {
      setLoading(false)
    }
  }, [orderId, session])

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

  useEffect(() => {
    setItemsPage(1)
    setFeedPage(1)
    setFlagsPage(1)
    setPaymentExceptionsPage(1)
  }, [orderId])

  const currentOrder = detail ?? order ?? {}
  const payment = useMemo(() => toObject(currentOrder.payment), [currentOrder])
  const paymentId = readText(payment, ['id'], '')
  const availableActions = useMemo(() => toObject(currentOrder.availableActions), [currentOrder])
  const orderItems = useMemo(() => toArray(currentOrder.orderItems), [currentOrder])
  const timeline = useMemo(() => toArray(currentOrder.timeline), [currentOrder])
  const auditTrail = useMemo(() => toArray(currentOrder.auditTrail), [currentOrder])
  const paymentTimeline = useMemo(() => toArray(paymentDetail?.timeline), [paymentDetail])
  const paymentAuditTrail = useMemo(() => toArray(paymentDetail?.auditTrail), [paymentDetail])
  const orderStatus = readText(currentOrder, ['status'], 'UNKNOWN')
  const paymentStatus = readText(currentOrder, ['paymentStatus'], readText(payment, ['status'], 'UNKNOWN'))
  const settlementStatus = readText(currentOrder, ['settlementStatus'], 'UNKNOWN')
  const reviewStatus = readText(paymentDetail ?? payment, ['reviewStatus'], '—')
  const operationalFlags = useMemo(
    () => [
      ...new Set([
        ...(Array.isArray(currentOrder.latestOperationalFlags)
          ? currentOrder.latestOperationalFlags.map((item) => String(item))
          : []),
        ...(Array.isArray(paymentDetail?.latestOperationalFlags)
          ? paymentDetail.latestOperationalFlags.map((item) => String(item))
          : []),
        ...paymentExceptions.flatMap((item) => {
          const reasons = Array.isArray(item.exceptionReasons) ? item.exceptionReasons : []
          return reasons.map((reason) => String(reason))
        }),
      ]),
    ],
    [currentOrder.latestOperationalFlags, paymentDetail?.latestOperationalFlags, paymentExceptions],
  )

  const combinedFeed = useMemo(() => {
    const items = [
      ...timeline.map((item, index) => ({
        id: `timeline-${readText(item, ['id'], String(index + 1))}`,
        title: `تغییر وضعیت: ${getOrderStatusLabel(readText(item, ['toStatus'], 'UNKNOWN'))}`,
        meta: `${readText(item, ['actorType'], 'SYSTEM')} - ${formatJalaliDate(readText(item, ['createdAt'], ''), true)}`,
        description: readText(item, ['note', 'reason'], 'بدون یادداشت ثبت شده'),
        tone: getToneByStatus(readText(item, ['toStatus'], 'UNKNOWN')),
      })),
      ...auditTrail.map((item, index) => ({
        id: `audit-${readText(item, ['id'], String(index + 1))}`,
        title: readText(item, ['summary', 'eventType'], 'رخداد عملیاتی سفارش'),
        meta: formatJalaliDate(readText(item, ['createdAt'], ''), true),
        description: readText(item, ['summary', 'note'], 'رخداد جدیدی برای سفارش ثبت شده است.'),
        tone: 'primary' as const,
      })),
      ...paymentTimeline.map((item, index) => ({
        id: `payment-timeline-${readText(item, ['id'], String(index + 1))}`,
        title: readText(item, ['summary', 'eventType'], 'رخداد پرداخت'),
        meta: formatJalaliDate(readText(item, ['createdAt'], ''), true),
        description: readText(item, ['summary', 'note'], 'وضعیت مرتبط با پرداخت بروزرسانی شده است.'),
        tone: 'warning' as const,
      })),
      ...paymentAuditTrail.map((item, index) => ({
        id: `payment-audit-${readText(item, ['id'], String(index + 1))}`,
        title: readText(item, ['summary', 'eventType'], 'ثبت مالی پرداخت'),
        meta: formatJalaliDate(readText(item, ['createdAt'], ''), true),
        description: readText(item, ['summary', 'note'], 'ثبت رویداد مالی برای این سفارش'),
        tone: 'success' as const,
      })),
    ]

    return items
  }, [auditTrail, paymentAuditTrail, paymentTimeline, timeline])

  const itemsPageCount = Math.max(1, Math.ceil(orderItems.length / itemsPerPage))
  const currentItems = useMemo(() => {
    const start = (itemsPage - 1) * itemsPerPage
    return orderItems.slice(start, start + itemsPerPage)
  }, [itemsPage, orderItems])

  const feedPageCount = Math.max(1, Math.ceil(combinedFeed.length / feedPerPage))
  const currentFeed = useMemo(() => {
    const start = (feedPage - 1) * feedPerPage
    return combinedFeed.slice(start, start + feedPerPage)
  }, [combinedFeed, feedPage])

  const flagsPageCount = Math.max(1, Math.ceil(operationalFlags.length / alertsPerPage))
  const currentFlags = useMemo(() => {
    const start = (flagsPage - 1) * alertsPerPage
    return operationalFlags.slice(start, start + alertsPerPage)
  }, [flagsPage, operationalFlags])

  const paymentExceptionsPageCount = Math.max(1, Math.ceil(paymentExceptions.length / alertsPerPage))
  const currentPaymentExceptions = useMemo(() => {
    const start = (paymentExceptionsPage - 1) * alertsPerPage
    return paymentExceptions.slice(start, start + alertsPerPage)
  }, [paymentExceptions, paymentExceptionsPage])

  useEffect(() => {
    setItemsPage((current) => Math.min(current, itemsPageCount))
  }, [itemsPageCount])

  useEffect(() => {
    setFeedPage((current) => Math.min(current, feedPageCount))
  }, [feedPageCount])

  useEffect(() => {
    setFlagsPage((current) => Math.min(current, flagsPageCount))
  }, [flagsPageCount])

  useEffect(() => {
    setPaymentExceptionsPage((current) => Math.min(current, paymentExceptionsPageCount))
  }, [paymentExceptionsPageCount])

  const stats = [
    {
      label: 'وضعیت سفارش',
      value: getOrderStatusLabel(orderStatus),
      delta: getPaymentStatusLabel(paymentStatus),
      detail: '',
      tone: getToneByStatus(orderStatus),
    },
    {
      label: 'مبلغ سفارش',
      value: formatPersianNumber(readText(currentOrder, ['totalAmount'], '—')),
      delta: `${formatPersianNumber(orderItems.length)} قلم`,
      detail: '',
      tone: 'primary' as const,
    },
    {
      label: 'تسویه',
      value: getSettlementStatusLabel(settlementStatus),
      delta: formatJalaliDate(readText(currentOrder, ['settlementEligibleAt'], '')),
      detail: '',
      tone: getToneByStatus(settlementStatus),
    },
    {
      label: 'بررسی پرداخت',
      value: getReviewStatusLabel(reviewStatus),
      delta: paymentId && paymentId !== '—' ? `پرداخت #${paymentId}` : 'بدون رکورد پرداخت',
      detail: '',
      tone: getToneByStatus(reviewStatus),
    },
  ]

  const laneCards = [
    {
      key: 'overview' as const,
      title: 'نمای کلی',
      description: '',
      detail: `${formatPersianNumber(orderItems.length)} قلم`,
    },
    {
      key: 'payment' as const,
      title: 'پرداخت',
      description: '',
      detail: getPaymentStatusLabel(paymentStatus),
    },
    {
      key: 'fulfillment' as const,
      title: 'اجرا',
      description: '',
      detail: getOrderStatusLabel(orderStatus),
    },
    {
      key: 'exceptions' as const,
      title: 'استثناها',
      description: '',
      detail: `${formatPersianNumber(operationalFlags.length)} مورد`,
    },
  ]

  async function runAction(key: string, action: () => Promise<unknown>, successMessage: string) {
    setActionBusy(key)
    setActionError(null)
    setActionMessage(null)
    try {
      await action()
      await loadWorkspace()
      setActionMessage(successMessage)
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'اجرای عملیات با خطا مواجه شد')
    } finally {
      setActionBusy(null)
    }
  }

  const canReadPayments = hasPermission(session, 'read', 'Payment') || hasPermission(session, 'manage', 'all')
  const canUpdateOrders = hasPermission(session, 'update', 'Order') || hasPermission(session, 'manage', 'all')
  const canUpdateWallets = hasPermission(session, 'update', 'StoreWallet') || hasPermission(session, 'manage', 'all')

  const canAccept = availableActions.canAccept === true && canUpdateOrders
  const canShip = availableActions.canShip === true && canUpdateOrders
  const canDeliver = availableActions.canDeliver === true && canUpdateOrders
  const canCancel = availableActions.canCancel === true && canUpdateOrders
  const canInitiatePayment = availableActions.canInitiatePayment === true && canReadPayments
  const canManualRefund = canReadPayments && Boolean(
    paymentId &&
      paymentId !== '—' &&
      paymentStatus === 'PAID' &&
      ['REJECTED_BY_VENDOR', 'CANCELLED', 'CANCELLED_BY_ADMIN', 'CANCELLED_BY_CUSTOMER'].includes(orderStatus),
  )
  const canReleaseSettlement =
    canUpdateWallets && settlementStatus === 'ON_HOLD' && readText(currentOrder, ['earningsReleasedAt'], '') === ''

  const recommendedActionLabel = getRecommendedActionLabel({
    canAccept,
    canShip,
    canDeliver,
    canCancel,
    canInitiatePayment,
    canManualRefund,
    canReleaseSettlement,
    paymentExceptionsCount: paymentExceptions.length,
    operationalFlagsCount: operationalFlags.length,
  })

  const summaryItems = [
    { label: 'شناسه سفارش', value: readText(currentOrder, ['id'], '—') },
    { label: 'مشتری', value: getCustomerLabel(currentOrder) },
    { label: 'کد ملی', value: getNationalIdLabel(currentOrder) },
    { label: 'فروشگاه', value: getStoreLabel(currentOrder) },
    { label: 'وضعیت سفارش', value: getOrderStatusLabel(orderStatus) },
    { label: 'وضعیت پرداخت', value: getPaymentStatusLabel(paymentStatus) },
    { label: 'روش پرداخت', value: getPaymentMethodLabel(readText(currentOrder, ['paymentMethod'], '')) },
    { label: 'وضعیت تسویه', value: getSettlementStatusLabel(settlementStatus) },
    { label: 'آدرس تحویل', value: getAddressLabel(currentOrder), wide: true },
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
          eyebrow="جریان سفارش"
          title={`میزکار سفارش #${readText(currentOrder, ['id'], '—')}`}
          actions={
            <div className="orders-workspace-header-actions">
              <Pill tone={getToneByStatus(orderStatus)}>{getOrderStatusLabel(orderStatus)}</Pill>
              <button className="orders-secondary-button" onClick={onBack} type="button">
                بازگشت به کارتابل سفارش‌ها
              </button>
            </div>
          }
        >
          <div className="orders-workspace-shell">
            <div className="orders-workspace-lanes">
              {laneCards.map((lane) => (
                <button
                  className={`orders-lane-card${activeLane === lane.key ? ' is-active' : ''}`}
                  key={lane.key}
                  onClick={() => setActiveLane(lane.key)}
                  type="button"
                >
                  <strong>{lane.title}</strong>
                  {lane.description ? <span>{lane.description}</span> : null}
                  <small>{lane.detail}</small>
                </button>
              ))}
            </div>

            <div className="orders-workspace-body">
              <div className="orders-workspace-main">
                <SectionCard
                  eyebrow="خلاصه سفارش"
                  title="تصویر عملیاتی سریع"
                  actions={<Pill tone="primary">{getStoreLabel(currentOrder)}</Pill>}
                >
                  <div className="orders-summary-grid">
                    {summaryItems.map((item) => (
                      <article
                        className={`orders-detail-item${item.wide ? ' orders-detail-item--wide' : ''}`}
                        key={item.label}
                      >
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </article>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard
                  eyebrow="پیشنهاد اقدام"
                  title="الان مهم ترین کار روی این سفارش چیست؟"
                  actions={<Pill tone={operationalFlags.length || paymentExceptions.length ? 'warning' : 'primary'}>{operationalFlags.length || paymentExceptions.length ? 'نیازمند توجه' : 'عادی'}</Pill>}
                >
                  <div className="orders-decision-strip">
                    <strong>{recommendedActionLabel}</strong>
                  </div>
                </SectionCard>

                {activeLane === 'overview' ? (
                  <>
                    <SectionCard
                      eyebrow="اقلام سفارش"
                      title="جزئیات محصول و مبلغ"
                      actions={<Pill tone="warning">{`${formatPersianNumber(orderItems.length)} قلم`}</Pill>}
                    >
                      <div className="orders-items-grid">
                        {currentItems.length ? (
                          currentItems.map((item, index) => {
                            const product = toObject(item.product)
                            return (
                              <article className="orders-item-card" key={readText(item, ['id'], String(index + 1))}>
                                <strong>{readText(product, ['title', 'name'], 'محصول ثبت نشده')}</strong>
                                <span>{`تعداد: ${formatPersianNumber(readText(item, ['quantity'], '—'))}`}</span>
                                <small>{`قیمت واحد: ${formatPersianNumber(readText(item, ['unitPrice', 'price'], '—'))}`}</small>
                              </article>
                            )
                          })
                        ) : (
                          <div className="fm-message">اقلامی ثبت نشده.</div>
                        )}
                      </div>

                      {itemsPageCount > 1 ? (
                        <div className="orders-pagination">
                          <button
                            className="orders-pagination-button"
                            disabled={itemsPage === 1}
                            onClick={() => setItemsPage((current) => Math.max(1, current - 1))}
                            type="button"
                          >
                            صفحه قبل
                          </button>
                          <span>{`صفحه ${itemsPage} از ${itemsPageCount}`}</span>
                          <button
                            className="orders-pagination-button"
                            disabled={itemsPage === itemsPageCount}
                            onClick={() => setItemsPage((current) => Math.min(itemsPageCount, current + 1))}
                            type="button"
                          >
                            صفحه بعد
                          </button>
                        </div>
                      ) : null}
                    </SectionCard>

                    <SectionCard
                      eyebrow="ردیف رخدادها"
                      title="رخدادهای سفارش و پرداخت"
                      actions={<Pill tone="success">{`${formatPersianNumber(combinedFeed.length)} رخداد`}</Pill>}
                    >
                      <ActivityFeed items={currentFeed} />

                      {feedPageCount > 1 ? (
                        <div className="orders-pagination">
                          <button
                            className="orders-pagination-button"
                            disabled={feedPage === 1}
                            onClick={() => setFeedPage((current) => Math.max(1, current - 1))}
                            type="button"
                          >
                            صفحه قبل
                          </button>
                          <span>{`صفحه ${feedPage} از ${feedPageCount}`}</span>
                          <button
                            className="orders-pagination-button"
                            disabled={feedPage === feedPageCount}
                            onClick={() => setFeedPage((current) => Math.min(feedPageCount, current + 1))}
                            type="button"
                          >
                            صفحه بعد
                          </button>
                        </div>
                      ) : null}
                    </SectionCard>
                  </>
                ) : null}

                {activeLane === 'payment' ? (
                  <>
                    <SectionCard
                      eyebrow="نمای مالی"
                      title="وضعیت پرداخت و تسویه"
                      actions={<Pill tone={getToneByStatus(paymentStatus)}>{getPaymentStatusLabel(paymentStatus)}</Pill>}
                    >
                      <div className="orders-payment-grid">
                        <article className="orders-payment-card">
                          <span>شناسه پرداخت</span>
                          <strong>{paymentId && paymentId !== '—' ? paymentId : 'هنوز پرداختی ثبت نشده'}</strong>
                          <small>{`درگاه: ${readText(paymentDetail ?? payment, ['gatewayKey', 'gateway'], '—')}`}</small>
                        </article>
                        <article className="orders-payment-card">
                          <span>وضعیت بررسی</span>
                          <strong>{getReviewStatusLabel(reviewStatus)}</strong>
                          <small>{readText(paymentDetail ?? payment, ['reviewReason'], 'بدون علت ثبت شده')}</small>
                        </article>
                        <article className="orders-payment-card">
                          <span>مهلت پرداخت</span>
                          <strong>{formatJalaliDate(readText(paymentDetail ?? payment, ['expiresAt'], ''), true)}</strong>
                          <small>{`تسویه: ${getSettlementStatusLabel(settlementStatus)}`}</small>
                        </article>
                        <article className="orders-payment-card">
                          <span>آزادسازی تسویه</span>
                          <strong>{formatJalaliDate(readText(currentOrder, ['settlementEligibleAt'], ''), true)}</strong>
                          <small>{readText(currentOrder, ['earningsReleasedAt'], 'هنوز آزادسازی انجام نشده')}</small>
                        </article>
                      </div>
                    </SectionCard>

                    <div className="orders-actions-grid">
                      <SectionCard
                        eyebrow="شروع مجدد پرداخت"
                        title="ایجاد پرداخت جدید"
                        actions={<Pill tone={canInitiatePayment ? 'success' : 'warning'}>{canInitiatePayment ? 'مجاز' : 'غیرفعال'}</Pill>}
                      >
                        <form
                          className="orders-action-form"
                          onSubmit={(event) => {
                            event.preventDefault()
                            const numericOrderId = toPositiveNumber(orderId)
                            if (!numericOrderId) {
                              setActionError('شناسه سفارش برای ایجاد پرداخت معتبر نیست.')
                              return
                            }

                            void runAction(
                              'initiate-payment',
                              () =>
                                adminApi.initiatePayment(session, {
                                  orderId: numericOrderId,
                                  gatewayConfigId: toPositiveNumber(paymentInitForm.gatewayConfigId),
                                  gatewayKey: paymentInitForm.gatewayKey.trim() || undefined,
                                }),
                              'پرداخت جدید برای این سفارش با موفقیت ایجاد شد.',
                            )
                          }}
                        >
                          <div className="fm-field">
                            <label htmlFor="orders-payment-gateway-key">کلید درگاه</label>
                            <input
                              id="orders-payment-gateway-key"
                              onChange={(event) => setPaymentInitForm((current) => ({ ...current, gatewayKey: event.target.value }))}
                              placeholder="مثلا درگاه اصلی"
                              value={paymentInitForm.gatewayKey}
                            />
                          </div>
                          <div className="fm-field">
                            <label htmlFor="orders-payment-gateway-config">شناسه پیکربندی درگاه</label>
                            <input
                              id="orders-payment-gateway-config"
                              inputMode="numeric"
                              onChange={(event) =>
                                setPaymentInitForm((current) => ({ ...current, gatewayConfigId: event.target.value }))
                              }
                              placeholder="در صورت نیاز"
                              value={paymentInitForm.gatewayConfigId}
                            />
                          </div>
                          <button className="orders-primary-button" disabled={!canInitiatePayment || actionBusy === 'initiate-payment'} type="submit">
                            {actionBusy === 'initiate-payment' ? 'در حال ایجاد پرداخت...' : 'ایجاد پرداخت جدید'}
                          </button>
                        </form>
                      </SectionCard>

                      <SectionCard
                        eyebrow="بررسی دستی"
                        title="ثبت وضعیت بررسی پرداخت"
                        actions={<Pill tone="warning">{getReviewStatusLabel(reviewStatus)}</Pill>}
                      >
                        <form
                          className="orders-action-form"
                          onSubmit={(event) => {
                            event.preventDefault()
                            if (!paymentId || paymentId === '—') {
                              setActionError('برای این سفارش رکورد پرداخت قابل بررسی وجود ندارد.')
                              return
                            }

                            void runAction(
                              'review-payment',
                              () =>
                                adminApi.updatePaymentReview(session, paymentId, {
                                  reviewStatus: reviewForm.reviewStatus,
                                  reviewReason: reviewForm.reviewReason.trim() || undefined,
                                  reviewNote: reviewForm.reviewNote.trim() || undefined,
                                }),
                              'وضعیت بررسی پرداخت با موفقیت ثبت شد.',
                            )
                          }}
                        >
                          <div className="fm-field">
                            <label htmlFor="orders-payment-review-status">وضعیت بررسی</label>
                            <select
                              id="orders-payment-review-status"
                              onChange={(event) => setReviewForm((current) => ({ ...current, reviewStatus: event.target.value }))}
                              value={reviewForm.reviewStatus}
                            >
                              <option value="NEEDS_REVIEW">نیازمند بررسی</option>
                              <option value="UNDER_REVIEW">در حال بررسی</option>
                              <option value="APPROVED">تایید شده</option>
                              <option value="REJECTED">رد شده</option>
                              <option value="RESOLVED">حل شده</option>
                            </select>
                          </div>
                          <div className="fm-field">
                            <label htmlFor="orders-payment-review-reason">علت بررسی</label>
                            <input
                              id="orders-payment-review-reason"
                              onChange={(event) => setReviewForm((current) => ({ ...current, reviewReason: event.target.value }))}
                              placeholder="مثلا پاسخ درگاه با وضعیت سفارش یکی نیست"
                              value={reviewForm.reviewReason}
                            />
                          </div>
                          <div className="fm-field">
                            <label htmlFor="orders-payment-review-note">یادداشت داخلی مالی</label>
                            <textarea
                              id="orders-payment-review-note"
                              onChange={(event) => setReviewForm((current) => ({ ...current, reviewNote: event.target.value }))}
                              placeholder="خلاصه وضعیت برای همکار بعدی"
                              rows={4}
                              value={reviewForm.reviewNote}
                            />
                          </div>
                          <button className="orders-primary-button" disabled={!paymentId || paymentId === '—' || actionBusy === 'review-payment'} type="submit">
                            {actionBusy === 'review-payment' ? 'در حال ثبت بررسی...' : 'ثبت بررسی پرداخت'}
                          </button>
                        </form>
                      </SectionCard>

                      <SectionCard
                        eyebrow="بازگشت وجه دستی"
                        title="بازگشت وجه دستی"
                        actions={<Pill tone={canManualRefund ? 'danger' : 'warning'}>{canManualRefund ? 'قابل اجرا' : 'غیرفعال'}</Pill>}
                      >
                        <form
                          className="orders-action-form"
                          onSubmit={(event) => {
                            event.preventDefault()
                            if (!paymentId || paymentId === '—') {
                              setActionError('برای ثبت بازگشت وجه دستی باید رکورد پرداخت معتبر وجود داشته باشد.')
                              return
                            }

                            if (!refundForm.reason.trim()) {
                              setActionError('علت بازگشت وجه دستی الزامی است.')
                              return
                            }

                            void runAction(
                              'manual-refund',
                              () =>
                                adminApi.manualRefundPayment(session, paymentId, {
                                  reason: refundForm.reason.trim(),
                                  note: refundForm.note.trim() || undefined,
                                }),
                              'بازگشت وجه دستی این پرداخت با موفقیت ثبت شد.',
                            )
                          }}
                        >
                          <div className="fm-field">
                            <label htmlFor="orders-refund-reason">علت بازگشت وجه</label>
                            <input
                              id="orders-refund-reason"
                              onChange={(event) => setRefundForm((current) => ({ ...current, reason: event.target.value }))}
                              placeholder="مثلا لغو سفارش بعد از تایید مالی"
                              value={refundForm.reason}
                            />
                          </div>
                          <div className="fm-field">
                            <label htmlFor="orders-refund-note">یادداشت بازگشت وجه</label>
                            <textarea
                              id="orders-refund-note"
                              onChange={(event) => setRefundForm((current) => ({ ...current, note: event.target.value }))}
                              placeholder="شرح تکمیلی یا رسید آفلاین"
                              rows={4}
                              value={refundForm.note}
                            />
                          </div>
                          <button className="orders-danger-button" disabled={!canManualRefund || actionBusy === 'manual-refund'} type="submit">
                            {actionBusy === 'manual-refund' ? 'در حال ثبت بازگشت وجه...' : 'ثبت بازگشت وجه دستی'}
                          </button>
                        </form>
                      </SectionCard>

                      <SectionCard
                        eyebrow="آزادسازی تسویه"
                        title="آزادسازی دستی تسویه"
                        actions={<Pill tone={canReleaseSettlement ? 'success' : 'warning'}>{canReleaseSettlement ? 'آماده آزادسازی' : 'غیرفعال'}</Pill>}
                      >
                        <div className="orders-action-stack">
                          <button
                            className="orders-primary-button"
                            disabled={!canReleaseSettlement || actionBusy === 'release-settlement'}
                            onClick={() =>
                              void runAction(
                                'release-settlement',
                                () => adminApi.releaseOrderSettlement(session, orderId),
                                'تسویه این سفارش با موفقیت آزاد شد.',
                              )
                            }
                            type="button"
                          >
                            {actionBusy === 'release-settlement' ? 'در حال آزادسازی تسویه...' : 'آزادسازی تسویه'}
                          </button>
                        </div>
                      </SectionCard>
                    </div>
                  </>
                ) : null}

                {activeLane === 'fulfillment' ? (
                  <div className="orders-actions-grid">
                    <SectionCard
                      eyebrow="پیشبرد سفارش"
                      title="پذیرش، ارسال و تحویل"
                      actions={<Pill tone="primary">{getOrderStatusLabel(orderStatus)}</Pill>}
                    >
                      <form className="orders-action-form">
                        <div className="fm-field">
                          <label htmlFor="orders-progress-note">یادداشت عملیاتی مشترک</label>
                          <textarea
                            id="orders-progress-note"
                            onChange={(event) => setProgressNote(event.target.value)}
                            placeholder="مثلا با فروشگاه هماهنگ شد و سفارش به پیک تحویل می‌شود"
                            rows={5}
                            value={progressNote}
                          />
                        </div>

                        <div className="orders-inline-actions">
                          <button
                            className="orders-primary-button"
                            disabled={!canAccept || actionBusy === 'accept-order'}
                            onClick={() =>
                              void runAction(
                                'accept-order',
                                () => adminApi.acceptOrder(session, orderId, { note: progressNote.trim() || undefined }),
                                'سفارش با موفقیت تایید شد.',
                              )
                            }
                            type="button"
                          >
                            {actionBusy === 'accept-order' ? 'در حال تایید...' : 'تایید سفارش'}
                          </button>
                          <button
                            className="orders-primary-button"
                            disabled={!canShip || actionBusy === 'ship-order'}
                            onClick={() =>
                              void runAction(
                                'ship-order',
                                () => adminApi.shipOrder(session, orderId, { note: progressNote.trim() || undefined }),
                                'وضعیت سفارش با موفقیت به ارسال شده تغییر کرد.',
                              )
                            }
                            type="button"
                          >
                            {actionBusy === 'ship-order' ? 'در حال ثبت ارسال...' : 'ثبت ارسال سفارش'}
                          </button>
                          <button
                            className="orders-primary-button"
                            disabled={!canDeliver || actionBusy === 'deliver-order'}
                            onClick={() =>
                              void runAction(
                                'deliver-order',
                                () => adminApi.deliverOrder(session, orderId, { note: progressNote.trim() || undefined }),
                                'تحویل سفارش با موفقیت ثبت شد.',
                              )
                            }
                            type="button"
                          >
                            {actionBusy === 'deliver-order' ? 'در حال ثبت تحویل...' : 'ثبت تحویل سفارش'}
                          </button>
                        </div>
                      </form>
                    </SectionCard>

                    <SectionCard
                      eyebrow="لغو عمومی"
                      title="لغو سفارش از سطح ادمین"
                      actions={<Pill tone={canCancel ? 'warning' : 'danger'}>{canCancel ? 'مجاز' : 'غیرفعال'}</Pill>}
                    >
                      <form
                        className="orders-action-form"
                        onSubmit={(event) => {
                          event.preventDefault()
                          void runAction(
                            'cancel-order',
                            () =>
                              adminApi.cancelOrder(session, orderId, {
                                reason: cancelForm.reason.trim() || undefined,
                                note: cancelForm.note.trim() || undefined,
                              }),
                            'لغو سفارش با موفقیت ثبت شد.',
                          )
                        }}
                      >
                        <div className="fm-field">
                          <label htmlFor="orders-cancel-reason">دلیل لغو</label>
                          <input
                            id="orders-cancel-reason"
                            onChange={(event) => setCancelForm((current) => ({ ...current, reason: event.target.value }))}
                            placeholder="مثلا درخواست مشتری یا خطای عملیاتی"
                            value={cancelForm.reason}
                          />
                        </div>
                        <div className="fm-field">
                          <label htmlFor="orders-cancel-note">یادداشت لغو</label>
                          <textarea
                            id="orders-cancel-note"
                            onChange={(event) => setCancelForm((current) => ({ ...current, note: event.target.value }))}
                            placeholder="یادداشت داخلی"
                            rows={4}
                            value={cancelForm.note}
                          />
                        </div>
                        <button className="orders-danger-button" disabled={!canCancel || actionBusy === 'cancel-order'} type="submit">
                          {actionBusy === 'cancel-order' ? 'در حال لغو سفارش...' : 'لغو سفارش'}
                        </button>
                      </form>
                    </SectionCard>

                    <SectionCard
                      eyebrow="لغو از سمت فروشنده"
                      title="ثبت لغو از سمت فروشنده"
                      actions={<Pill tone={canCancel ? 'danger' : 'warning'}>{canCancel ? 'قابل ثبت' : 'غیرفعال'}</Pill>}
                    >
                      <form
                        className="orders-action-form"
                        onSubmit={(event) => {
                          event.preventDefault()
                          if (!vendorCancelForm.reason.trim()) {
                            setActionError('برای لغو از سمت فروشنده، دلیل لغو الزامی است.')
                            return
                          }

                          void runAction(
                            'vendor-cancel-order',
                            () =>
                              adminApi.vendorCancelOrder(session, orderId, {
                                reason: vendorCancelForm.reason.trim(),
                                note: vendorCancelForm.note.trim() || undefined,
                              }),
                            'لغو از سمت فروشنده برای این سفارش با موفقیت ثبت شد.',
                          )
                        }}
                      >
                        <div className="fm-field">
                          <label htmlFor="orders-vendor-cancel-reason">دلیل لغو فروشنده</label>
                          <input
                            id="orders-vendor-cancel-reason"
                            onChange={(event) =>
                              setVendorCancelForm((current) => ({ ...current, reason: event.target.value }))
                            }
                            placeholder="مثلا عدم موجودی یا مشکل آماده سازی"
                            value={vendorCancelForm.reason}
                          />
                        </div>
                        <div className="fm-field">
                          <label htmlFor="orders-vendor-cancel-note">یادداشت تکمیلی</label>
                          <textarea
                            id="orders-vendor-cancel-note"
                            onChange={(event) =>
                              setVendorCancelForm((current) => ({ ...current, note: event.target.value }))
                            }
                            placeholder="نتیجه تماس با مشتری یا فروشگاه"
                            rows={4}
                            value={vendorCancelForm.note}
                          />
                        </div>
                        <button
                          className="orders-danger-button"
                          disabled={!canCancel || actionBusy === 'vendor-cancel-order'}
                          type="submit"
                        >
                          {actionBusy === 'vendor-cancel-order' ? 'در حال ثبت لغو فروشنده...' : 'ثبت لغو از سمت فروشنده'}
                        </button>
                      </form>
                    </SectionCard>
                  </div>
                ) : null}

                {activeLane === 'exceptions' ? (
                  <>
                    <SectionCard
                      eyebrow="نشانه های مهم"
                      title="نقاط نیازمند توجه"
                      actions={<Pill tone="danger">{`${formatPersianNumber(operationalFlags.length)} مورد فعال`}</Pill>}
                    >
                      <div className="orders-flags-grid">
                        {currentFlags.length ? (
                          currentFlags.map((flag) => (
                            <article className="orders-flag-card" key={flag}>
                              <strong>{getExceptionLabel(flag)}</strong>
                              <small>{flag}</small>
                            </article>
                          ))
                        ) : (
                          <div className="fm-message">برای این سفارش در حال حاضر نشانه مهم فعالی دیده نمی‌شود.</div>
                        )}
                      </div>

                      {flagsPageCount > 1 ? (
                        <div className="orders-pagination">
                          <button
                            className="orders-pagination-button"
                            disabled={flagsPage === 1}
                            onClick={() => setFlagsPage((current) => Math.max(1, current - 1))}
                            type="button"
                          >
                            صفحه قبل
                          </button>
                          <span>{`صفحه ${flagsPage} از ${flagsPageCount}`}</span>
                          <button
                            className="orders-pagination-button"
                            disabled={flagsPage === flagsPageCount}
                            onClick={() => setFlagsPage((current) => Math.min(flagsPageCount, current + 1))}
                            type="button"
                          >
                            صفحه بعد
                          </button>
                        </div>
                      ) : null}
                    </SectionCard>

                    <SectionCard
                      eyebrow="صف پرداخت"
                      title="استثناهای پرداخت مرتبط"
                      actions={<Pill tone="warning">{`${formatPersianNumber(paymentExceptions.length)} مورد`}</Pill>}
                    >
                      <div className="orders-exceptions-list">
                        {currentPaymentExceptions.length ? (
                          currentPaymentExceptions.map((item, index) => (
                            <article className="orders-exception-item" key={readText(item, ['id'], String(index + 1))}>
                              <strong>{`پرداخت #${readText(item, ['id'], '—')} - ${getPaymentStatusLabel(readText(item, ['status'], 'UNKNOWN'))}`}</strong>
                              <span>{`بررسی: ${getReviewStatusLabel(readText(item, ['reviewStatus'], '—'))}`}</span>
                              <small>{readText(item, ['reviewReason', 'reviewNote'], 'بدون یادداشت')}</small>
                            </article>
                          ))
                        ) : (
                          <div className="fm-message">بدون مورد.</div>
                        )}
                      </div>

                      {paymentExceptionsPageCount > 1 ? (
                        <div className="orders-pagination">
                          <button
                            className="orders-pagination-button"
                            disabled={paymentExceptionsPage === 1}
                            onClick={() => setPaymentExceptionsPage((current) => Math.max(1, current - 1))}
                            type="button"
                          >
                            صفحه قبل
                          </button>
                          <span>{`صفحه ${paymentExceptionsPage} از ${paymentExceptionsPageCount}`}</span>
                          <button
                            className="orders-pagination-button"
                            disabled={paymentExceptionsPage === paymentExceptionsPageCount}
                            onClick={() =>
                              setPaymentExceptionsPage((current) => Math.min(paymentExceptionsPageCount, current + 1))
                            }
                            type="button"
                          >
                            صفحه بعد
                          </button>
                        </div>
                      ) : null}
                    </SectionCard>
                  </>
                ) : null}

              </div>

              <div className="orders-workspace-side">
                <SectionCard
                  eyebrow="مرکز اقدام"
                  title="خلاصه مجوزهای عملیاتی"
                  actions={<Pill tone="primary">داده زنده</Pill>}
                >
                  <div className="orders-capability-list">
                    <article className="orders-capability-item">
                      <span>تایید سفارش</span>
                      <strong>{canAccept ? 'مجاز' : 'غیرفعال'}</strong>
                    </article>
                    <article className="orders-capability-item">
                      <span>ثبت ارسال</span>
                      <strong>{canShip ? 'مجاز' : 'غیرفعال'}</strong>
                    </article>
                    <article className="orders-capability-item">
                      <span>ثبت تحویل</span>
                      <strong>{canDeliver ? 'مجاز' : 'غیرفعال'}</strong>
                    </article>
                    <article className="orders-capability-item">
                      <span>لغو سفارش</span>
                      <strong>{canCancel ? 'مجاز' : 'غیرفعال'}</strong>
                    </article>
                    <article className="orders-capability-item">
                      <span>ایجاد پرداخت</span>
                      <strong>{canInitiatePayment ? 'مجاز' : 'غیرفعال'}</strong>
                    </article>
                    <article className="orders-capability-item">
                      <span>بازگشت وجه دستی</span>
                      <strong>{canManualRefund ? 'مجاز' : 'غیرفعال'}</strong>
                    </article>
                    <article className="orders-capability-item">
                      <span>آزادسازی تسویه</span>
                      <strong>{canReleaseSettlement ? 'مجاز' : 'غیرفعال'}</strong>
                    </article>
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>
        </SectionCard>
      </LoadableState>
    </div>
  )
}

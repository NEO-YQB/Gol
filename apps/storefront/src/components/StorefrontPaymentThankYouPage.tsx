'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { getOrderDetail, readStoredToken, type StorefrontOrderDetail } from '../lib/storefrontAuth'
import { formatPurchasePayload, hasPurchaseBeenSent, markPurchaseAsSent, pushToDataLayer } from '../lib/analytics'
import { translateOrderStatus, translatePaymentMethod, translatePaymentStatus } from '../lib/storefrontOrderLabels'
import { storefrontShared } from './storefrontShared'

export function StorefrontPaymentThankYouPage() {
  const searchParams = useSearchParams()
  const status = (searchParams?.get('status') || '').toUpperCase()
  const authority = searchParams?.get('authority') || ''
  const orderId = searchParams?.get('orderId') || ''
  const refId = searchParams?.get('refId') || ''
  const message = searchParams?.get('message') || ''

  const isSuccess = status === 'PAID' || status === 'OK' || status === 'SUCCESS'
  const [order, setOrder] = useState<StorefrontOrderDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [requestError, setRequestError] = useState('')

  useEffect(() => {
    const token = readStoredToken()
    if (!token || !orderId) return

    let cancelled = false
    setLoading(true)
    setRequestError('')

    getOrderDetail(token, orderId)
      .then((payload) => {
        if (!cancelled) {
          setOrder(payload)
          if (!hasPurchaseBeenSent(String(payload.id))) {
            pushToDataLayer({
              event: 'purchase',
              ecommerce: formatPurchasePayload(payload),
            })
            markPurchaseAsSent(String(payload.id))
          }
        }
      })
      .catch((error: Error) => {
        if (!cancelled) setRequestError(error.message || 'دریافت اطلاعات سفارش ممکن نشد')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [orderId])

  const formatter = useMemo(() => new Intl.NumberFormat('fa-IR'), [])
  const createdAtLabel = order?.createdAt
    ? new Intl.DateTimeFormat('fa-IR', {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(new Date(order.createdAt))
    : ''

  const amountLabel = (value?: number | string | null) => {
    const numeric = Number(value ?? 0)
    if (!Number.isFinite(numeric) || numeric <= 0) return '—'
    return `${formatter.format(numeric)} تومان`
  }

  const customerName = order?.customerName?.trim() || 'عزیز'
  const sellerName = order?.storeName || order?.orderItems?.[0]?.storeName || 'فروشگاه انتخاب‌شده'
  const deliveryWindow = order?.deliveryWindowLabel || 'به‌محض آماده‌سازی فروشگاه'
  const deliveryEstimate =
    order?.estimatedDeliveryMinHours && order?.estimatedDeliveryMaxHours
      ? `${formatter.format(order.estimatedDeliveryMinHours)} تا ${formatter.format(order.estimatedDeliveryMaxHours)} ساعت`
      : order?.estimatedDeliveryMinHours
        ? `حدود ${formatter.format(order.estimatedDeliveryMinHours)} ساعت`
        : 'طبق بازه انتخابی شما'

  const summaryCards = [
    { label: 'شماره سفارش', value: order?.id || orderId || '—' },
    { label: 'فروشگاه', value: sellerName },
    { label: 'مبلغ نهایی', value: amountLabel(order?.totalAmount) },
    { label: 'بازه تحویل', value: deliveryWindow },
  ]

  return (
    <section className={storefrontShared.emptyState}>
      <div
        className={`mx-auto w-full max-w-[1080px] overflow-hidden rounded-[38px] border border-white/55 px-6 py-7 shadow-[0_24px_70px_rgba(44,32,19,0.12)] backdrop-blur-[22px] md:px-8 md:py-8 ${
          isSuccess
            ? 'bg-[linear-gradient(180deg,rgba(246,252,248,0.82),rgba(255,255,255,0.72))]'
            : 'bg-[linear-gradient(180deg,rgba(255,246,243,0.84),rgba(255,255,255,0.72))]'
        }`}
      >
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <div className="rounded-[30px] border border-white/60 bg-white/55 px-5 py-6 shadow-[0_16px_40px_rgba(34,48,42,0.08)] backdrop-blur-[18px]">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                    isSuccess ? 'bg-[#e7f5ee] text-[#1f6a52]' : 'bg-[#fff1ee] text-[#b64b36]'
                  }`}
                >
                  {isSuccess ? 'پرداخت موفق' : 'پرداخت ناموفق'}
                </span>
                {createdAtLabel ? <span className="text-xs text-[#7c7166]">{createdAtLabel}</span> : null}
              </div>
              <h1 className={`mt-4 text-3xl font-black leading-[1.8] ${isSuccess ? 'text-[#173126]' : 'text-[#8f4532]'}`}>
                {isSuccess ? `${customerName} عزیز، از سفارش شما متشکریم` : 'سفارش شما نهایی نشد'}
              </h1>
              <p className="mt-3 text-sm leading-8 text-[#6e6152]">
                {message ||
                  (isSuccess
                    ? 'سفارش شما با موفقیت ثبت شد. جزئیات آن در ادامه آمده تا با خیال راحت وضعیت خرید، فروشگاه و زمان تحویل را مرور کنید.'
                    : 'پرداخت کامل نشده است. اگر مبلغی از حساب شما کسر شده، نتیجه نهایی را از حساب کاربری یا پشتیبانی پیگیری کنید.')}
              </p>
              {order?.shippingAddressText ? (
                <div className="mt-5 rounded-[24px] border border-white/60 bg-white/60 px-4 py-4 text-sm text-[#5f564c]">
                  <span className="block text-xs font-bold text-[#8a755c]">آدرس تحویل</span>
                  <strong className="mt-1 block text-base text-[#173126]">
                    {order.shippingAddressTitle || 'آدرس انتخابی'}
                  </strong>
                  <p className="mt-2 leading-7">
                    {[order.shippingCity, order.shippingAddressText].filter(Boolean).join(' - ')}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-[24px] border border-white/60 bg-white/58 px-4 py-4 shadow-[0_12px_30px_rgba(34,48,42,0.07)] backdrop-blur-[16px]"
                >
                  <span className="block text-xs font-bold text-[#92785a]">{card.label}</span>
                  <strong className="mt-2 block text-sm leading-7 text-[#173126]">{card.value}</strong>
                </div>
              ))}
            </div>

            <div className="rounded-[30px] border border-white/60 bg-white/58 px-5 py-5 shadow-[0_16px_40px_rgba(34,48,42,0.07)] backdrop-blur-[16px]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-[#173126]">اقلام سفارش</h2>
                  <p className="mt-1 text-sm text-[#73695e]">محصولات انتخابی شما از {sellerName}</p>
                </div>
                {loading ? <span className="text-xs text-[#8b7f72]">در حال دریافت...</span> : null}
              </div>

              <div className="mt-4 space-y-3">
                {order?.orderItems?.length ? (
                  order.orderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/65 bg-white/70 px-4 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <strong className="block text-sm font-black text-[#173126]">
                          {item.productName || 'محصول سفارش'}
                        </strong>
                        <p className="mt-1 text-xs text-[#7a7065]">
                          {formatter.format(item.quantity)} عدد · {amountLabel(item.price)} برای هر عدد
                        </p>
                      </div>
                      <div className="text-sm font-bold text-[#1f6a52]">
                        {amountLabel(Number(item.price) * Number(item.quantity))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/65 bg-white/50 px-4 py-5 text-sm text-[#7a7065]">
                    {requestError || 'جزئیات اقلام سفارش هنوز در دسترس نیست.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[30px] border border-white/60 bg-white/58 px-5 py-5 shadow-[0_16px_40px_rgba(34,48,42,0.07)] backdrop-blur-[18px]">
              <h2 className="text-lg font-black text-[#173126]">خلاصه پرداخت و تحویل</h2>
              <div className="mt-4 space-y-3 text-sm text-[#5f564c]">
                <div className="flex items-center justify-between gap-4">
                  <span>وضعیت سفارش</span>
                  <strong className="text-[#173126]">{translateOrderStatus(order?.status || (isSuccess ? 'PAID' : 'FAILED'))}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>وضعیت پرداخت</span>
                  <strong className="text-[#173126]">{translatePaymentStatus(order?.paymentStatus || status || '—')}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>روش پرداخت</span>
                  <strong className="text-[#173126]">{translatePaymentMethod(order?.paymentMethod || 'ONLINE')}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>هزینه ارسال</span>
                  <strong className="text-[#173126]">{amountLabel(order?.deliveryFee)}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>تخفیف</span>
                  <strong className="text-[#173126]">{amountLabel(order?.discountAmount)}</strong>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-[#eee4d6] pt-3">
                  <span className="font-bold text-[#173126]">جمع کل</span>
                  <strong className="text-base font-black text-[#173126]">{amountLabel(order?.totalAmount)}</strong>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/60 bg-white/58 px-5 py-5 shadow-[0_16px_40px_rgba(34,48,42,0.07)] backdrop-blur-[18px]">
              <h2 className="text-lg font-black text-[#173126]">اطلاعات مفید سفارش</h2>
              <div className="mt-4 space-y-3 text-sm leading-8 text-[#5f564c]">
                <p><strong className="text-[#173126]">زمان تحویل:</strong> {deliveryWindow}</p>
                <p><strong className="text-[#173126]">برآورد آماده‌سازی:</strong> {deliveryEstimate}</p>
                {order?.couponCode ? (
                  <p><strong className="text-[#173126]">کد تخفیف:</strong> {order.couponCode}</p>
                ) : null}
                {authority ? (
                  <p className="break-all"><strong className="text-[#173126]">Authority:</strong> {authority}</p>
                ) : null}
                {refId ? (
                  <p><strong className="text-[#173126]">Ref ID:</strong> {refId}</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/60 bg-[linear-gradient(180deg,rgba(244,250,247,0.76),rgba(255,255,255,0.66))] px-5 py-5 shadow-[0_16px_40px_rgba(34,48,42,0.08)] backdrop-blur-[18px]">
              <h2 className="text-lg font-black text-[#173126]">گام بعدی</h2>
              <p className="mt-3 text-sm leading-8 text-[#5f564c]">
                وضعیت سفارش از داخل حساب کاربری قابل پیگیری است و در صورت نیاز می‌توانید سفارش‌های قبلی، آدرس‌ها و جزئیات کامل‌تر را آنجا ببینید.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="rounded-full bg-[#173126] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#29513f]" href="/account">
                  رفتن به حساب کاربری
                </Link>
                <Link className="rounded-full border border-[#1f6a52]/15 bg-white/90 px-5 py-2.5 text-sm font-bold text-[#173126]" href="/shop">
                  بازگشت به فروشگاه
                </Link>
              </div>
            </div>
          </div>
        </div>

        {!isSuccess && requestError ? (
          <div className="mt-5 rounded-[24px] bg-[#fff1ee] px-4 py-3 text-sm font-medium text-[#b64b36]">
            {requestError}
          </div>
        ) : null}
        {loading && !order ? (
          <div className="mt-5 rounded-[24px] bg-white/55 px-4 py-3 text-sm text-[#6f6458]">
            در حال آماده‌سازی جزئیات کامل سفارش...
          </div>
        ) : null}
      </div>
    </section>
  )
}

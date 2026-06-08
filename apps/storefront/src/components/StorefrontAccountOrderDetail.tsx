'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  getOrderDetail,
  readStoredToken,
  type StorefrontOrderDetail,
} from '../lib/storefrontAuth'
import {
  translateDeliveryType,
  translateOrderStatus,
  translatePaymentMethod,
  translatePaymentStatus,
} from '../lib/storefrontOrderLabels'

function formatMoney(value?: number | string | null) {
  const numeric = Number(value ?? 0)
  if (!Number.isFinite(numeric) || numeric <= 0) return '—'
  return `${new Intl.NumberFormat('fa-IR').format(numeric)} تومان`
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function StorefrontAccountOrderDetail({ orderId }: { orderId: number }) {
  const [order, setOrder] = useState<StorefrontOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!Number.isFinite(orderId) || orderId <= 0) {
      setError('شناسه سفارش معتبر نیست.')
      setLoading(false)
      return
    }

    const token = readStoredToken()
    if (!token) {
      setError('برای مشاهده جزئیات سفارش باید وارد حساب کاربری شوی.')
      setLoading(false)
      return
    }

    let cancelled = false
    getOrderDetail(token, orderId)
      .then((payload) => {
        if (!cancelled) setOrder(payload)
      })
      .catch((requestError: Error) => {
        if (!cancelled) setError(requestError.message || 'دریافت جزئیات سفارش با خطا مواجه شد')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [orderId])

  const summaryCards = useMemo(() => {
    if (!order) return []
    return [
      { label: 'وضعیت سفارش', value: translateOrderStatus(order.status) },
      { label: 'وضعیت پرداخت', value: translatePaymentStatus(order.paymentStatus) },
      { label: 'روش پرداخت', value: translatePaymentMethod(order.paymentMethod) },
      { label: 'نوع ارسال', value: translateDeliveryType(order.deliveryType) },
    ]
  }, [order])

  if (loading) {
    return <section className="rounded-[32px] bg-white/75 px-6 py-12 text-center shadow-[0_14px_34px_rgba(52,36,17,0.06)]">در حال بارگذاری سفارش...</section>
  }

  if (error || !order) {
    return (
      <section className="rounded-[32px] border border-dashed border-[#d7b690] bg-white/75 px-6 py-12 text-center shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
        <h2 className="text-2xl font-black text-[#173126]">جزئیات سفارش در دسترس نیست</h2>
        <p className="mt-4 text-sm leading-7 text-[#6e6152]">{error || 'اطلاعات این سفارش پیدا نشد.'}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link className="rounded-full bg-[#173126] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#29513f]" href="/account">
            بازگشت به پنل کاربری
          </Link>
        </div>
      </section>
    )
  }

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-[34px] border border-white/55 bg-[linear-gradient(180deg,rgba(248,252,249,0.88),rgba(255,255,255,0.76))] px-6 py-6 shadow-[0_24px_58px_rgba(52,36,17,0.08)] backdrop-blur-[18px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="rounded-full bg-[#edf8f2] px-3 py-1 text-xs font-bold text-[#1f6a52]">{translateOrderStatus(order.status)}</span>
            <h2 className="mt-4 text-3xl font-black text-[#173126]">{`فاکتور سفارش #${order.id}`}</h2>
            <p className="mt-3 text-sm leading-8 text-[#6e6152]">
              {`${order.customerName || 'مشتری گرامی'}، در این بخش می‌توانی وضعیت لحظه‌ای سفارش، اقلام، پرداخت و زمان‌بندی تحویل را کامل ببینی.`}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/60 bg-white/65 px-4 py-4 text-sm text-[#5f564c]">
            <p><strong className="text-[#173126]">فروشگاه:</strong> {order.storeName || '—'}</p>
            <p className="mt-2"><strong className="text-[#173126]">ثبت سفارش:</strong> {formatDateTime(order.createdAt)}</p>
            <p className="mt-2"><strong className="text-[#173126]">جمع کل:</strong> {formatMoney(order.totalAmount)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <div className="rounded-[26px] border border-white/55 bg-white/78 px-5 py-5 shadow-[0_14px_34px_rgba(52,36,17,0.05)]" key={item.label}>
            <span className="block text-xs font-bold text-[#92785a]">{item.label}</span>
            <strong className="mt-2 block text-base font-black text-[#173126]">{item.value}</strong>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="rounded-[32px] bg-white/80 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7e56]">Invoice Items</span>
              <h3 className="mt-2 text-2xl font-black text-[#173126]">اقلام سفارش</h3>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {order.orderItems.map((item) => (
              <article className="rounded-[26px] border border-[#1f6a52]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,242,233,0.92))] px-5 py-5" key={item.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <strong className="block text-lg font-black text-[#173126]">{item.productName || 'محصول سفارش'}</strong>
                    <p className="mt-2 text-sm text-[#6e6152]">{`${new Intl.NumberFormat('fa-IR').format(item.quantity)} عدد`}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <span className="text-xs font-bold text-[#92785a]">{`قیمت واحد: ${formatMoney(item.price)}`}</span>
                    <strong className="text-sm text-[#173126]">{formatMoney(Number(item.price) * Number(item.quantity))}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="grid gap-5">
          <section className="rounded-[32px] bg-white/80 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7e56]">Summary</span>
            <h3 className="mt-2 text-2xl font-black text-[#173126]">خلاصه مالی</h3>
            <div className="mt-5 grid gap-3 text-sm">
              <div className="rounded-[22px] bg-[#f9f4ec] px-4 py-4"><span className="block text-xs font-bold text-[#92785a]">مبلغ کالاها</span><strong className="mt-1 block text-base text-[#173126]">{formatMoney(order.subtotalAmount)}</strong></div>
              <div className="rounded-[22px] bg-[#f9f4ec] px-4 py-4"><span className="block text-xs font-bold text-[#92785a]">هزینه ارسال</span><strong className="mt-1 block text-base text-[#173126]">{formatMoney(order.deliveryFee)}</strong></div>
              <div className="rounded-[22px] bg-[#f9f4ec] px-4 py-4"><span className="block text-xs font-bold text-[#92785a]">تخفیف</span><strong className="mt-1 block text-base text-[#173126]">{formatMoney(order.discountAmount)}</strong></div>
              <div className="rounded-[22px] bg-[#edf8f2] px-4 py-4"><span className="block text-xs font-bold text-[#1f6a52]">مبلغ نهایی</span><strong className="mt-1 block text-base text-[#173126]">{formatMoney(order.totalAmount)}</strong></div>
            </div>
          </section>

          <section className="rounded-[32px] bg-white/80 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7e56]">Delivery</span>
            <h3 className="mt-2 text-2xl font-black text-[#173126]">تحویل و گیرنده</h3>
            <div className="mt-5 space-y-3 text-sm leading-8 text-[#6e6152]">
              <p><strong className="text-[#173126]">گیرنده:</strong> {order.customerName || '—'}</p>
              <p><strong className="text-[#173126]">شماره تماس:</strong> {order.customerPhoneNumber || '—'}</p>
              <p><strong className="text-[#173126]">کد ملی:</strong> {order.customerNationalId || '—'}</p>
              <p><strong className="text-[#173126]">بازه تحویل:</strong> {order.deliveryWindowLabel || '—'}</p>
              <p><strong className="text-[#173126]">آدرس:</strong> {[order.shippingCity, order.shippingAddressText].filter(Boolean).join(' — ') || '—'}</p>
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-[32px] bg-white/80 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7e56]">Timeline</span>
        <h3 className="mt-2 text-2xl font-black text-[#173126]">روند وضعیت سفارش</h3>
        <div className="mt-5 grid gap-3">
          {order.timeline?.length ? order.timeline.map((item) => (
            <div className="rounded-[24px] border border-[#1f6a52]/10 bg-[#fbf7f1] px-4 py-4" key={item.id}>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <strong className="text-base text-[#173126]">{translateOrderStatus(item.toStatus)}</strong>
                <span className="text-xs text-[#92785a]">{formatDateTime(item.createdAt)}</span>
              </div>
              {item.note ? <p className="mt-2 text-sm text-[#6e6152]">{item.note}</p> : null}
              {item.reason ? <p className="mt-2 text-xs text-[#8b7f72]">{`دلیل: ${item.reason}`}</p> : null}
            </div>
          )) : (
            <div className="rounded-[24px] border border-dashed border-[#dcc5a7] bg-[#fbf7f1] px-4 py-6 text-sm text-[#6e6152]">
              هنوز timeline مشخصی برای این سفارش ثبت نشده است.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

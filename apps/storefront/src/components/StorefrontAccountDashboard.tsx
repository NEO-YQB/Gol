'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getAccountSummary, readStoredToken, type StorefrontAccountSummary } from '../lib/storefrontAuth'

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('fa-IR').format(value)} تومان`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(value))
}

function mapOrderStatus(status: string) {
  switch (status) {
    case 'PENDING':
      return 'در انتظار بررسی'
    case 'PAID':
      return 'پرداخت شده'
    case 'ACCEPTED':
      return 'پذیرفته شده'
    case 'PROCESSING':
      return 'در حال آماده‌سازی'
    case 'SHIPPED':
      return 'ارسال شده'
    case 'DELIVERED':
      return 'تحویل داده شده'
    default:
      return status
  }
}

function mapPaymentStatus(status: string) {
  switch (status) {
    case 'PENDING':
      return 'در انتظار پرداخت'
    case 'PAID':
      return 'پرداخت موفق'
    case 'FAILED':
      return 'پرداخت ناموفق'
    case 'REFUNDED':
      return 'بازگشت وجه'
    default:
      return status
  }
}

export function StorefrontAccountDashboard() {
  const [summary, setSummary] = useState<StorefrontAccountSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = readStoredToken()
    if (!token) {
      setError('برای مشاهده این بخش باید وارد حساب کاربری شوی.')
      setLoading(false)
      return
    }

    getAccountSummary(token)
      .then((payload) => setSummary(payload))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'دریافت اطلاعات حساب با خطا مواجه شد'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <section className="rounded-[32px] bg-white/75 px-6 py-12 text-center shadow-[0_14px_34px_rgba(52,36,17,0.06)]">در حال بارگذاری داشبورد...</section>
  }

  if (error || !summary) {
    return (
      <section className="rounded-[32px] border border-dashed border-[#d7b690] bg-white/75 px-6 py-12 text-center shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
        <h2 className="text-2xl font-black text-[#173126]">فعلاً دسترسی به داشبورد کامل نیست</h2>
        <p className="mt-4 text-sm leading-7 text-[#6e6152]">{error || 'اطلاعات حساب در دسترس نیست.'}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link className="rounded-full bg-[#173126] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#29513f]" href="/">
            بازگشت به فروشگاه
          </Link>
        </div>
      </section>
    )
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[34px] bg-[linear-gradient(135deg,#173126_0%,#29513f_56%,#d06c54_100%)] px-6 py-6 text-white shadow-[0_22px_48px_rgba(31,41,30,0.18)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="mt-4 text-3xl font-black leading-tight md:text-[2.2rem]">{`سلام ${summary.profile.fullName || 'دوست گلینو'}`}</h2>
            <p className="mt-3 text-sm leading-7 text-white/82">
              از اینجا وضعیت واقعی حساب، سفارش‌های اخیر و آدرس‌های ذخیره‌شده‌ات را یک‌جا می‌بینی.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-white/85">
              {summary.stats.latestOrderStatus ? (
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">
                  {`آخرین وضعیت سفارش: ${mapOrderStatus(summary.stats.latestOrderStatus)}`}
                </span>
              ) : null}
              {summary.stats.defaultAddressTitle ? (
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">
                  {`آدرس پیش‌فرض: ${summary.stats.defaultAddressTitle}`}
                </span>
              ) : null}
            </div>
          </div>
          <div className="grid min-w-[280px] grid-cols-2 gap-3">
            {[
              { label: 'کل سفارش‌ها', value: String(summary.stats.orderCount) },
              { label: 'سفارش فعال', value: String(summary.stats.activeOrderCount) },
              { label: 'تحویل‌شده', value: String(summary.stats.deliveredOrderCount) },
              { label: 'آدرس‌ها', value: String(summary.stats.addressCount) },
            ].map((item) => (
              <div className="rounded-[22px] border border-white/10 bg-black/10 px-4 py-4" key={item.label}>
                <span className="block text-[11px] font-bold text-white/72">{item.label}</span>
                <strong className="mt-2 block text-2xl font-black">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_340px]">
        <div className="rounded-[32px] bg-white/80 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7e56]">Recent Orders</span>
              <h3 className="mt-2 text-2xl font-black text-[#173126]">آخرین سفارش‌ها</h3>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {summary.recentOrders.length ? summary.recentOrders.map((order) => (
              <article className="rounded-[26px] border border-[#1f6a52]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,242,233,0.92))] px-5 py-5" key={order.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <strong className="block text-lg font-black text-[#173126]">{`سفارش #${order.id}`}</strong>
                    <p className="mt-2 text-sm text-[#6e6152]">{order.storeName ? `فروشگاه ${order.storeName}` : 'سفارش ثبت‌شده در گلینو'}</p>
                    <p className="mt-1 text-xs text-[#92785a]">{`${formatDate(order.createdAt)} • ${order.itemCount} آیتم`}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <span className="inline-flex rounded-full border border-[#1f6a52]/10 bg-[#edf8f2] px-3 py-1.5 text-xs font-bold text-[#1f6a52]">
                      {mapOrderStatus(order.status)}
                    </span>
                    <span className="text-xs font-bold text-[#92785a]">{mapPaymentStatus(order.paymentStatus)}</span>
                    <strong className="text-sm text-[#173126]">{formatMoney(order.totalAmount)}</strong>
                  </div>
                </div>
              </article>
            )) : (
              <div className="rounded-[26px] border border-dashed border-[#dcc5a7] bg-[#fbf7f1] px-5 py-8 text-sm text-[#6e6152]">
                هنوز سفارشی برای این حساب ثبت نشده است.
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-5">
          <section className="rounded-[32px] bg-white/80 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7e56]">Profile</span>
            <h3 className="mt-2 text-2xl font-black text-[#173126]">اطلاعات پایه</h3>
            <div className="mt-5 grid gap-3 text-sm">
              <div className="rounded-[22px] bg-[#f9f4ec] px-4 py-4">
                <span className="block text-xs font-bold text-[#92785a]">نام</span>
                <strong className="mt-1 block text-base text-[#173126]">{summary.profile.fullName || 'ثبت نشده'}</strong>
              </div>
              <div className="rounded-[22px] bg-[#f9f4ec] px-4 py-4" dir="ltr">
                <span className="block text-xs font-bold text-[#92785a]">کد ملی</span>
                <strong className="mt-1 block text-base text-[#173126]">{summary.profile.nationalId || 'ثبت نشده'}</strong>
              </div>
              <div className="rounded-[22px] bg-[#f9f4ec] px-4 py-4" dir="ltr">
                <span className="block text-xs font-bold text-[#92785a]">شماره موبایل</span>
                <strong className="mt-1 block text-base text-[#173126]">{summary.profile.phoneNumber}</strong>
              </div>
              <div className="rounded-[22px] bg-[#f9f4ec] px-4 py-4">
                <span className="block text-xs font-bold text-[#92785a]">عضویت از</span>
                <strong className="mt-1 block text-base text-[#173126]">{formatDate(summary.profile.createdAt)}</strong>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] bg-white/80 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7e56]">Addresses</span>
            <h3 className="mt-2 text-2xl font-black text-[#173126]">آدرس‌های ذخیره‌شده</h3>
            <div className="mt-5 grid gap-3">
              {summary.addresses.length ? summary.addresses.map((address) => (
                <div className="rounded-[22px] border border-[#1f6a52]/8 bg-[#fbf7f1] px-4 py-4" key={address.id}>
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-base text-[#173126]">{address.title}</strong>
                    {address.isDefault ? <span className="rounded-full bg-[#edf8f2] px-3 py-1 text-[11px] font-bold text-[#1f6a52]">پیش‌فرض</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-[#6e6152]">{`${address.city} — ${address.address}`}</p>
                </div>
              )) : (
                <div className="rounded-[22px] border border-dashed border-[#dcc5a7] bg-[#fbf7f1] px-4 py-6 text-sm text-[#6e6152]">
                  هنوز آدرسی برای این حساب ثبت نشده است.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {[
          { title: 'پروفایل', description: 'ویرایش اطلاعات پایه حساب و مدیریت جزئیات شخصی.', href: '/account/profile' },
          { title: 'آدرس‌ها', description: 'ثبت آدرس جدید با انتخاب موقعیت روی نقشه و مدیریت مقصدهای تحویل.', href: '/account/addresses' },
          { title: 'کیف پول', description: 'مشاهده وضعیت اعتبار و گردش حساب کیف پول کاربری.', href: '/account/wallet' },
          { title: 'بازگشت به فروشگاه', description: 'مشاهده محصولات جدید و ادامه خرید از استور.', href: '/' },
        ].map((item) => (
          <Link className="rounded-[28px] border border-[#1f6a52]/10 bg-white/78 px-5 py-5 shadow-[0_10px_26px_rgba(52,36,17,0.05)] transition hover:-translate-y-0.5" href={item.href} key={item.title}>
            <strong className="block text-lg font-black text-[#173126]">{item.title}</strong>
            <p className="mt-3 text-sm leading-7 text-[#6e6152]">{item.description}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}

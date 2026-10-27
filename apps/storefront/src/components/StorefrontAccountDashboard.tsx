'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { getAccountSummary, readStoredToken, type StorefrontAccountSummary } from '../lib/storefrontAuth'
import { translateOrderStatus, translatePaymentStatus } from '../lib/storefrontOrderLabels'

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('fa-IR').format(value)} تومان`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(value))
}

function getPageNumbers(current: number, total: number): Array<number | string> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  if (current <= 3) {
    return [1, 2, 3, 4, '...', total]
  }
  if (current >= total - 2) {
    return [1, '...', total - 3, total - 2, total - 1, total]
  }
  return [1, '...', current - 1, current, current + 1, '...', total]
}

export function StorefrontAccountDashboard() {
  const [summary, setSummary] = useState<StorefrontAccountSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const ordersSectionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const token = readStoredToken()
    if (!token) {
      setError('برای مشاهده این بخش باید وارد حساب کاربری شوی.')
      setLoading(false)
      return
    }

    getAccountSummary(token, 1, 5)
      .then((payload) => setSummary(payload))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'دریافت اطلاعات حساب با خطا مواجه شد'))
      .finally(() => setLoading(false))
  }, [])

  const handlePageChange = (newPage: number) => {
    const token = readStoredToken()
    if (!token || newPage === page) return
    setPage(newPage)
    setOrdersLoading(true)
    getAccountSummary(token, newPage, 5)
      .then((payload) => setSummary(payload))
      .catch((err) => setError(err instanceof Error ? err.message : 'دریافت سفارش‌ها با خطا مواجه شد'))
      .finally(() => {
        setOrdersLoading(false)
        ordersSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
  }

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
                  {`آخرین وضعیت سفارش: ${translateOrderStatus(summary.stats.latestOrderStatus)}`}
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
        <div className="rounded-[32px] bg-white/80 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]" ref={ordersSectionRef}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#1f6a52]/8 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-[#173126]">سفارش‌های شما</h3>
                {summary.stats.orderCount > 0 ? (
                  <span className="rounded-full bg-[#1f6a52]/10 px-3 py-1 text-xs font-black text-[#1f6a52]">
                    {`${new Intl.NumberFormat('fa-IR').format(summary.stats.orderCount)} سفارش`}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-[#6e6152]">
                {summary.ordersPagination && summary.ordersPagination.totalPages > 1
                  ? `صفحه ${new Intl.NumberFormat('fa-IR').format(page)} از ${new Intl.NumberFormat('fa-IR').format(summary.ordersPagination.totalPages)}`
                  : 'مشاهده سوابق و وضعیت پیگیری کلیه سفارش‌ها'}
              </p>
            </div>
            {summary.stats.orderCount > 0 ? (
              <Link
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1f6a52] transition-colors hover:text-[#173126]"
                href="/account/orders"
              >
                <span>مشاهده در صفحه اختصاصی</span>
                <span>←</span>
              </Link>
            ) : null}
          </div>

          <div className="relative mt-5">
            {ordersLoading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[26px] bg-white/60 backdrop-blur-[2px]">
                <div className="flex items-center gap-2 rounded-full bg-[#173126] px-4 py-2 text-xs font-bold text-white shadow-lg">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>در حال بارگذاری سفارش‌ها...</span>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3">
              {summary.recentOrders.length ? summary.recentOrders.map((order) => (
                <Link
                  className="block rounded-[26px] border border-[#1f6a52]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,242,233,0.92))] px-5 py-5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(52,36,17,0.08)]"
                  href={`/account/orders/${order.id}`}
                  key={order.id}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <strong className="block text-lg font-black text-[#173126]">{`سفارش #${new Intl.NumberFormat('fa-IR').format(order.id)}`}</strong>
                      <p className="mt-2 text-sm text-[#6e6152]">{order.storeName ? `فروشگاه ${order.storeName}` : 'سفارش ثبت‌شده در گلینو'}</p>
                      <p className="mt-1 text-xs text-[#92785a]">{`${formatDate(order.createdAt)} • ${new Intl.NumberFormat('fa-IR').format(order.itemCount)} آیتم`}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <span className="inline-flex rounded-full border border-[#1f6a52]/10 bg-[#edf8f2] px-3 py-1.5 text-xs font-bold text-[#1f6a52]">
                        {translateOrderStatus(order.status)}
                      </span>
                      <span className="text-xs font-bold text-[#92785a]">{translatePaymentStatus(order.paymentStatus)}</span>
                      <strong className="text-sm text-[#173126]">{formatMoney(order.totalAmount)}</strong>
                    </div>
                  </div>
                </Link>
              )) : (
                <div className="rounded-[26px] border border-dashed border-[#dcc5a7] bg-[#fbf7f1] px-5 py-8 text-sm text-[#6e6152]">
                  هنوز سفارشی برای این حساب ثبت نشده است.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {summary.ordersPagination && summary.ordersPagination.totalPages > 1 ? (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#1f6a52]/8 pt-4">
                <span className="text-xs font-medium text-[#7d7161]">
                  {`نمایش ${new Intl.NumberFormat('fa-IR').format((page - 1) * 5 + 1)} تا ${new Intl.NumberFormat('fa-IR').format(Math.min(page * 5, summary.ordersPagination.total))} از ${new Intl.NumberFormat('fa-IR').format(summary.ordersPagination.total)} سفارش`}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    className="inline-flex items-center justify-center rounded-xl border border-[#dcc5a7] bg-[#fdfaf5] px-3.5 py-1.5 text-xs font-bold text-[#173126] transition hover:bg-white disabled:pointer-events-none disabled:opacity-40"
                    disabled={page <= 1 || ordersLoading}
                    onClick={() => handlePageChange(page - 1)}
                    type="button"
                  >
                    قبلی
                  </button>

                  {getPageNumbers(page, summary.ordersPagination.totalPages).map((p, idx) =>
                    typeof p === 'number' ? (
                      <button
                        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-xl px-2 text-xs font-bold transition ${
                          p === page
                            ? 'bg-[#1f6a52] text-white shadow-sm font-black'
                            : 'border border-[#e7ded3] bg-[#fdfaf5] text-[#173126] hover:bg-white'
                        }`}
                        disabled={ordersLoading}
                        key={`page-btn-${p}`}
                        onClick={() => handlePageChange(p)}
                        type="button"
                      >
                        {new Intl.NumberFormat('fa-IR').format(p)}
                      </button>
                    ) : (
                      <span className="px-1 text-xs text-[#92785a]" key={`ellipsis-${idx}`}>
                        …
                      </span>
                    )
                  )}

                  <button
                    className="inline-flex items-center justify-center rounded-xl border border-[#dcc5a7] bg-[#fdfaf5] px-3.5 py-1.5 text-xs font-bold text-[#173126] transition hover:bg-white disabled:pointer-events-none disabled:opacity-40"
                    disabled={page >= summary.ordersPagination.totalPages || ordersLoading}
                    onClick={() => handlePageChange(page + 1)}
                    type="button"
                  >
                    بعدی
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5">
          <section className="rounded-[32px] bg-white/80 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'همه سفارش‌ها', description: 'مشاهده آرشیو کامل سفارش‌ها و پیگیری وضعیت آن‌ها.', href: '/account/orders' },
          { title: 'پروفایل', description: 'ویرایش اطلاعات پایه حساب و مدیریت جزئیات شخصی.', href: '/account/profile' },
          { title: 'آدرس‌ها', description: 'ثبت آدرس جدید با انتخاب موقعیت روی نقشه و مدیریت مقصدها.', href: '/account/addresses' },
          { title: 'کیف پول', description: 'مشاهده وضعیت اعتبار و گردش حساب کیف پول کاربری.', href: '/account/wallet' },
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

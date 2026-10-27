'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getOrders, readStoredToken, type StorefrontOrdersListResponse } from '../lib/storefrontAuth'
import { translateOrderStatus, translatePaymentStatus } from '../lib/storefrontOrderLabels'

function formatMoney(value: number | string) {
  const numeric = Number(value || 0)
  return `${new Intl.NumberFormat('fa-IR').format(numeric)} تومان`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
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

type StatusFilter = 'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED'

export function StorefrontAccountOrdersList() {
  const [data, setData] = useState<StorefrontOrdersListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const token = readStoredToken()
    if (!token) {
      setError('برای مشاهده سفارش‌ها باید وارد حساب کاربری شوی.')
      setLoading(false)
      return
    }

    getOrders(token, 1, 10)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof Error ? err.message : 'دریافت لیست سفارش‌ها با خطا مواجه شد'))
      .finally(() => setLoading(false))
  }, [])

  const handlePageChange = (newPage: number) => {
    const token = readStoredToken()
    if (!token || newPage === page) return
    setPage(newPage)
    setOrdersLoading(true)
    getOrders(token, newPage, 10)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof Error ? err.message : 'دریافت سفارش‌ها با خطا مواجه شد'))
      .finally(() => {
        setOrdersLoading(false)
        window.scrollTo({ top: 160, behavior: 'smooth' })
      })
  }

  // Filter items locally based on tab and search
  const filteredItems = useMemo(() => {
    if (!data?.items) return []
    return data.items.filter((order) => {
      // Filter by status tab
      if (filter === 'ACTIVE') {
        const activeStatuses = ['PENDING', 'PAID', 'ACCEPTED', 'PROCESSING', 'SHIPPED']
        if (!activeStatuses.includes(order.status)) return false
      } else if (filter === 'DELIVERED') {
        if (order.status !== 'DELIVERED') return false
      } else if (filter === 'CANCELLED') {
        if (order.status !== 'CANCELLED') return false
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const orderIdStr = String(order.id)
        const storeName = (order.store?.name || '').toLowerCase()
        if (!orderIdStr.includes(q) && !storeName.includes(q)) return false
      }

      return true
    })
  }, [data?.items, filter, searchQuery])

  if (loading) {
    return (
      <section className="rounded-[32px] bg-white/75 px-6 py-16 text-center shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-[#173126] border-t-transparent" />
        <p className="mt-3 text-sm font-bold text-[#173126]">در حال بارگذاری لیست سفارش‌ها...</p>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="rounded-[32px] border border-dashed border-[#d7b690] bg-white/75 px-6 py-12 text-center shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
        <h2 className="text-2xl font-black text-[#173126]">عدم دسترسی به سفارش‌ها</h2>
        <p className="mt-4 text-sm leading-7 text-[#6e6152]">{error || 'اطلاعات در دسترس نیست.'}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link className="rounded-full bg-[#173126] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#29513f]" href="/account">
            بازگشت به پنل کاربری
          </Link>
        </div>
      </section>
    )
  }

  const totalPages = data.totalPages || 1
  const totalCount = data.total || 0

  return (
    <div className="grid gap-6">
      {/* Controls Bar: Search & Status Filters */}
      <section className="rounded-[28px] border border-[#1f6a52]/10 bg-white/80 p-4 shadow-[0_12px_28px_rgba(52,36,17,0.05)] md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL' as const, label: 'همه سفارش‌ها' },
              { id: 'ACTIVE' as const, label: 'در حال انجام' },
              { id: 'DELIVERED' as const, label: 'تحویل‌شده' },
              { id: 'CANCELLED' as const, label: 'لغو شده' },
            ].map((tab) => (
              <button
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  filter === tab.id
                    ? 'bg-[#1f6a52] text-white shadow-md'
                    : 'bg-[#f4efe6] text-[#173126] hover:bg-[#eae1d4]'
                }`}
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full max-w-xs">
            <input
              className="w-full rounded-full border border-[#dcc5a7] bg-[#fbf7f1] px-4 py-2 text-xs text-[#173126] outline-none transition placeholder:text-[#9c8e7e] focus:border-[#1f6a52] focus:bg-white"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو با شماره سفارش یا فروشگاه..."
              value={searchQuery}
            />
          </div>
        </div>
      </section>

      {/* Orders List */}
      <section className="relative rounded-[32px] bg-white/85 p-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
        {ordersLoading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[32px] bg-white/60 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 rounded-full bg-[#173126] px-5 py-2.5 text-xs font-bold text-white shadow-xl">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>در حال بارگذاری صفحه...</span>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3.5">
          {filteredItems.length ? (
            filteredItems.map((order) => (
              <Link
                className="group block rounded-[26px] border border-[#1f6a52]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,242,233,0.92))] p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(52,36,17,0.09)]"
                href={`/account/orders/${order.id}`}
                key={order.id}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <strong className="text-lg font-black text-[#173126]">
                        {`سفارش #${new Intl.NumberFormat('fa-IR').format(order.id)}`}
                      </strong>
                      <span className="rounded-full border border-[#1f6a52]/10 bg-[#edf8f2] px-3 py-1 text-xs font-bold text-[#1f6a52]">
                        {translateOrderStatus(order.status)}
                      </span>
                      <span className="text-xs font-bold text-[#92785a]">
                        {translatePaymentStatus(order.paymentStatus)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-[#6e6152]">
                      {order.store?.name ? `فروشگاه: ${order.store.name}` : 'سفارش ثبت‌شده در گلینو'}
                    </p>

                    <p className="mt-1 text-xs text-[#92785a]">
                      {`${formatDate(order.createdAt)} • ${new Intl.NumberFormat('fa-IR').format(order.orderItems?.length || 0)} قلم کالا`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                    <strong className="text-base font-black text-[#173126]">
                      {formatMoney(order.totalAmount)}
                    </strong>

                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1f6a52] transition group-hover:translate-x-[-2px]">
                      <span>مشاهده جزئیات</span>
                      <span>←</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-[26px] border border-dashed border-[#dcc5a7] bg-[#fbf7f1] p-10 text-center text-sm text-[#6e6152]">
              {searchQuery || filter !== 'ALL'
                ? 'هیچ سفارشی با این فیلتر یا عبارت جستجو یافت نشد.'
                : 'هنوز هیچ سفارشی در این حساب ثبت نشده است.'}
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 ? (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#1f6a52]/8 pt-5">
            <span className="text-xs font-medium text-[#7d7161]">
              {`نمایش ${new Intl.NumberFormat('fa-IR').format((page - 1) * 10 + 1)} تا ${new Intl.NumberFormat('fa-IR').format(Math.min(page * 10, totalCount))} از مجموع ${new Intl.NumberFormat('fa-IR').format(totalCount)} سفارش`}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                className="inline-flex items-center justify-center rounded-xl border border-[#dcc5a7] bg-[#fdfaf5] px-4 py-2 text-xs font-bold text-[#173126] transition hover:bg-white disabled:pointer-events-none disabled:opacity-40"
                disabled={page <= 1 || ordersLoading}
                onClick={() => handlePageChange(page - 1)}
                type="button"
              >
                قبلی
              </button>

              {getPageNumbers(page, totalPages).map((p, idx) =>
                typeof p === 'number' ? (
                  <button
                    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-xs font-bold transition ${
                      p === page
                        ? 'bg-[#1f6a52] text-white shadow-sm font-black'
                        : 'border border-[#e7ded3] bg-[#fdfaf5] text-[#173126] hover:bg-white'
                    }`}
                    disabled={ordersLoading}
                    key={`page-nav-${p}`}
                    onClick={() => handlePageChange(p)}
                    type="button"
                  >
                    {new Intl.NumberFormat('fa-IR').format(p)}
                  </button>
                ) : (
                  <span className="px-1.5 text-xs text-[#92785a]" key={`ellipsis-${idx}`}>
                    …
                  </span>
                )
              )}

              <button
                className="inline-flex items-center justify-center rounded-xl border border-[#dcc5a7] bg-[#fdfaf5] px-4 py-2 text-xs font-bold text-[#173126] transition hover:bg-white disabled:pointer-events-none disabled:opacity-40"
                disabled={page >= totalPages || ordersLoading}
                onClick={() => handlePageChange(page + 1)}
                type="button"
              >
                بعدی
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* Back button */}
      <div className="flex justify-start">
        <Link
          className="inline-flex items-center gap-2 rounded-full border border-[#1f6a52]/15 bg-white/80 px-5 py-2.5 text-xs font-bold text-[#173126] transition hover:bg-white hover:shadow-sm"
          href="/account"
        >
          <span>→</span>
          <span>بازگشت به پنل کاربری</span>
        </Link>
      </div>
    </div>
  )
}

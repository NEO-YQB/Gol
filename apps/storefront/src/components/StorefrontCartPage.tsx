'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { resolveAssetUrl } from '../lib/storefront'
import { calculateCartValue, pushToDataLayer, toAnalyticsItem } from '../lib/analytics'
import {
  clearCart,
  getCart,
  readStoredToken,
  removeCartItem,
  updateCartItem,
  type StorefrontCart,
  type StorefrontCartItem,
} from '../lib/storefrontAuth'
import { storefrontCatalog } from './storefrontCatalog'
import { storefrontShared } from './storefrontShared'

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('fa-IR').format(value)} تومان`
}

function getEffectiveBasePrice(item: StorefrontCartItem) {
  return item.pricing?.lineBaseTotal ?? item.product.price * item.quantity
}

function getLineDiscount(item: StorefrontCartItem) {
  const base = getEffectiveBasePrice(item)
  return Math.max(0, base - item.lineTotal)
}

export function StorefrontCartPage() {
  const [cart, setCart] = useState<StorefrontCart | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyItemId, setBusyItemId] = useState<number | null>(null)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    const token = readStoredToken()
    if (!token) {
      setError('برای مشاهده سبد خرید باید وارد حساب کاربری شوی.')
      setLoading(false)
      return
    }

    getCart(token)
      .then((payload) => setCart(payload))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'دریافت سبد خرید با خطا مواجه شد'))
      .finally(() => setLoading(false))
  }, [])

  const groupedItems = useMemo(() => {
    const groups = new Map<string, { storeName: string; storeSlug?: string; items: StorefrontCartItem[] }>()
    for (const item of cart?.items ?? []) {
      const key = item.product.store?.slug || `store-${item.product.store?.id || 'unknown'}`
      const current = groups.get(key)
      if (current) {
        current.items.push(item)
      } else {
        groups.set(key, {
          storeName: item.product.store?.name || 'فروشگاه نامشخص',
          storeSlug: item.product.store?.slug || undefined,
          items: [item],
        })
      }
    }
    return Array.from(groups.values())
  }, [cart])

  async function handleQuantityChange(item: StorefrontCartItem, nextQuantity: number) {
    if (nextQuantity < 1) return
    const token = readStoredToken()
    if (!token) return

    try {
      setBusyItemId(item.id)
      setError('')
      const nextCart = await updateCartItem(token, item.id, { quantity: nextQuantity })
      setCart(nextCart)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ویرایش تعداد با خطا مواجه شد')
    } finally {
      setBusyItemId(null)
    }
  }

  async function handleRemoveItem(itemId: number) {
    const token = readStoredToken()
    if (!token) return

    try {
      setBusyItemId(itemId)
      setError('')
      const nextCart = await removeCartItem(token, itemId)
      setCart(nextCart)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'حذف آیتم با خطا مواجه شد')
    } finally {
      setBusyItemId(null)
    }
  }

  async function handleClearCart() {
    const token = readStoredToken()
    if (!token) return

    try {
      setClearing(true)
      setError('')
      const nextCart = await clearCart(token)
      setCart(nextCart)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'خالی کردن سبد با خطا مواجه شد')
    } finally {
      setClearing(false)
    }
  }

  useEffect(() => {
    if (!cart?.items.length) return
    pushToDataLayer({
      event: 'view_cart',
      ecommerce: {
        currency: 'IRR',
        value: calculateCartValue(cart.items.map((item) => ({ price: item.product.price, quantity: item.quantity }))),
        items: cart.items.map((item) => toAnalyticsItem(item.product, item.quantity)),
      },
    })
  }, [cart])

  if (loading) {
    return <section className="rounded-[32px] bg-white/75 px-6 py-12 text-center shadow-[0_14px_34px_rgba(52,36,17,0.06)]">در حال بارگذاری سبد خرید...</section>
  }

  if (error && !cart) {
    return (
      <section className={storefrontShared.emptyState}>
        <h2 className="text-2xl font-black text-[#173126]">فعلاً دسترسی به سبد خرید کامل نیست</h2>
        <p className="mt-4 text-sm leading-7 text-[#6e6152]">{error}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link className="rounded-full bg-[#173126] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#29513f]" href="/shop">
            رفتن به فروشگاه
          </Link>
        </div>
      </section>
    )
  }

  const hasItems = Boolean(cart?.items.length)

  return (
    <div className="grid gap-6">
      <section className={storefrontCatalog.hero}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2 text-xs font-bold text-white/85">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">سبد خرید شما</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">{`${new Intl.NumberFormat('fa-IR').format(cart?.totalItems ?? 0)} آیتم`}</span>
            </div>
            <h1 className="mt-4 text-3xl font-black md:text-[2.4rem]">سبد خرید</h1>
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-3">
            {[
              { label: 'ارزش کالاها', value: formatMoney(cart?.pricing.subtotalBaseAmount ?? 0) },
              { label: 'جمع تخفیف', value: formatMoney(cart?.pricing.discountAmount ?? 0) },
              { label: 'تعداد کل', value: `${new Intl.NumberFormat('fa-IR').format(cart?.pricing.totalItems ?? 0)} آیتم` },
              { label: 'مبلغ نهایی', value: formatMoney(cart?.pricing.totalAmount ?? 0) },
            ].map((item) => (
              <div className="rounded-[22px] border border-white/10 bg-black/10 px-4 py-4" key={item.label}>
                <span className="block text-[11px] font-bold text-white/72">{item.label}</span>
                <strong className="mt-2 block text-base font-black leading-7 text-white">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-[24px] border border-[#d06c54]/20 bg-[#fff6f3] px-5 py-4 text-sm font-bold text-[#b64b36]">
          {error}
        </section>
      ) : null}

      {hasItems ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_360px]">
          <div className="grid gap-4">
            {groupedItems.map((group) => (
              <section className="rounded-[32px] bg-white/80 px-5 py-5 shadow-[0_14px_34px_rgba(52,36,17,0.06)]" key={group.storeSlug || group.storeName}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-[#173126]">
                      {group.storeSlug ? <Link href={`/stores/${group.storeSlug}`}>{group.storeName}</Link> : group.storeName}
                    </h2>
                    <p className="mt-1 text-sm text-[#6e6152]">
                      {`${new Intl.NumberFormat('fa-IR').format(group.items.length)} محصول از این فروشگاه`}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {group.items.map((item) => {
                    const baseLineTotal = getEffectiveBasePrice(item)
                    const lineDiscount = getLineDiscount(item)
                    const isBusy = busyItemId === item.id

                    return (
                      <article className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 rounded-[28px] border border-[#1f6a52]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,242,233,0.94))] p-4 md:grid-cols-[112px_minmax(0,1fr)]" key={item.id}>
                        <Link className="block aspect-square overflow-hidden rounded-[22px] bg-[#f4eadc] md:aspect-auto md:h-full md:rounded-[24px]" href={`/products/${item.product.slug}`}>
                          <img alt={item.product.name} className="h-full w-full object-contain p-2 md:object-cover md:p-0" src={resolveAssetUrl(item.product.mainImage)} />
                        </Link>

                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <Link className="block text-lg font-black text-[#173126]" href={`/products/${item.product.slug}`}>
                                {item.product.name}
                              </Link>
                              {lineDiscount > 0 ? (
                                <p className="mt-2 text-xs font-bold text-[#1f6a52]">
                                  {`تخفیف این آیتم: ${formatMoney(lineDiscount)}`}
                                </p>
                              ) : null}
                            </div>

                            <div className="text-right lg:min-w-[180px]">
                              {lineDiscount > 0 ? <div className="text-sm text-[#9c8a75] line-through">{formatMoney(baseLineTotal)}</div> : null}
                              <strong className="mt-1 block text-lg font-black text-[#d06c54]">{formatMoney(item.lineTotal)}</strong>
                              <span className="mt-1 block text-xs text-[#92785a]">{`هر واحد ${formatMoney(item.unitPrice)}`}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#1f6a52]/10 bg-white px-2 py-2 shadow-[0_8px_18px_rgba(52,36,17,0.04)]">
                              <button
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#1f6a52]/12 bg-[#f8f2ea] text-lg font-black text-[#173126] disabled:opacity-50"
                                disabled={isBusy || item.quantity <= 1}
                                onClick={() => handleQuantityChange(item, item.quantity - 1)}
                                type="button"
                              >
                                −
                              </button>
                              <span className="min-w-10 text-center text-sm font-black text-[#173126]">
                                {new Intl.NumberFormat('fa-IR').format(item.quantity)}
                              </span>
                              <button
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#1f6a52]/12 bg-[#f8f2ea] text-lg font-black text-[#173126] disabled:opacity-50"
                                disabled={isBusy || item.quantity >= Number(item.product.quantity || 0)}
                                onClick={() => handleQuantityChange(item, item.quantity + 1)}
                                type="button"
                              >
                                +
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Link className="inline-flex items-center rounded-full border border-[#1f6a52]/18 px-4 py-2 text-sm font-bold text-[#1f6a52]" href={`/products/${item.product.slug}`}>
                                مشاهده محصول
                              </Link>
                              <button
                                className="inline-flex items-center rounded-full border border-[#d06c54]/18 bg-white px-4 py-2 text-sm font-bold text-[#b64b36] disabled:opacity-50"
                                disabled={isBusy}
                                onClick={() => handleRemoveItem(item.id)}
                                type="button"
                              >
                                حذف از سبد
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          <aside className="grid gap-5">
            <section className="rounded-[32px] bg-white/82 px-5 py-5 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
              <h2 className="text-2xl font-black text-[#173126]">خلاصه پرداخت</h2>
              <div className="mt-5 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#f9f4ec] px-4 py-4">
                  <span className="text-[#6e6152]">جمع کالاها</span>
                  <strong className="text-[#173126]">{formatMoney(cart?.pricing.subtotalBaseAmount ?? 0)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#f9f4ec] px-4 py-4">
                  <span className="text-[#6e6152]">تخفیف آیتم‌ها</span>
                  <strong className="text-[#1f6a52]">{formatMoney(cart?.pricing.lineDiscountAmount ?? 0)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#f9f4ec] px-4 py-4">
                  <span className="text-[#6e6152]">تخفیف کوپن</span>
                  <strong className="text-[#1f6a52]">{formatMoney(cart?.pricing.couponDiscountAmount ?? 0)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#f9f4ec] px-4 py-4">
                  <span className="text-[#6e6152]">هزینه ارسال</span>
                  <strong className="text-[#173126]">{formatMoney(cart?.pricing.deliveryFee ?? 0)}</strong>
                </div>
              </div>
              <div className="mt-5 rounded-[24px] bg-[linear-gradient(135deg,#173126_0%,#29513f_58%,#d06c54_100%)] px-4 py-4 text-white">
                <span className="block text-xs font-bold text-white/75">مبلغ قابل پرداخت</span>
                <strong className="mt-2 block text-2xl font-black">{formatMoney(cart?.pricing.totalAmount ?? 0)}</strong>
              </div>
              <div className="mt-5 grid gap-3">
                <Link className="inline-flex items-center justify-center rounded-full bg-[#173126] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#29513f]" href="/checkout">
                  ادامه تا تسویه حساب
                </Link>
                <button
                  className="inline-flex items-center justify-center rounded-full border border-[#d06c54]/18 bg-white px-5 py-3 text-sm font-bold text-[#b64b36] disabled:opacity-50"
                  disabled={clearing}
                  onClick={handleClearCart}
                  type="button"
                >
                  خالی کردن سبد خرید
                </button>
              </div>
            </section>

          </aside>
        </section>
      ) : (
        <section className={storefrontShared.emptyState}>
          <h2 className="text-2xl font-black text-[#173126]">سبد خرید شما خالی است</h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link className="rounded-full bg-[#173126] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#29513f]" href="/shop">
              رفتن به فروشگاه
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}

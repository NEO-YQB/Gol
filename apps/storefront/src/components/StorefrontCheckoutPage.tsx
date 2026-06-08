'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getAddresses,
  getCart,
  getCurrentUser,
  readStoredSelectedAddress,
  readStoredToken,
  type StorefrontAddress,
  type StorefrontCart,
  type StorefrontCartItem,
  writeStoredSelectedAddress,
} from '../lib/storefrontAuth'
import { emitStorefrontCartUpdated } from '../lib/storefrontCartEvents'
import { emitStorefrontToast } from './storefrontToast'
import { storefrontCatalog } from './storefrontCatalog'
import { storefrontShared } from './storefrontShared'

type CheckoutPreview = {
  cartId: number
  store?: {
    id: number
    name: string
    slug: string
  } | null
  delivery?: {
    sameDayDelivery?: boolean
    hasExpressDelivery?: boolean
    minDeliveryHours?: number | null
    maxDeliveryHours?: number | null
    expressDeliveryHours?: number | null
    deliveryWindows?: Array<{ key?: string; label?: string }>
    availableDeliveryTypes?: Array<'STANDARD' | 'EXPRESS'>
  } | null
  address?: {
    id: number
    title?: string | null
    city?: string | null
    address?: string | null
    lat?: number | null
    lng?: number | null
  } | null
  payment?: {
    paymentMethod?: 'COD' | 'ONLINE'
    paymentStatus?: string
  } | null
  items?: Array<{
    productId: number
    quantity: number
    product?: {
      name?: string
    }
    pricing?: {
      finalLineTotalBeforeCoupon?: number
    }
  }>
  coupon?: {
    code?: string
    title?: string
  } | null
  subtotalBaseAmount?: number
  subtotalAfterLineDiscounts?: number
  deliveryFee?: number
  lineDiscountAmount?: number
  couponDiscountAmount?: number
  discountAmount?: number
  totalAmount?: number
}

type CreatedOrder = {
  id: number
  status: string
  paymentStatus: string
  totalAmount: string | number
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('fa-IR').format(value)} تومان`
}

function formatItemsCount(value: number) {
  return `${new Intl.NumberFormat('fa-IR').format(value)} آیتم`
}

function normalizeNationalId(value: string) {
  return value.replace(/\D/g, '').slice(0, 10)
}

function isValidNationalId(value: string) {
  return /^\d{10}$/.test(value)
}

function getProductLineTotal(item: StorefrontCartItem) {
  return item.pricing?.finalLineTotalBeforeCoupon ?? item.lineTotal
}

export function StorefrontCheckoutPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState('')
  const [cart, setCart] = useState<StorefrontCart | null>(null)
  const [addresses, setAddresses] = useState<StorefrontAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [preview, setPreview] = useState<CheckoutPreview | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [appliedCouponCode, setAppliedCouponCode] = useState('')
  const [deliveryType, setDeliveryType] = useState<'STANDARD' | 'EXPRESS'>('STANDARD')
  const [deliveryWindowLabel, setDeliveryWindowLabel] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [nationalId, setNationalId] = useState('')

  useEffect(() => {
    const token = readStoredToken()
    if (!token) {
      setError('برای ادامه خرید باید وارد حساب کاربری شوی.')
      setLoading(false)
      return
    }

    Promise.all([
      getCurrentUser(token),
      getCart(token),
      getAddresses(token),
    ])
      .then(([currentUser, currentCart, currentAddresses]) => {
        setCart(currentCart)
        setAddresses(currentAddresses)
        setRecipientName(currentUser.fullName?.trim() || '')
        setRecipientPhone(currentUser.phoneNumber || '')

        const storedAddress = readStoredSelectedAddress()
        const selectedAddress =
          currentAddresses.find((item) => item.id === storedAddress?.id) ||
          currentAddresses.find((item) => item.isDefault) ||
          currentAddresses[0] ||
          null

        if (selectedAddress) {
          setSelectedAddressId(selectedAddress.id)
          writeStoredSelectedAddress(selectedAddress)
        }
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : 'آماده‌سازی تسویه حساب با خطا مواجه شد')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const token = readStoredToken()
    if (!token || !selectedAddressId) return

    setPreviewLoading(true)
    setError('')

    fetch('/api/orders/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        addressId: selectedAddressId,
        couponCode: appliedCouponCode || undefined,
      }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as CheckoutPreview | { message?: string | string[] }
        if (!response.ok) {
          const message = Array.isArray((payload as { message?: string | string[] }).message)
            ? (payload as { message?: string[] }).message?.[0]
            : (payload as { message?: string }).message
          throw new Error(message || 'پیش‌نمایش تسویه حساب با خطا مواجه شد')
        }

        const nextPreview = payload as CheckoutPreview
        setPreview(nextPreview)

        const availableTypes = nextPreview.delivery?.availableDeliveryTypes || ['STANDARD']
        setDeliveryType((current) => (availableTypes.includes(current) ? current : availableTypes[0] || 'STANDARD'))

        const availableWindows = nextPreview.delivery?.deliveryWindows || []
        setDeliveryWindowLabel((current) => {
          if (!current) return ''
          const exists = availableWindows.some((item) => item.label === current || item.key === current)
          return exists ? current : ''
        })
      })
      .catch((requestError) => {
        setPreview(null)
        setError(requestError instanceof Error ? requestError.message : 'پیش‌نمایش تسویه حساب با خطا مواجه شد')
      })
      .finally(() => setPreviewLoading(false))
  }, [selectedAddressId, appliedCouponCode])

  const selectedAddress = useMemo(
    () => addresses.find((item) => item.id === selectedAddressId) || null,
    [addresses, selectedAddressId],
  )

  const hasItems = Boolean(cart?.items.length)
  const availableDeliveryTypes = preview?.delivery?.availableDeliveryTypes || ['STANDARD']
  const deliveryWindows = preview?.delivery?.deliveryWindows || []
  const canSubmit =
    Boolean(hasItems) &&
    Boolean(selectedAddressId) &&
    recipientName.trim().length >= 2 &&
    recipientPhone.trim().length >= 10 &&
    isValidNationalId(nationalId) &&
    !submitting &&
    !previewLoading

  function handleApplyCoupon() {
    const normalizedCoupon = couponInput.trim().toUpperCase()
    setAppliedCouponCode(normalizedCoupon)
    if (!normalizedCoupon) {
      emitStorefrontToast({ message: 'کد تخفیف پاک شد و قیمت‌ها به‌روزرسانی شدند.', variant: 'success', duration: 5000 })
      return
    }
    emitStorefrontToast({ message: 'کد تخفیف برای پیش‌نمایش سفارش بررسی شد.', variant: 'success', duration: 5000 })
  }

  function handleSelectAddress(address: StorefrontAddress) {
    setSelectedAddressId(address.id)
    writeStoredSelectedAddress(address)
    setAddressModalOpen(false)
    emitStorefrontToast({ message: `آدرس «${address.title}» برای این سفارش انتخاب شد.`, variant: 'success', duration: 5000 })
  }

  async function handleSubmitOrder() {
    const token = readStoredToken()
    if (!token || !selectedAddressId) {
      setError('برای نهایی‌کردن سفارش، ابتدا آدرس را مشخص کن.')
      return
    }

    if (!isValidNationalId(nationalId)) {
      setError('کد ملی باید ۱۰ رقم باشد.')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      const response = await fetch('/api/orders/from-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          addressId: selectedAddressId,
          paymentMethod: 'COD',
          deliveryType,
          deliveryWindowLabel: deliveryWindowLabel || undefined,
          couponCode: appliedCouponCode || undefined,
          nationalId,
        }),
      })

      const payload = (await response.json()) as CreatedOrder | { message?: string | string[] }
      if (!response.ok) {
        const message = Array.isArray((payload as { message?: string | string[] }).message)
          ? (payload as { message?: string[] }).message?.[0]
          : (payload as { message?: string }).message
        throw new Error(message || 'ثبت سفارش با خطا مواجه شد')
      }

      const refreshedCart = await getCart(token).catch(() => null)
      if (refreshedCart) {
        emitStorefrontCartUpdated(refreshedCart)
      }

      emitStorefrontToast({
        message: `سفارش شما با موفقیت ثبت شد و با شماره ${new Intl.NumberFormat('fa-IR').format((payload as CreatedOrder).id)} در حساب کاربری‌ات قرار گرفت.`,
        variant: 'success',
        duration: 7000,
      })
      router.push('/account')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ثبت سفارش با خطا مواجه شد')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <section className="rounded-[32px] bg-white/75 px-6 py-12 text-center shadow-[0_14px_34px_rgba(52,36,17,0.06)]">در حال آماده‌سازی تسویه حساب...</section>
  }

  if (!hasItems) {
    return (
      <section className={storefrontShared.emptyState}>
        <h2 className="text-2xl font-black text-[#173126]">برای تسویه حساب، سبد خرید باید پر باشد</h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link className="rounded-full bg-[#173126] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#29513f]" href="/shop">
            رفتن به فروشگاه
          </Link>
        </div>
      </section>
    )
  }

  return (
    <div className="grid gap-6">
      <section className={storefrontCatalog.hero}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2 text-xs font-bold text-white/85">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">تسویه حساب سفارش</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">{formatItemsCount(cart?.totalItems ?? 0)}</span>
            </div>
            <h1 className="mt-4 text-3xl font-black md:text-[2.4rem]">نهایی‌سازی سفارش</h1>
            <p className="mt-3 max-w-2xl text-sm leading-8 text-white/82">
              آدرس انتخاب‌شده به‌صورت خودکار از مسیر خریدت وارد شده است. اگر لازم باشد، همین‌جا می‌توانی آدرس دیگری را انتخاب کنی.
            </p>
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-3">
            {[
              { label: 'فروشگاه انتخاب‌شده', value: preview?.store?.name || 'در حال بارگذاری' },
              { label: 'تعداد کل', value: formatItemsCount(cart?.totalItems ?? 0) },
              { label: 'کد تخفیف فعال', value: preview?.coupon?.code || 'ندارد' },
              { label: 'جمع قابل پرداخت', value: formatMoney(preview?.totalAmount ?? cart?.pricing.totalAmount ?? 0) },
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

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <div className="grid gap-5">
          <section className="rounded-[32px] bg-white/82 px-5 py-5 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-[#173126]">آدرس تحویل</h2>
                <p className="mt-1 text-sm text-[#6e6152]">سفارش بر اساس همین آدرس برای نزدیک‌ترین فروشگاه انتخاب‌شده ثبت می‌شود.</p>
              </div>
              <button
                className="inline-flex items-center justify-center rounded-full border border-[#1f6a52]/16 bg-[#f7f1e8] px-4 py-2 text-sm font-bold text-[#173126]"
                onClick={() => setAddressModalOpen(true)}
                type="button"
              >
                تغییر آدرس
              </button>
            </div>

            {selectedAddress ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="font-bold text-[#6e6152]">عنوان آدرس</span>
                  <input
                    className="rounded-[22px] border border-[#e8ded2] bg-[#fbf8f3] px-4 py-3 text-right text-sm text-[#173126] outline-none"
                    readOnly
                    value={selectedAddress.title}
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-bold text-[#6e6152]">شهر</span>
                  <input
                    className="rounded-[22px] border border-[#e8ded2] bg-[#fbf8f3] px-4 py-3 text-right text-sm text-[#173126] outline-none"
                    readOnly
                    value={selectedAddress.city}
                  />
                </label>
                <label className="grid gap-2 text-sm md:col-span-2">
                  <span className="font-bold text-[#6e6152]">نشانی کامل</span>
                  <textarea
                    className="min-h-28 rounded-[22px] border border-[#e8ded2] bg-[#fbf8f3] px-4 py-3 text-right text-sm leading-7 text-[#173126] outline-none"
                    readOnly
                    value={selectedAddress.address}
                  />
                </label>
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-[#d06c54]/14 bg-[#fff8f6] px-4 py-4 text-sm leading-7 text-[#8e5d44]">
                هنوز آدرسی برای سفارش انتخاب نشده است. لطفاً یک آدرس انتخاب کن.
              </div>
            )}

            <div className="mt-4 rounded-[22px] border border-[#e8ded2] bg-[#fcfaf6] px-4 py-4 text-sm leading-7 text-[#7a6a59]">
              اگر لازم است متن آدرس را ویرایش یا آدرس جدید ثبت کنی، از دکمه تغییر آدرس وارد لیست آدرس‌ها شو و آنجا آدرس مناسب را انتخاب کن.
            </div>
          </section>

          <section className="rounded-[32px] bg-white/82 px-5 py-5 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
            <h2 className="text-2xl font-black text-[#173126]">اطلاعات سفارش‌گیرنده</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-bold text-[#6e6152]">نام و نام خانوادگی</span>
                <input
                  className="rounded-[22px] border border-[#e8ded2] bg-[#fbf8f3] px-4 py-3 text-right text-sm text-[#173126] outline-none"
                  onChange={(event) => setRecipientName(event.target.value)}
                  placeholder="نام کامل تحویل‌گیرنده"
                  value={recipientName}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-bold text-[#6e6152]">شماره تماس</span>
                <input
                  className="rounded-[22px] border border-[#e8ded2] bg-[#fbf8f3] px-4 py-3 text-right text-sm text-[#173126] outline-none"
                  inputMode="tel"
                  onChange={(event) => setRecipientPhone(event.target.value)}
                  placeholder="مثلاً 09121234567"
                  value={recipientPhone}
                />
              </label>
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-bold text-[#6e6152]">کد ملی</span>
                <input
                  className="rounded-[22px] border border-[#e8ded2] bg-[#fbf8f3] px-4 py-3 text-left text-sm tracking-[0.28em] text-[#173126] outline-none"
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) => setNationalId(normalizeNationalId(event.target.value))}
                  placeholder="0012345678"
                  value={nationalId}
                />
                <span className="text-xs text-[#92785a]">این فیلد برای نهایی‌کردن سفارش اجباری است.</span>
              </label>
            </div>
          </section>

          <section className="rounded-[32px] bg-white/82 px-5 py-5 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
            <h2 className="text-2xl font-black text-[#173126]">ارسال و تخفیف</h2>
            <div className="mt-5 grid gap-5">
              <div className="grid gap-3 md:grid-cols-2">
                {availableDeliveryTypes.map((type) => {
                  const isExpress = type === 'EXPRESS'
                  return (
                    <button
                      className={`rounded-[24px] border px-4 py-4 text-right transition ${deliveryType === type ? 'border-[#173126] bg-[#173126] text-white' : 'border-[#e8ded2] bg-[#fbf8f3] text-[#173126]'}`}
                      key={type}
                      onClick={() => setDeliveryType(type)}
                      type="button"
                    >
                      <strong className="block text-sm font-black">{isExpress ? 'ارسال فوری' : 'ارسال استاندارد'}</strong>
                      <span className={`mt-2 block text-xs leading-6 ${deliveryType === type ? 'text-white/78' : 'text-[#7b6d5d]'}`}>
                        {isExpress
                          ? `حدود ${new Intl.NumberFormat('fa-IR').format(preview?.delivery?.expressDeliveryHours ?? 1)} ساعت`
                          : `بین ${new Intl.NumberFormat('fa-IR').format(preview?.delivery?.minDeliveryHours ?? 0)} تا ${new Intl.NumberFormat('fa-IR').format(preview?.delivery?.maxDeliveryHours ?? 0)} ساعت`}
                      </span>
                    </button>
                  )
                })}
              </div>

              {deliveryWindows.length ? (
                <label className="grid gap-2 text-sm">
                  <span className="font-bold text-[#6e6152]">بازه زمانی ارسال</span>
                  <select
                    className="rounded-[22px] border border-[#e8ded2] bg-[#fbf8f3] px-4 py-3 text-right text-sm text-[#173126] outline-none"
                    onChange={(event) => setDeliveryWindowLabel(event.target.value)}
                    value={deliveryWindowLabel}
                  >
                    <option value="">اولین بازه در دسترس</option>
                    {deliveryWindows.map((window, index) => {
                      const value = window.label || window.key || `window-${index}`
                      return (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      )
                    })}
                  </select>
                </label>
              ) : null}

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <label className="grid gap-2 text-sm">
                  <span className="font-bold text-[#6e6152]">کد تخفیف</span>
                  <input
                    className="rounded-[22px] border border-[#e8ded2] bg-[#fbf8f3] px-4 py-3 text-left text-sm uppercase text-[#173126] outline-none"
                    onChange={(event) => setCouponInput(event.target.value)}
                    placeholder="FIRSTBUY20"
                    value={couponInput}
                  />
                </label>
                <button
                  className="mt-[1.9rem] inline-flex items-center justify-center rounded-full bg-[#173126] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#29513f]"
                  onClick={handleApplyCoupon}
                  type="button"
                >
                  اعمال کد
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="grid gap-5">
          <section className="rounded-[32px] bg-white/82 px-5 py-5 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
            <h2 className="text-2xl font-black text-[#173126]">خلاصه نهایی سفارش</h2>
            <div className="mt-5 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#f9f4ec] px-4 py-4">
                <span className="text-[#6e6152]">جمع کالاها</span>
                <strong className="text-[#173126]">{formatMoney(preview?.subtotalBaseAmount ?? cart?.pricing.subtotalBaseAmount ?? 0)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#f9f4ec] px-4 py-4">
                <span className="text-[#6e6152]">تخفیف آیتم‌ها</span>
                <strong className="text-[#1f6a52]">{formatMoney(preview?.lineDiscountAmount ?? cart?.pricing.lineDiscountAmount ?? 0)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#f9f4ec] px-4 py-4">
                <span className="text-[#6e6152]">تخفیف کد</span>
                <strong className="text-[#1f6a52]">{formatMoney(preview?.couponDiscountAmount ?? 0)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#f9f4ec] px-4 py-4">
                <span className="text-[#6e6152]">هزینه ارسال</span>
                <strong className="text-[#173126]">{formatMoney(preview?.deliveryFee ?? cart?.pricing.deliveryFee ?? 0)}</strong>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] bg-[linear-gradient(135deg,#173126_0%,#29513f_58%,#d06c54_100%)] px-4 py-4 text-white">
              <span className="block text-xs font-bold text-white/75">مبلغ قابل پرداخت</span>
              <strong className="mt-2 block text-2xl font-black">{formatMoney(preview?.totalAmount ?? cart?.pricing.totalAmount ?? 0)}</strong>
            </div>

            <div className="mt-5 rounded-[24px] border border-[#e8ded2] bg-[#fcfaf6] px-4 py-4">
              <strong className="block text-sm font-black text-[#173126]">آیتم‌های سفارش</strong>
              <div className="mt-3 grid gap-3">
                {(cart?.items ?? []).map((item) => (
                  <div className="flex items-center justify-between gap-3 text-sm" key={item.id}>
                    <div className="min-w-0 text-right">
                      <strong className="block truncate text-[#173126]">{item.product.name}</strong>
                      <span className="mt-1 block text-xs text-[#8c7f6f]">{formatItemsCount(item.quantity)}</span>
                    </div>
                    <span className="shrink-0 font-bold text-[#173126]">{formatMoney(getProductLineTotal(item))}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <button
                className="inline-flex items-center justify-center rounded-full bg-[#173126] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#29513f] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSubmit}
                onClick={handleSubmitOrder}
                type="button"
              >
                {submitting ? 'در حال ثبت سفارش...' : 'ثبت سفارش و ادامه'}
              </button>
              <Link className="inline-flex items-center justify-center rounded-full border border-[#d8ccbf] bg-white px-5 py-3 text-sm font-bold text-[#173126]" href="/cart">
                بازگشت به سبد خرید
              </Link>
            </div>

            <p className="mt-4 text-xs leading-6 text-[#8d7d6c]">
              کد ملی در این مرحله از کاربر گرفته می‌شود، اما برای ثبت کامل آن در سفارش هنوز نیاز به پشتیبانی سمت بک‌اند داریم.
            </p>
          </section>
        </aside>
      </section>

      {addressModalOpen ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[#173126]/24 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-[560px] rounded-[32px] border border-white/60 bg-[rgba(255,252,248,0.96)] p-5 shadow-[0_24px_60px_rgba(23,49,38,0.16)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-[#173126]">انتخاب آدرس سفارش</h3>
                <p className="mt-1 text-sm leading-7 text-[#6e6152]">یک آدرس ذخیره‌شده را انتخاب کن یا برای ثبت آدرس تازه به بخش آدرس‌ها برو.</p>
              </div>
              <button
                aria-label="بستن"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f3ece2] text-lg font-black text-[#173126]"
                onClick={() => setAddressModalOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid max-h-[55vh] gap-3 overflow-y-auto">
              {addresses.map((address) => {
                const isActive = selectedAddressId === address.id
                return (
                  <button
                    className={`rounded-[24px] border px-4 py-4 text-right transition ${isActive ? 'border-[#173126] bg-[#173126] text-white' : 'border-[#e8ded2] bg-[#fbf8f3] text-[#173126]'}`}
                    key={address.id}
                    onClick={() => handleSelectAddress(address)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm font-black">{address.title}</strong>
                      {address.isDefault ? (
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${isActive ? 'bg-white/18 text-white' : 'bg-[#edf8f2] text-[#1f6a52]'}`}>
                          پیش‌فرض
                        </span>
                      ) : null}
                    </div>
                    <span className={`mt-2 block text-xs ${isActive ? 'text-white/78' : 'text-[#7d7164]'}`}>{address.city}</span>
                    <p className={`mt-2 text-sm leading-7 ${isActive ? 'text-white/86' : 'text-[#5f5246]'}`}>{address.address}</p>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="inline-flex items-center justify-center rounded-full bg-[#173126] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#29513f]" href="/account/addresses">
                تعریف یا مدیریت آدرس
              </Link>
              <button
                className="inline-flex items-center justify-center rounded-full border border-[#d8ccbf] bg-white px-5 py-3 text-sm font-bold text-[#173126]"
                onClick={() => setAddressModalOpen(false)}
                type="button"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createAddress,
  deleteAddress,
  getAddresses,
  readStoredToken,
  type CreateStorefrontAddressInput,
  type StorefrontAddress,
} from '../lib/storefrontAuth'
import { StorefrontMapPicker } from './StorefrontMapPicker'

type ReverseLookupPayload = {
  formattedAddress?: string
  city?: string
}

const DEFAULT_ADDRESS: CreateStorefrontAddressInput = {
  title: '',
  city: '',
  address: '',
  lat: 35.7219,
  lng: 51.3347,
  isDefault: false,
}

function formatDate(value?: string) {
  if (!value) return 'همین حالا'
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function StorefrontAccountAddresses() {
  const [addresses, setAddresses] = useState<StorefrontAddress[]>([])
  const [draft, setDraft] = useState<CreateStorefrontAddressInput>(DEFAULT_ADDRESS)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [reverseLoading, setReverseLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const token = useMemo(() => readStoredToken(), [])

  const loadAddresses = useCallback(async () => {
    if (!token) {
      setError('برای مدیریت آدرس‌ها باید وارد حساب کاربری شوی.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const payload = await getAddresses(token)
      setAddresses(payload)
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'دریافت آدرس‌ها با خطا مواجه شد')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadAddresses()
  }, [loadAddresses])

  async function handleReverseLookup(lat: number, lng: number) {
    try {
      setReverseLoading(true)
      const response = await fetch(`/api/maps/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`, {
        cache: 'no-store',
      })
      if (!response.ok) return

      const payload = (await response.json()) as ReverseLookupPayload
      setDraft((current) => ({
        ...current,
        city: current.city || payload.city || '',
        address: current.address || payload.formattedAddress || '',
      }))
    } catch {
    } finally {
      setReverseLoading(false)
    }
  }

  function handleLocationChange(nextValue: { lat: number; lng: number }) {
    setDraft((current) => ({ ...current, ...nextValue }))
    void handleReverseLookup(nextValue.lat, nextValue.lng)
  }

  async function handleCreateAddress() {
    if (!token) {
      setError('نشست شما منقضی شده است. دوباره وارد شوید.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      setMessage('')

      const payload = await createAddress(token, {
        ...draft,
        title: draft.title.trim(),
        city: draft.city.trim(),
        address: draft.address.trim(),
      })

      setAddresses((current) => [payload, ...current.filter((item) => item.id !== payload.id)].map((item) => ({
        ...item,
        isDefault: payload.isDefault ? item.id === payload.id : item.isDefault,
      })))
      setDraft(DEFAULT_ADDRESS)
      setMessage('آدرس جدید با موفقیت ثبت شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ثبت آدرس با خطا مواجه شد')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteAddress(id: number) {
    if (!token) {
      setError('نشست شما منقضی شده است. دوباره وارد شوید.')
      return
    }

    try {
      setDeletingId(id)
      setError('')
      setMessage('')
      await deleteAddress(token, id)
      setAddresses((current) => current.filter((item) => item.id !== id))
      setMessage('آدرس انتخاب‌شده حذف شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'حذف آدرس با خطا مواجه شد')
    } finally {
      setDeletingId(null)
    }
  }

  const canSubmit =
    draft.title.trim().length >= 2 &&
    draft.city.trim().length >= 2 &&
    draft.address.trim().length >= 8 &&
    Number.isFinite(draft.lat) &&
    Number.isFinite(draft.lng)

  if (loading) {
    return <section className="rounded-[32px] bg-white/75 px-6 py-12 text-center shadow-[0_14px_34px_rgba(52,36,17,0.06)]">در حال بارگذاری آدرس‌ها...</section>
  }

  if (error && !token) {
    return (
      <section className="rounded-[32px] border border-dashed border-[#d7b690] bg-white/75 px-6 py-12 text-center shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
        <h2 className="text-2xl font-black text-[#173126]">بخش آدرس‌ها در دسترس نیست</h2>
        <p className="mt-4 text-sm leading-7 text-[#6e6152]">{error}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link className="rounded-full bg-[#173126] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#29513f]" href="/">
            بازگشت به فروشگاه
          </Link>
        </div>
      </section>
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_360px]">
      <section className="rounded-[32px] bg-white/80 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black text-[#173126]">افزودن آدرس جدید</h2>
            <p className="mt-2 text-sm leading-7 text-[#6e6152]">
              اول موقعیت را روی نقشه مشخص کن، بعد عنوان و نشانی متنی را کامل کن تا برای سفارش‌های بعدی سریع‌تر انتخاب شود.
            </p>
          </div>
          <div className="rounded-[22px] bg-[#f6efe5] px-4 py-3 text-sm text-[#6e6152]">
            <span className="block text-xs font-bold text-[#92785a]">وضعیت نقشه</span>
            <strong className="mt-1 block text-base text-[#173126]">{reverseLoading ? 'در حال تشخیص آدرس...' : 'آماده انتخاب موقعیت'}</strong>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <StorefrontMapPicker value={{ lat: draft.lat, lng: draft.lng }} onChange={handleLocationChange} />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-bold text-[#173126]">عنوان آدرس</span>
              <input
                className="rounded-[22px] border border-[#1f6a52]/12 bg-[#fbf7f1] px-4 py-3 text-right text-sm text-[#173126] outline-none transition placeholder:text-[#9a8a79] focus:border-[#1f6a52]/35"
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="مثلاً خانه یا محل کار"
                value={draft.title}
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-bold text-[#173126]">شهر</span>
              <input
                className="rounded-[22px] border border-[#1f6a52]/12 bg-[#fbf7f1] px-4 py-3 text-right text-sm text-[#173126] outline-none transition placeholder:text-[#9a8a79] focus:border-[#1f6a52]/35"
                onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))}
                placeholder="مثلاً تهران"
                value={draft.city}
              />
            </label>

            <label className="grid gap-2 text-sm md:col-span-2">
              <span className="font-bold text-[#173126]">نشانی کامل</span>
              <textarea
                className="min-h-[116px] rounded-[22px] border border-[#1f6a52]/12 bg-[#fbf7f1] px-4 py-3 text-right text-sm leading-7 text-[#173126] outline-none transition placeholder:text-[#9a8a79] focus:border-[#1f6a52]/35"
                onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))}
                placeholder="خیابان، کوچه، پلاک، واحد و هر توضیح لازم برای تحویل دقیق"
                value={draft.address}
              />
            </label>

            <label className="flex items-center gap-3 rounded-[22px] bg-[#f9f4ec] px-4 py-4 text-sm text-[#173126] md:col-span-2">
              <input
                checked={draft.isDefault || false}
                className="h-4 w-4 accent-[#173126]"
                onChange={(event) => setDraft((current) => ({ ...current, isDefault: event.target.checked }))}
                type="checkbox"
              />
              این آدرس به‌عنوان آدرس پیش‌فرض ذخیره شود
            </label>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm font-bold text-[#b64b36]">{error}</p> : null}
        {message ? <p className="mt-4 text-sm font-bold text-[#1f6a52]">{message}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-[#173126] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#29513f] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={!canSubmit || submitting}
            onClick={handleCreateAddress}
            type="button"
          >
            {submitting ? 'در حال ثبت آدرس...' : 'ثبت آدرس'}
          </button>
          <Link className="rounded-full border border-[#1f6a52]/15 bg-white px-5 py-2.5 text-sm font-bold text-[#1f6a52] transition hover:bg-[#f8f2ea]" href="/account">
            بازگشت به پنل کاربری
          </Link>
        </div>
      </section>

      <aside className="grid gap-5">
        <section className="rounded-[32px] bg-white/80 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7e56]">Saved Addresses</span>
              <h3 className="mt-2 text-2xl font-black text-[#173126]">آدرس‌های ذخیره‌شده</h3>
            </div>
            <button
              className="rounded-full border border-[#1f6a52]/15 bg-white px-4 py-2 text-xs font-bold text-[#1f6a52] transition hover:bg-[#f8f2ea]"
              onClick={() => void loadAddresses()}
              type="button"
            >
              بروزرسانی
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {addresses.length ? (
              addresses.map((address) => (
                <article className="rounded-[24px] border border-[#1f6a52]/8 bg-[#fbf7f1] px-4 py-4" key={address.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-base text-[#173126]">{address.title}</strong>
                        {address.isDefault ? (
                          <span className="rounded-full bg-[#edf8f2] px-3 py-1 text-[11px] font-bold text-[#1f6a52]">پیش‌فرض</span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-[#6e6152]">{`${address.city} — ${address.address}`}</p>
                    </div>
                    <button
                      className="rounded-full border border-[#c97e6c]/20 bg-white px-3 py-1.5 text-xs font-bold text-[#b64b36] transition hover:bg-[#fff4f1] disabled:cursor-not-allowed disabled:opacity-55"
                      disabled={deletingId === address.id}
                      onClick={() => void handleDeleteAddress(address.id)}
                      type="button"
                    >
                      {deletingId === address.id ? '...' : 'حذف'}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-[#92785a]">
                    <span className="rounded-full bg-white px-3 py-1.5">{`Lat ${address.lat.toFixed(4)}`}</span>
                    <span className="rounded-full bg-white px-3 py-1.5">{`Lng ${address.lng.toFixed(4)}`}</span>
                    <span className="rounded-full bg-white px-3 py-1.5">{formatDate(address.createdAt)}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-[#dcc5a7] bg-[#fbf7f1] px-4 py-6 text-sm text-[#6e6152]">
                هنوز آدرسی برای این حساب ثبت نشده است.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[32px] bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(248,241,230,0.95))] px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
          <h3 className="text-xl font-black text-[#173126]">برای reuse در پنل فروشنده</h3>
          <div className="mt-4 grid gap-3 text-sm leading-7 text-[#6e6152]">
            <div className="rounded-[22px] bg-white/80 px-4 py-4">هسته‌ی انتخاب مختصات در `StorefrontMapPicker` جدا شده و می‌تواند عیناً در vendor هم استفاده شود.</div>
            <div className="rounded-[22px] bg-white/80 px-4 py-4">ارسال داده دقیقاً با DTO بک‌اند هماهنگ است: `title`، `city`، `address`، `lat`، `lng`، `isDefault`.</div>
          </div>
        </section>
      </aside>
    </div>
  )
}

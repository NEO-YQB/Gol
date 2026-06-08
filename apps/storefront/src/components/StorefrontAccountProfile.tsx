'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { completeProfile, getCurrentUser, readStoredToken, type StorefrontUser } from '../lib/storefrontAuth'

function formatDate(value?: string) {
  if (!value) return 'نامشخص'
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(value))
}

export function StorefrontAccountProfile() {
  const [user, setUser] = useState<(StorefrontUser & { createdAt?: string }) | null>(null)
  const [fullName, setFullName] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = readStoredToken()
    if (!token) {
      setError('برای مشاهده پروفایل باید وارد حساب کاربری شوی.')
      setLoading(false)
      return
    }

    getCurrentUser(token)
      .then((payload) => {
        setUser(payload)
        setFullName(payload.fullName || '')
        setNationalId(payload.nationalId || '')
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'دریافت اطلاعات پروفایل با خطا مواجه شد'))
      .finally(() => setLoading(false))
  }, [])

  const hasChanges = useMemo(() => {
    return fullName.trim() !== (user?.fullName || '').trim() || nationalId.trim() !== (user?.nationalId || '').trim()
  }, [fullName, nationalId, user])

  async function handleSave() {
    const token = readStoredToken()
    if (!token) {
      setError('نشست شما منقضی شده است. دوباره وارد شوید.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setMessage('')
      const payload = await completeProfile(token, fullName.trim(), nationalId.trim())
      setUser((current) => ({
        ...current,
        ...payload,
      }))
      setFullName(payload.fullName || '')
      setNationalId(payload.nationalId || '')
      setMessage('اطلاعات پروفایل با موفقیت ذخیره شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ذخیره اطلاعات با خطا مواجه شد')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <section className="rounded-[32px] bg-white/75 px-6 py-12 text-center shadow-[0_14px_34px_rgba(52,36,17,0.06)]">در حال بارگذاری پروفایل...</section>
  }

  if (error && !user) {
    return (
      <section className="rounded-[32px] border border-dashed border-[#d7b690] bg-white/75 px-6 py-12 text-center shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
        <h2 className="text-2xl font-black text-[#173126]">پروفایل در دسترس نیست</h2>
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
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_340px]">
      <section className="rounded-[32px] bg-white/80 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black text-[#173126]">اطلاعات حساب</h2>
            <p className="mt-2 text-sm leading-7 text-[#6e6152]">
              نام نمایشی حساب خودت را اینجا مدیریت کن. این نام در تجربه شخصی‌سازی‌شده و خوش‌آمدگویی‌ها استفاده می‌شود.
            </p>
          </div>
          <div className="rounded-[22px] bg-[#f6efe5] px-4 py-3 text-sm text-[#6e6152]">
            <span className="block text-xs font-bold text-[#92785a]">عضویت از</span>
            <strong className="mt-1 block text-base text-[#173126]">{formatDate(user?.createdAt)}</strong>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm md:col-span-2">
            <span className="font-bold text-[#173126]">نام و نام خانوادگی</span>
            <input
              className="rounded-[22px] border border-[#1f6a52]/12 bg-[#fbf7f1] px-4 py-3 text-right text-sm text-[#173126] outline-none transition placeholder:text-[#9a8a79] focus:border-[#1f6a52]/35"
              onChange={(event) => setFullName(event.target.value)}
              placeholder="مثلاً مریم احمدی"
              value={fullName}
            />
          </label>

          <label className="grid gap-2 text-sm md:col-span-2">
            <span className="font-bold text-[#173126]">کد ملی</span>
            <input
              className="rounded-[22px] border border-[#1f6a52]/12 bg-[#fbf7f1] px-4 py-3 text-left text-sm tracking-[0.28em] text-[#173126] outline-none transition placeholder:text-[#9a8a79] focus:border-[#1f6a52]/35"
              inputMode="numeric"
              maxLength={10}
              onChange={(event) => setNationalId(event.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="0012345678"
              value={nationalId}
            />
          </label>

          <div className="rounded-[24px] bg-[#f9f4ec] px-4 py-4" dir="ltr">
            <span className="block text-xs font-bold text-[#92785a]">شماره موبایل</span>
            <strong className="mt-1 block text-base text-[#173126]">{user?.phoneNumber || '-'}</strong>
          </div>

          <div className="rounded-[24px] bg-[#f9f4ec] px-4 py-4">
            <span className="block text-xs font-bold text-[#92785a]">وضعیت حساب</span>
            <strong className="mt-1 block text-base text-[#173126]">{user?.needsProfileCompletion ? 'نیازمند تکمیل' : 'تکمیل شده'}</strong>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm font-bold text-[#b64b36]">{error}</p> : null}
        {message ? <p className="mt-4 text-sm font-bold text-[#1f6a52]">{message}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-[#173126] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#29513f] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={saving || fullName.trim().length < 2 || !hasChanges}
            onClick={handleSave}
            type="button"
          >
            {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
          <Link className="rounded-full border border-[#1f6a52]/15 bg-white px-5 py-2.5 text-sm font-bold text-[#1f6a52] transition hover:bg-[#f8f2ea]" href="/account">
            بازگشت به پنل کاربری
          </Link>
        </div>
      </section>

      <aside className="grid gap-5">
        <section className="rounded-[32px] bg-white/80 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
          <h3 className="text-xl font-black text-[#173126]">راهنمای سریع</h3>
          <div className="mt-4 grid gap-3">
            {[
              'شماره موبایل از همین حساب احراز هویت گرفته می‌شود و فعلاً قابل تغییر نیست.',
              'اگر نامت را وارد کنی، در منو و بخش‌های خوش‌آمدگویی با همان نام نمایش داده می‌شود.',
              'برای دیدن سفارش‌ها و آدرس‌ها از پنل کاربری اصلی استفاده کن.',
            ].map((item) => (
              <div className="rounded-[22px] bg-[#fbf7f1] px-4 py-4 text-sm leading-7 text-[#6e6152]" key={item}>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(248,241,230,0.95))] px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
          <h3 className="text-xl font-black text-[#173126]">می‌خواهی بعدی چه باشد؟</h3>
          <div className="mt-4 grid gap-3">
            <Link className="rounded-[22px] border border-[#1f6a52]/10 bg-white/80 px-4 py-4 text-sm font-bold text-[#173126] transition hover:-translate-y-0.5" href="/account">
              مشاهده خلاصه حساب
            </Link>
            <Link className="rounded-[22px] border border-[#1f6a52]/10 bg-white/80 px-4 py-4 text-sm font-bold text-[#173126] transition hover:-translate-y-0.5" href="/account/addresses">
              مدیریت آدرس‌ها
            </Link>
            <Link className="rounded-[22px] border border-[#1f6a52]/10 bg-white/80 px-4 py-4 text-sm font-bold text-[#173126] transition hover:-translate-y-0.5" href="/account/wallet">
              رفتن به کیف پول
            </Link>
          </div>
        </section>
      </aside>
    </div>
  )
}

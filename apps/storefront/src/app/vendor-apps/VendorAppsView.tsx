'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { VENDOR_APP_CONFIG } from './vendorAppConfig'

// --- SVG Icons ---

function AppleLogoIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 170 170">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-5.77-8.8-10.29-18.78-13.56-29.93-3.26-11.16-4.9-21.72-4.9-31.69 0-14.35 3.73-26.31 11.19-35.89 7.46-9.58 16.74-14.48 27.85-14.71 5.01 0 10.36 1.34 16.06 4.02 5.7 2.68 9.53 4.07 11.48 4.18 1.48-.11 5.39-1.55 11.72-4.33 6.33-2.77 11.77-4.05 16.32-3.83 12.38.64 22.33 5.43 29.86 14.38-10.87 6.63-16.19 15.54-15.96 26.74.22 9.46 3.86 17.38 10.92 23.76 7.07 6.38 15.42 10.02 25.07 10.93-2.28 6.96-4.89 13.7-7.83 20.21zM119.22 33.64c0-7.07 2.6-13.82 7.8-20.25 5.2-6.43 11.74-10.87 19.62-13.39-.22 1.3-.43 2.61-.65 3.91-.87 6.96-3.69 13.59-8.48 19.89-4.78 6.3-11.19 10.43-19.24 12.4-.33-.87-.66-1.74-1.05-2.56z" />
    </svg>
  )
}

function GooglePlayIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 512 512">
      <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z" fill="#EA4335" />
      <path d="M47 38.3C40 46.2 36 57.7 36 71.7v368.6c0 14 4 25.5 11 33.4l2.1 2.1 206.5-206.5v-4.9L49.1 36.2l-2.1 2.1z" fill="#4285F4" />
      <path d="M325.4 277.7l60.1 60.1L104.6 499l220.8-221.3z" fill="#34A853" />
      <path d="M449.8 238.4l-64.3-37-60.1 60.1 60.1 60.1 64.3-37c18.5-10.6 18.5-27.9 0-38.5z" fill="#FBBC04" />
    </svg>
  )
}

function BazaarIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 48 48">
      <defs>
        <linearGradient id="bazaarGrad" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#25D366" />
          <stop offset="100%" stopColor="#0EA94D" />
        </linearGradient>
      </defs>
      <rect fill="url(#bazaarGrad)" height="48" rx="12" width="48" />
      <path
        d="M14 18h20l-2.2 17.5c-.2 1.5-1.5 2.5-3 2.5h-9.6c-1.5 0-2.8-1-3-2.5L14 18z"
        fill="#FFFFFF"
      />
      <path
        d="M20 18v-3.5c0-2.2 1.8-4 4-4s4 1.8 4 4V18"
        fill="none"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <circle cx="24" cy="27" fill="#0EA94D" r="3" />
    </svg>
  )
}

function AndroidIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-4.84l1.3-1.3c.2-.2.2-.51 0-.71a.495.495 0 00-.71 0l-1.48 1.48C13.68 2.23 12.87 2 12 2c-.87 0-1.68.23-2.64.63L7.88.75a.495.495 0 00-.71 0c-.2.2-.2.51 0 .71l1.3 1.3C6.44 3.99 5 5.86 5 8h14c0-2.14-1.44-4.01-3.47-5.16zM9 6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
    </svg>
  )
}

function ArrowDownIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
      <path d="M19 14l-7 7m0 0l-7-7m7 7V3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExternalArrowIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
      <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SafariIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <circle cx="12" cy="12" fill="#007AFF" r="11" />
      <circle cx="12" cy="12" fill="none" r="10" stroke="#FFFFFF" strokeWidth="1.2" />
      <polygon fill="#FF3B30" points="16,8 11.5,12.5 12.5,11.5 8,16" />
      <polygon fill="#FFFFFF" points="8,16 12.5,11.5 11.5,12.5 16,8" />
      <polygon fill="#FF3B30" points="16,8 13.5,13.5 12,12" />
      <polygon fill="#FFFFFF" points="8,16 10.5,10.5 12,12" />
    </svg>
  )
}

export function VendorAppsView() {
  const [copied, setCopied] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? window.location.href : 'https://golino.shop/vendor-apps'
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#faf6ef] text-[#173126] font-yekan selection:bg-[#1f6a52] selection:text-white">
      {/* --- Ambient Glowing Spheres (Animated Background) --- */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="animate-float-slow absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-[#1f6a52]/20 via-[#2d9172]/15 to-transparent blur-3xl"
        />
        <div
          className="animate-float-reverse absolute top-1/3 -left-28 h-[450px] w-[450px] rounded-full bg-gradient-to-tr from-[#d07460]/20 via-[#e28b78]/15 to-transparent blur-3xl"
        />
        <div
          className="animate-pulse-glow absolute -bottom-20 right-1/4 h-80 w-80 rounded-full bg-gradient-to-tl from-[#eab308]/15 via-[#1f6a52]/10 to-transparent blur-3xl"
        />
        {/* Subtle grid mesh overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(#173126 1px, transparent 1px), radial-gradient(#173126 1px, #faf6ef 1px)',
            backgroundSize: '36px 36px',
          }}
        />
      </div>

      {/* --- Top Navigation Header (Glass) --- */}
      <header className="relative z-20 mx-auto max-w-5xl px-4 pt-6 md:px-8">
        <div className="glass-pill flex items-center justify-between rounded-full px-5 py-3 shadow-[0_10px_30px_rgba(23,49,38,0.06)]">
          <Link
            className="flex items-center gap-3 transition-opacity hover:opacity-85"
            href="/"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#1f6a52] to-[#173126] text-white shadow-md">
              <span className="text-lg font-black leading-none">گ</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-wide text-[#173126] md:text-base">
                گلینو | پنل فروشندگان
              </span>
              <span className="text-[11px] font-medium text-[#1f6a52]">
                Golino Seller Network
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              className="glass-pill flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-[#1f6a52] transition-all hover:bg-white hover:shadow-sm active:scale-95"
              onClick={handleCopyLink}
              title="کپی لینک این صفحه برای اشتراک‌گذاری"
              type="button"
            >
              {copied ? (
                <>
                  <span className="text-emerald-600">✓</span>
                  <span>کپی شد!</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>کپی لینک</span>
                </>
              )}
            </button>

            <Link
              className="hidden rounded-full border border-black/5 bg-black/5 px-3.5 py-1.5 text-xs font-bold text-[#173126] transition-colors hover:bg-black/10 sm:inline-flex"
              href="/"
            >
              بازگشت به سایت
            </Link>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-14">
        {/* --- Hero Section --- */}
        <section className="text-center">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-50/80 px-4 py-1.5 shadow-sm backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-emerald-800">
              دانلود و دسترسی به نسخه فروشندگان گلینو
            </span>
            <span className="text-[10px] rounded-md bg-emerald-700/10 px-1.5 py-0.5 font-bold text-emerald-800">
              {VENDOR_APP_CONFIG.meta.version}
            </span>
          </div>

          <h1 className="mt-5 text-2xl font-black leading-tight text-[#173126] sm:text-3xl md:text-4xl">
            نرم‌افزار مدیریت فروشگاه و سفارش‌ها
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-[#51635b] sm:text-base">
            سفارش‌های جدید را در لحظه دریافت کنید، موجودی و قیمت گل‌ها را تغییر دهید و حساب کاربری فروشگاه خود را از هر کجا مدیریت کنید.
          </p>
        </section>

        {/* --- 4 Download Options (Glass Cards Grid) --- */}
        <section className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6">
          {/* 1. Cafe Bazaar Card */}
          <div className="glass-card glass-card-hover group relative flex flex-col justify-between overflow-hidden rounded-[28px] p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10b981]/15 to-[#059669]/10 p-2 shadow-inner">
                  <BazaarIcon className="h-10 w-10 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-[#173126]">کافه بازار</h2>
                    <span className="rounded-full bg-emerald-100/90 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                      اندروید
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#86958e]">Cafe Bazaar</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs font-medium leading-relaxed text-[#4b5d55]">
              نصب آسان با به‌روزرسانی خودکار و سریع‌ترین دانلود از محبوب‌ترین مارکت اندروید ایران.
            </p>

            <div className="mt-6">
              <a
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0ea94d] to-[#10b981] px-5 py-3.5 text-xs font-black text-white shadow-[0_12px_24px_rgba(14,169,77,0.25)] transition-all duration-300 hover:brightness-105 hover:shadow-[0_16px_32px_rgba(14,169,77,0.35)] active:scale-[0.98]"
                href={VENDOR_APP_CONFIG.links.bazaar}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span>دریافت از کافه بازار</span>
                <ExternalArrowIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* 2. Google Play Card */}
          <div className="glass-card glass-card-hover group relative flex flex-col justify-between overflow-hidden rounded-[28px] p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 via-emerald-500/10 to-amber-500/10 p-2.5 shadow-inner">
                  <GooglePlayIcon className="h-9 w-9 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-[#173126]">گوگل پلی</h2>
                    <span className="rounded-full bg-blue-100/90 px-2.5 py-0.5 text-[10px] font-black text-blue-800">
                      نسخه جهانی
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#86958e]">Google Play Store</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs font-medium leading-relaxed text-[#4b5d55]">
              دانلود استاندارد و رسمی با تأییدیه امنیتی Google Play Protect برای تمام دستگاه‌های اندرویدی.
            </p>

            <div className="mt-6">
              <a
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1f2937] px-5 py-3.5 text-xs font-black text-white shadow-[0_12px_24px_rgba(31,41,55,0.22)] transition-all duration-300 hover:bg-[#111827] hover:shadow-[0_16px_30px_rgba(31,41,55,0.32)] active:scale-[0.98]"
                href={VENDOR_APP_CONFIG.links.googlePlay}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span>مشاهده در Google Play</span>
                <ExternalArrowIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* 3. iOS Web App (PWA) Card */}
          <div className="glass-card glass-card-hover group relative flex flex-col justify-between overflow-hidden rounded-[28px] p-6 border-amber-200/40">
            {/* Top highlight ribbon */}
            <div className="absolute top-0 right-0 rounded-bl-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1 text-[10px] font-black text-white shadow-sm">
              پیشنهادی آیفون و آیپد
            </div>

            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black text-white p-2.5 shadow-md">
                    <AppleLogoIcon className="h-8 w-8 text-white transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-[#173126]">نسخه iOS</h2>
                      <span className="rounded-full bg-amber-100/90 px-2.5 py-0.5 text-[10px] font-black text-amber-900">
                        وب‌اپ PWA
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-[#86958e]">Apple iPhone & iPad</span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs font-medium leading-relaxed text-[#4b5d55]">
                اجرای بدون تحریم در مرورگر Safari با ظاهر کاملاً مشابه اپ بومی و قابلیت افزودن به صفحه اصلی.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <a
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#173126] to-[#1f6a52] px-5 py-3.5 text-xs font-black text-white shadow-[0_12px_24px_rgba(23,49,38,0.25)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_16px_32px_rgba(31,106,82,0.35)] active:scale-[0.98]"
                href={VENDOR_APP_CONFIG.links.iosWebApp}
                rel="noopener noreferrer"
                target="_blank"
              >
                <SafariIcon className="h-4 w-4" />
                <span>ورود به وب‌اپلیکیشن iOS</span>
                <ExternalArrowIcon className="h-4 w-4" />
              </a>

              <button
                className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-[#1f6a52] hover:text-[#173126] transition-colors"
                onClick={() => setShowIosGuide(!showIosGuide)}
                type="button"
              >
                <span>{showIosGuide ? 'بستن راهنمای آیفون' : 'راهنمای ۳ ثانیه‌ای افزودن به صفحه اصلی (Add to Home)'}</span>
                <span className={`transform transition-transform text-xs ${showIosGuide ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {/* Collapsible iOS Guide */}
              {showIosGuide && (
                <div className="mt-2 rounded-2xl bg-white/80 p-3.5 text-[11px] text-[#2c3d35] shadow-inner space-y-2 border border-black/5 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1f6a52] text-[10px] font-black text-white">۱</span>
                    <span>آدرس <code className="font-bold text-[#1f6a52] dir-ltr">ios.golino.shop</code> را در مرورگر <b>Safari</b> باز کنید.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1f6a52] text-[10px] font-black text-white">۲</span>
                    <span>روی آیکون اشتراک‌گذاری <b>Share</b> (مربع با فلش رو به بالا) بزنید.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1f6a52] text-[10px] font-black text-white">۳</span>
                    <span>گزینه <b>«Add to Home Screen»</b> را انتخاب کنید تا آیکون به گوشی اضافه شود.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. Direct APK Download Card */}
          <div className="glass-card glass-card-hover group relative flex flex-col justify-between overflow-hidden rounded-[28px] p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#3DDC84]/15 p-2.5 text-[#248950] shadow-inner">
                  <AndroidIcon className="h-9 w-9 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-[#173126]">دانلود مستقیم APK</h2>
                    <span className="rounded-full bg-emerald-100/90 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                      فایل نصبی
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#86958e]">Direct Download</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs font-medium leading-relaxed text-[#4b5d55]">
              دریافت مستقیم فایل خام نصبی (APK) بدون نیاز به مارکت با لینک پرسرعت داخلی.
            </p>

            <div className="mt-6">
              <a
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#1f6a52]/20 bg-white/90 px-5 py-3.5 text-xs font-black text-[#173126] shadow-sm transition-all duration-300 hover:border-[#1f6a52]/40 hover:bg-white hover:shadow-md active:scale-[0.98]"
                download
                href={VENDOR_APP_CONFIG.links.directApk}
              >
                <ArrowDownIcon className="h-4 w-4 text-[#1f6a52]" />
                <span>دانلود مستقیم فایل نصبی (APK)</span>
              </a>
            </div>
          </div>
        </section>

        {/* --- QR Code & Vendor Help Card --- */}
        <section className="mt-10">
          <div className="glass-card rounded-[30px] p-6 md:p-8">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-md text-center md:text-right">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1f6a52]/10 px-3 py-1 text-xs font-bold text-[#1f6a52]">
                  <span>⚡</span>
                  <span>دسترسی همیشگی فروشندگان</span>
                </div>
                <h3 className="mt-3 text-lg font-black text-[#173126] md:text-xl">
                  اشتراک‌گذاری و اسکن آسان
                </h3>
                <p className="mt-2 text-xs font-medium leading-relaxed text-[#51635b]">
                  این صفحه را برای همکاران فروشگاه خود ارسال کنید یا از طریق اسکن بارکد در موبایل، اپلیکیشن را بدون معطلی دریافت نمایید.
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <button
                    className="flex items-center gap-2 rounded-xl bg-[#1f6a52] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#173126] active:scale-95"
                    onClick={handleCopyLink}
                    type="button"
                  >
                    <span>{copied ? 'آدرس کپی شد ✓' : 'کپی آدرس صفحه'}</span>
                  </button>
                  <a
                    className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white/70 px-4 py-2 text-xs font-bold text-[#173126] transition-colors hover:bg-white"
                    href="https://golino.shop"
                  >
                    <span>مشاهده سایت اصلی گلینو</span>
                  </a>
                </div>
              </div>

              {/* QR Code Graphic Box */}
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-md">
                {/* Real-time Dynamic QR Code using standard svg */}
                <img
                  alt="QR Code گلینو برای دانلود اپلیکیشن"
                  className="h-32 w-32 rounded-lg object-contain"
                  height="128"
                  src="https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=https%3A%2F%2Fgolino.shop%2Fvendor-apps&color=173126&bgcolor=ffffff&margin=1"
                  width="128"
                />
                <span className="text-[11px] font-bold text-[#1f6a52]">
                  اسکن با دوربین گوشی
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* --- Minimal Footer --- */}
        <footer className="mt-12 text-center text-xs font-medium text-[#7a8c83]">
          <p>تمامی حقوق برای بازار گل و گیاه <b>گلینو</b> محفوظ است.</p>
          <p className="mt-1 text-[11px] text-[#9bb0a5]">نسخه اختصاصی فروشندگان و تأمین‌کنندگان گل و گیاه</p>
        </footer>
      </main>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { storefrontShared } from './storefrontShared'

export function StorefrontPaymentThankYouPage() {
  const searchParams = useSearchParams()
  const status = (searchParams?.get('status') || '').toUpperCase()
  const authority = searchParams?.get('authority') || ''
  const orderId = searchParams?.get('orderId') || ''
  const refId = searchParams?.get('refId') || ''
  const message = searchParams?.get('message') || ''

  const isSuccess = status === 'PAID' || status === 'OK' || status === 'SUCCESS'

  return (
    <section className={storefrontShared.emptyState}>
      <div className={`mx-auto w-full max-w-[760px] rounded-[34px] px-6 py-8 shadow-[0_18px_40px_rgba(52,36,17,0.08)] ${isSuccess ? 'bg-[linear-gradient(180deg,rgba(237,248,242,0.96),rgba(248,252,249,0.98))]' : 'bg-[linear-gradient(180deg,rgba(255,244,241,0.96),rgba(255,250,248,0.98))]'}`}>
        <h1 className={`text-3xl font-black ${isSuccess ? 'text-[#173126]' : 'text-[#8f4532]'}`}>
          {isSuccess ? 'پرداخت شما با موفقیت ثبت شد' : 'پرداخت کامل نشد'}
        </h1>
        <p className="mt-4 text-sm leading-8 text-[#6e6152]">
          {message || (isSuccess ? 'سفارش شما ثبت شده و نتیجه پرداخت با موفقیت از زرین‌پال دریافت شد.' : 'ممکن است پرداخت لغو شده باشد یا از سمت درگاه تایید نهایی دریافت نشده باشد.')}
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] bg-white/80 px-4 py-4">
            <span className="block text-xs font-bold text-[#92785a]">شماره سفارش</span>
            <strong className="mt-1 block text-base text-[#173126]">{orderId || '—'}</strong>
          </div>
          <div className="rounded-[22px] bg-white/80 px-4 py-4">
            <span className="block text-xs font-bold text-[#92785a]">Authority</span>
            <strong className="mt-1 block text-base text-[#173126]">{authority || '—'}</strong>
          </div>
          <div className="rounded-[22px] bg-white/80 px-4 py-4">
            <span className="block text-xs font-bold text-[#92785a]">Ref ID</span>
            <strong className="mt-1 block text-base text-[#173126]">{refId || '—'}</strong>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link className="rounded-full bg-[#173126] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#29513f]" href="/account">
            رفتن به حساب کاربری
          </Link>
          <Link className="rounded-full border border-[#1f6a52]/15 bg-white px-5 py-2.5 text-sm font-bold text-[#173126]" href="/shop">
            بازگشت به فروشگاه
          </Link>
        </div>
      </div>
    </section>
  )
}

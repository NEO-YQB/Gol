import Link from 'next/link'

export function StorefrontNotFoundPage() {
  return (
    <section className="relative overflow-hidden rounded-[40px] border border-white/55 bg-[linear-gradient(180deg,rgba(248,252,249,0.82),rgba(255,255,255,0.72))] px-6 py-10 shadow-[0_24px_70px_rgba(44,32,19,0.12)] backdrop-blur-[22px] md:px-10 md:py-12">
      <div className="absolute left-[-60px] top-[-60px] h-44 w-44 rounded-full bg-[#d06c54]/18 blur-3xl" />
      <div className="absolute bottom-[-50px] right-[-30px] h-40 w-40 rounded-full bg-[#1f6a52]/16 blur-3xl" />

      <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
        <div>
          <span className="inline-flex rounded-full border border-[#1f6a52]/10 bg-white/75 px-4 py-2 text-sm font-bold text-[#1f6a52]">
            خطای ۴۰۴
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.8] text-[#173126] md:text-[3.2rem]">
            صفحه‌ای که دنبالش بودی پیدا نشد
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-[#5f564c] md:text-base">
            ممکن است آدرس اشتباه وارد شده باشد، صفحه جابه‌جا شده باشد یا محتوای موردنظر دیگر در دسترس نباشد.
            از مسیرهای زیر می‌توانی دوباره ادامه بدهی.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-full bg-[#173126] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#29513f]" href="/">
              بازگشت به خانه
            </Link>
            <Link className="rounded-full border border-[#1f6a52]/12 bg-white/85 px-5 py-2.5 text-sm font-bold text-[#173126] transition hover:bg-white" href="/shop">
              رفتن به فروشگاه
            </Link>
            <Link className="rounded-full border border-[#1f6a52]/12 bg-white/85 px-5 py-2.5 text-sm font-bold text-[#173126] transition hover:bg-white" href="/mag">
              رفتن به مجله
            </Link>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/65 bg-white/58 p-6 shadow-[0_16px_40px_rgba(34,48,42,0.07)] backdrop-blur-[18px]">
          <div className="rounded-[28px] bg-[linear-gradient(135deg,#173126_0%,#29513f_56%,#d06c54_100%)] px-6 py-8 text-white shadow-[0_14px_34px_rgba(31,41,30,0.18)]">
            <div className="text-[4.2rem] font-black leading-none">404</div>
            <p className="mt-4 text-sm leading-7 text-white/84">
              اگر از لینک داخلی به این صفحه رسیده‌ای، احتمالاً آن مسیر نیاز به بازبینی دارد.
            </p>
          </div>

          <div className="mt-5 space-y-3 text-sm leading-8 text-[#5f564c]">
            <p>
              <strong className="text-[#173126]">پیشنهاد:</strong> از منوی بالا وارد فروشگاه، مجله یا حساب کاربری شو.
            </p>
            <p>
              <strong className="text-[#173126]">اگر دنبال مقاله یا محصول خاصی هستی:</strong> از جست‌وجو یا دسته‌بندی‌ها استفاده کن.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

import { StorefrontAccountShell } from '../../components/StorefrontAccountShell'

export default function AccountPage() {
  return (
    <StorefrontAccountShell
      title="پنل کاربری"
      description="مرکز مدیریت تجربه خرید شما در گلینو؛ از پیگیری سفارش‌ها تا کیف پول، آدرس‌ها، علاقه‌مندی‌ها و پیشنهادهای شخصی‌سازی‌شده."
    >
      <section className="mb-8 overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#173126_0%,#29513f_52%,#d06c54_100%)] px-6 py-7 text-white shadow-[0_24px_55px_rgba(31,41,30,0.18)] md:px-8 md:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-[0.24em] text-white/90">
              GOLINO ACCOUNT
            </span>
            <h2 className="mt-4 text-3xl font-black leading-tight md:text-4xl">همه‌چیز برای مدیریت یک خرید بی‌دردسر، در یک نگاه</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/82 md:text-base">
              از وضعیت سفارش‌های باز گرفته تا اعتبار هدیه، آدرس‌های منتخب، یادآوری مناسبت‌ها و پیشنهادهای مخصوص سلیقه شما؛ این پنل قرار است نقطه شروع تجربه شخصی گلینو باشد.
            </p>
          </div>
          <div className="grid min-w-[280px] gap-3 rounded-[28px] border border-white/12 bg-white/10 p-4 backdrop-blur-xl">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'سفارش‌های فعال', value: '۲', hint: 'در حال آماده‌سازی' },
                { label: 'اعتبار کیف پول', value: '۴۸۰٬۰۰۰', hint: 'تومان' },
                { label: 'آدرس‌های ذخیره‌شده', value: '۳', hint: 'خانه، محل کار، هدیه' },
                { label: 'مناسبت‌های آینده', value: '۵', hint: 'یادآوری‌های فعال' },
              ].map((item) => (
                <div className="rounded-[22px] border border-white/10 bg-black/10 px-4 py-4" key={item.label}>
                  <span className="block text-[11px] font-bold text-white/70">{item.label}</span>
                  <strong className="mt-2 block text-2xl font-black">{item.value}</strong>
                  <span className="mt-1 block text-xs text-white/72">{item.hint}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="rounded-[34px] bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(246,238,227,0.95))] px-6 py-7 shadow-[0_18px_50px_rgba(40,29,12,0.08)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#9f7e56]">Quick Actions</span>
              <h3 className="mt-2 text-2xl font-black text-[#173126]">دسترسی‌های سریع و مهم</h3>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              { title: 'سفارش‌های من', description: 'پیگیری سفارش‌های اخیر، زمان‌بندی ارسال و تاریخچه خریدها.', cta: 'مشاهده سفارش‌ها' },
              { title: 'دفترچه آدرس‌ها', description: 'مدیریت آدرس‌های خانه، محل کار و آدرس‌های مناسب هدیه.', cta: 'مدیریت آدرس‌ها' },
              { title: 'کیف پول و اعتبار', description: 'بررسی مانده اعتبار، کد هدیه و تراکنش‌های حساب.', cta: 'ورود به کیف پول' },
              { title: 'علاقه‌مندی‌ها', description: 'محصولات ذخیره‌شده برای خرید بعدی یا مناسب مناسبت‌های خاص.', cta: 'مشاهده علاقه‌مندی‌ها' },
              { title: 'یادآوری مناسبت‌ها', description: 'تولدها، سالگردها و برنامه‌ریزی خرید قبل از موعد.', cta: 'تنظیم یادآوری' },
              { title: 'پشتیبانی سریع', description: 'اگر سفارشی نیاز به پیگیری داشت، سریع از اینجا اقدام کن.', cta: 'ثبت درخواست' },
            ].map((item) => (
              <article className="rounded-[28px] border border-[#1f6a52]/10 bg-white/72 p-5 shadow-[0_10px_26px_rgba(52,36,17,0.05)]" key={item.title}>
                <h4 className="text-lg font-black text-[#173126]">{item.title}</h4>
                <p className="mt-3 text-sm leading-7 text-[#6e6152]">{item.description}</p>
                <button className="mt-5 inline-flex items-center rounded-full border border-[#1f6a52]/12 bg-[#f6efe5] px-4 py-2 text-sm font-black text-[#1f6a52]" type="button">
                  {item.cta}
                </button>
              </article>
            ))}
          </div>
        </div>

        <aside className="grid gap-5">
          <section className="rounded-[34px] bg-white/75 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#9f7e56]">Loyalty</span>
            <h3 className="mt-2 text-2xl font-black text-[#173126]">سطح وفاداری شما</h3>
            <div className="mt-5 rounded-[24px] bg-[linear-gradient(135deg,#f6eadc,#fff7ef)] p-5">
              <strong className="block text-xl font-black text-[#173126]">سطح رزگلد</strong>
              <p className="mt-3 text-sm leading-7 text-[#6e6152]">با یک خرید دیگر، به مزایای ارسال ویژه و پیشنهادهای شخصی‌سازی‌شده بیشتری می‌رسی.</p>
              <div className="mt-4 h-3 rounded-full bg-white">
                <div className="h-3 w-[68%] rounded-full bg-[linear-gradient(90deg,#1f6a52,#d06c54)]" />
              </div>
              <span className="mt-3 block text-xs font-bold text-[#8a7357]">۶۸٪ مسیر تا سطح بعدی</span>
            </div>
          </section>

          <section className="rounded-[34px] bg-white/75 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#9f7e56]">Suggestions</span>
            <h3 className="mt-2 text-2xl font-black text-[#173126]">پیشنهادهای هوشمند</h3>
            <div className="mt-5 grid gap-3">
              {[
                'برای سالگردهای نزدیک، یادآوری خرید ۳ روز زودتر فعال کن.',
                'یک آدرس هدیه جدید برای ارسال‌های شرکتی ذخیره کن.',
                'موجودی کیف پولت را برای خریدهای فوری بعدی شارژ نگه دار.',
              ].map((item) => (
                <div className="rounded-[22px] border border-[#1f6a52]/8 bg-[#f9f4ec] px-4 py-4 text-sm leading-7 text-[#5f5448]" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-[34px] bg-white/75 px-6 py-7 shadow-[0_16px_36px_rgba(52,36,17,0.06)]">
          <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#9f7e56]">Recent Orders</span>
          <h3 className="mt-2 text-2xl font-black text-[#173126]">آخرین سفارش‌ها</h3>
          <div className="mt-6 grid gap-4">
            {[
              { title: 'دسته‌گل رز سفید و شامپاینی', status: 'در حال آماده‌سازی', eta: 'امروز، ۱۸:۰۰ تا ۲۰:۰۰', amount: '۱٬۸۵۰٬۰۰۰ تومان' },
              { title: 'باکس هدیه مینیمال برای تولد', status: 'تحویل داده شده', eta: 'سه‌شنبه، ۱۴ خرداد', amount: '۲٬۳۹۰٬۰۰۰ تومان' },
              { title: 'گل رومیزی جلسه رسمی', status: 'در انتظار زمان‌بندی', eta: 'انتخاب بازه ارسال', amount: '۹۸۰٬۰۰۰ تومان' },
            ].map((order) => (
              <article className="flex flex-col gap-4 rounded-[28px] border border-[#1f6a52]/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,242,233,0.92))] p-5 md:flex-row md:items-center md:justify-between" key={order.title}>
                <div className="min-w-0">
                  <h4 className="text-lg font-black text-[#173126]">{order.title}</h4>
                  <p className="mt-2 text-sm leading-7 text-[#6e6152]">{order.eta}</p>
                </div>
                <div className="flex flex-col items-start gap-2 text-sm md:items-end">
                  <span className="inline-flex rounded-full border border-[#1f6a52]/10 bg-[#edf8f2] px-3 py-1.5 font-bold text-[#1f6a52]">{order.status}</span>
                  <strong className="text-base text-[#173126]">{order.amount}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[34px] bg-white/75 px-6 py-7 shadow-[0_16px_36px_rgba(52,36,17,0.06)]">
          <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#9f7e56]">Timeline</span>
          <h3 className="mt-2 text-2xl font-black text-[#173126]">برنامه شخصی شما</h3>
          <div className="mt-6 grid gap-4">
            {[
              { day: 'فردا', title: 'یادآوری خرید برای سالگرد', note: 'پیشنهاد می‌کنیم یک دسته‌گل کلاسیک رز رزرو کنی.' },
              { day: '۳ روز دیگر', title: 'استفاده از اعتبار هدیه', note: 'یک اعتبار ۱۵۰٬۰۰۰ تومانی تا پایان هفته فعال است.' },
              { day: 'هفته آینده', title: 'بازبینی آدرس هدیه شرکتی', note: 'برای ارسال‌های سریع، آدرس دفتر را تکمیل نگه دار.' },
            ].map((item) => (
              <article className="relative rounded-[26px] border border-[#e7dccb] bg-[#fbf7f1] px-5 py-5" key={`${item.day}-${item.title}`}>
                <span className="text-xs font-bold text-[#9f7e56]">{item.day}</span>
                <h4 className="mt-2 text-lg font-black text-[#173126]">{item.title}</h4>
                <p className="mt-2 text-sm leading-7 text-[#6e6152]">{item.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {[
          {
            title: 'دفترچه هدیه',
            description: 'مخاطب‌های ثابت، سلیقه رنگی و پیام‌های آماده برای ارسال‌های بعدی را اینجا نگه دار.',
          },
          {
            title: 'ترجیحات خرید',
            description: 'سبک گل‌آرایی، رنج قیمت دلخواه و مناسبت‌های مهم را ذخیره کن تا پیشنهادها بهتر شوند.',
          },
          {
            title: 'اعلان‌ها و پیگیری‌ها',
            description: 'زمان ارسال، تغییر وضعیت سفارش و یادآوری مناسبت‌ها را شخصی‌سازی کن.',
          },
        ].map((item) => (
          <section className="rounded-[34px] border border-[#1f6a52]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,239,228,0.9))] px-6 py-6 shadow-[0_12px_30px_rgba(52,36,17,0.05)]" key={item.title}>
            <h3 className="text-xl font-black text-[#173126]">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[#6e6152]">{item.description}</p>
          </section>
        ))}
      </section>
    </StorefrontAccountShell>
  )
}

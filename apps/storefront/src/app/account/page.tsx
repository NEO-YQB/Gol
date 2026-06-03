import { StorefrontAccountShell } from '../../components/StorefrontAccountShell'

export default function AccountPage() {
  return (
    <StorefrontAccountShell
      title="پنل کاربری"
      description="از اینجا به‌مرور سفارش‌ها، اطلاعات حساب، کیف پول و آدرس‌های شما دسترسی می‌دهیم."
    >
      <section className="rounded-[34px] border border-[#1f6a52]/10 bg-white/70 px-6 py-10 shadow-[0_10px_30px_rgba(52,36,17,0.08)]">
        <h2 className="text-2xl font-black text-[#173126]">خوش آمدی به حساب کاربری گلینو</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6e6152]">
          این صفحه به‌عنوان نقطه شروع داشبورد کاربر ساخته شده و در ادامه بخش‌های سفارش‌ها، آدرس‌ها، علاقه‌مندی‌ها و کیف پول به آن اضافه می‌شود.
        </p>
      </section>
    </StorefrontAccountShell>
  )
}

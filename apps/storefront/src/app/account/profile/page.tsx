import { StorefrontAccountShell } from '../../../components/StorefrontAccountShell'

export default function AccountProfilePage() {
  return (
    <StorefrontAccountShell
      title="اطلاعات کاربری"
      description="در این بخش اطلاعات پایه‌ی حساب شما نمایش داده می‌شود و بعداً قابلیت ویرایش کامل هم اضافه می‌شود."
    >
      <section className="rounded-[34px] border border-[#1f6a52]/10 bg-white/70 px-6 py-10 shadow-[0_10px_30px_rgba(52,36,17,0.08)]">
        <p className="text-sm leading-7 text-[#6e6152]">جزئیات پروفایل کاربر در مرحله بعدی کامل می‌شود.</p>
      </section>
    </StorefrontAccountShell>
  )
}

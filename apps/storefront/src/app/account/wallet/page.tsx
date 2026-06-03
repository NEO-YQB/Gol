import { StorefrontAccountShell } from '../../../components/StorefrontAccountShell'

export default function AccountWalletPage() {
  return (
    <StorefrontAccountShell
      title="کیف پول"
      description="گردش حساب، اعتبار هدیه و موجودی کیف پول شما در این بخش نمایش داده خواهد شد."
    >
      <section className="rounded-[34px] border border-[#1f6a52]/10 bg-white/70 px-6 py-10 shadow-[0_10px_30px_rgba(52,36,17,0.08)]">
        <p className="text-sm leading-7 text-[#6e6152]">بخش کیف پول به‌زودی به داده‌های واقعی متصل می‌شود.</p>
      </section>
    </StorefrontAccountShell>
  )
}

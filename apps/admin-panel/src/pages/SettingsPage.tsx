import { SectionCard } from '@flower-marketplace/frontend-core'

type SettingsPageProps = {
  onOpenSmsWorkspace: () => void
  onOpenPaymentGatewayWorkspace: () => void
}

export function SettingsPage({ onOpenSmsWorkspace, onOpenPaymentGatewayWorkspace }: SettingsPageProps) {
  return (
    <div className="space-y-6">
      <SectionCard eyebrow="settings hub" title="تنظیمات سراسری" description="هر integration را داخل workspace اختصاصی خودش مدیریت کن.">
        <div className="grid gap-4 md:grid-cols-2">
          <button className="fm-button" onClick={onOpenSmsWorkspace} type="button">
            ورود به workspace پیامکی
          </button>
          <button className="fm-button" onClick={onOpenPaymentGatewayWorkspace} type="button">
            ورود به workspace درگاه پرداخت
          </button>
        </div>
      </SectionCard>
    </div>
  )
}

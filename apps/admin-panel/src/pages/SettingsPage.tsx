import { SectionCard } from '@flower-marketplace/frontend-core'

type SettingsPageProps = {
  onOpenSmsWorkspace: () => void
  onOpenPaymentGatewayWorkspace: () => void
  onOpenSeoSettingsWorkspace: () => void
  onOpenStorefrontInfoPagesWorkspace: () => void
  onOpenFaviconSettingsWorkspace: () => void
}

export function SettingsPage({ onOpenSmsWorkspace, onOpenPaymentGatewayWorkspace, onOpenSeoSettingsWorkspace, onOpenStorefrontInfoPagesWorkspace, onOpenFaviconSettingsWorkspace }: SettingsPageProps) {
  return (
    <div className="space-y-6">
      <SectionCard eyebrow="settings hub" title="تنظیمات سراسری" description="هر integration را داخل workspace اختصاصی خودش مدیریت کن.">
        <div className="grid gap-4 md:grid-cols-3">
          <button className="fm-button" onClick={onOpenSmsWorkspace} type="button">
            ورود به workspace پیامکی
          </button>
          <button className="fm-button" onClick={onOpenStorefrontInfoPagesWorkspace} type="button">
            ورود به workspace صفحات سایت
          </button>
          <button className="fm-button" onClick={onOpenSeoSettingsWorkspace} type="button">
            ورود به workspace سئو
          </button>
          <button className="fm-button" onClick={onOpenPaymentGatewayWorkspace} type="button">
            ورود به workspace درگاه پرداخت
          </button>
          <button className="fm-button" onClick={onOpenFaviconSettingsWorkspace} type="button">
            ورود به workspace فاوایکون
          </button>
        </div>
      </SectionCard>
    </div>
  )
}

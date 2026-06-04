import { StorefrontAccountShell } from '../../components/StorefrontAccountShell'
import { StorefrontAccountDashboard } from '../../components/StorefrontAccountDashboard'

export default function AccountPage() {
  return (
    <StorefrontAccountShell
      title="پنل کاربری"
      description="نمایی جمع‌وجور و واقعی از وضعیت حساب، سفارش‌ها و آدرس‌های شما در گلینو."
    >
      <StorefrontAccountDashboard />
    </StorefrontAccountShell>
  )
}

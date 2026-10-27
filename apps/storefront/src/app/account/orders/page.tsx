import { StorefrontAccountOrdersList } from '../../../components/StorefrontAccountOrdersList'
import { StorefrontAccountShell } from '../../../components/StorefrontAccountShell'

export default function AccountOrdersPage() {
  return (
    <StorefrontAccountShell
      title="سفارش‌های من"
      description="تاریخچه کامل تمام سفارش‌ها، فیلتر وضعیت و جزئیات پیگیری در گلینو."
    >
      <StorefrontAccountOrdersList />
    </StorefrontAccountShell>
  )
}

import { StorefrontAccountAddresses } from '../../../components/StorefrontAccountAddresses'
import { StorefrontAccountShell } from '../../../components/StorefrontAccountShell'

export default function AccountAddressesPage() {
  return (
    <StorefrontAccountShell
      title="آدرس‌های من"
      description="موقعیت دقیق تحویل را روی نقشه انتخاب کن و آدرس‌های پرکاربردت را برای سفارش‌های بعدی ذخیره نگه دار."
    >
      <StorefrontAccountAddresses />
    </StorefrontAccountShell>
  )
}

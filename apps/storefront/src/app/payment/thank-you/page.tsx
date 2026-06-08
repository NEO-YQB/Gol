import { StorefrontPaymentThankYouPage } from '../../../components/StorefrontPaymentThankYouPage'
import { StorefrontShell } from '../../../components/StorefrontShell'
import { buildArchiveMetadata } from '../../../lib/storefront'

export async function generateMetadata() {
  return buildArchiveMetadata({
    title: 'نتیجه پرداخت | گلینو',
    description: 'مشاهده نتیجه نهایی پرداخت سفارش و بازگشت به حساب کاربری یا فروشگاه.',
    path: '/payment/thank-you',
    indexable: false,
    keywords: ['نتیجه پرداخت', 'زرین پال', 'گلینو'],
  })
}

export default function PaymentThankYouPage() {
  return (
    <StorefrontShell>
      <StorefrontPaymentThankYouPage />
    </StorefrontShell>
  )
}

import { StorefrontCheckoutPage } from '../../components/StorefrontCheckoutPage'
import { StorefrontShell } from '../../components/StorefrontShell'
import { buildArchiveMetadata, buildBreadcrumbJsonLd } from '../../lib/storefront'

export async function generateMetadata() {
  return buildArchiveMetadata({
    title: 'تسویه حساب | گلینو',
    description: 'بررسی آدرس، زمان ارسال، کد تخفیف و نهایی‌کردن سفارش گل و گیاه.',
    path: '/checkout',
    indexable: false,
    keywords: ['تسویه حساب', 'ثبت سفارش', 'گلینو'],
  })
}

export default function CheckoutPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'خانه', path: '/' },
    { name: 'سبد خرید', path: '/cart' },
    { name: 'تسویه حساب', path: '/checkout' },
  ])

  return (
    <StorefrontShell>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <StorefrontCheckoutPage />
    </StorefrontShell>
  )
}

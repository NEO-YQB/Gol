import { StorefrontCartPage } from '../../components/StorefrontCartPage'
import { StorefrontShell } from '../../components/StorefrontShell'
import { buildArchiveMetadata, buildBreadcrumbJsonLd } from '../../lib/storefront'

export async function generateMetadata() {
  return buildArchiveMetadata({
    title: 'سبد خرید | گلینو',
    description: 'مرور آیتم‌های انتخاب‌شده، تخفیف‌ها و مبلغ نهایی قبل از ادامه فرایند خرید.',
    path: '/cart',
    indexable: false,
    keywords: ['سبد خرید', 'خرید گل', 'گلینو'],
  })
}

export default function CartPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'خانه', path: '/' },
    { name: 'سبد خرید', path: '/cart' },
  ])

  return (
    <StorefrontShell>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <StorefrontCartPage />
    </StorefrontShell>
  )
}

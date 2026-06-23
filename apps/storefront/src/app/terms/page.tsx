import { notFound } from 'next/navigation'
import { StorefrontTermsPage } from '../../components/StorefrontInfoPages'
import { StorefrontShell } from '../../components/StorefrontShell'
import { buildArchiveMetadata, buildBreadcrumbJsonLd, getStorefrontInfoPagesSettings } from '../../lib/storefront'

export async function generateMetadata() {
  const settings = await getStorefrontInfoPagesSettings()
  const terms = settings?.terms
  return buildArchiveMetadata({
    title: `${terms?.heroTitle || 'قوانین و مقررات'} | گلینو`,
    description: terms?.heroSubtitle || 'قوانین استفاده از خدمات، خرید، پرداخت و ارسال در گلینو.',
    path: '/terms',
    image: terms?.desktopHeroImageUrl || terms?.mobileHeroImageUrl,
    indexable: terms?.enabled !== false,
    keywords: ['قوانین گلینو', 'قوانین و مقررات', 'شرایط استفاده'],
  })
}

export default async function TermsPage() {
  const settings = await getStorefrontInfoPagesSettings()
  if (!settings?.terms?.enabled) notFound()
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'خانه', path: '/' },
    { name: 'قوانین و مقررات', path: '/terms' },
  ])

  return (
    <StorefrontShell>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} type="application/ld+json" />
      <StorefrontTermsPage settings={settings.terms} />
    </StorefrontShell>
  )
}

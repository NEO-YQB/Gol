import { notFound } from 'next/navigation'
import { StorefrontAboutPage } from '../../components/StorefrontInfoPages'
import { StorefrontShell } from '../../components/StorefrontShell'
import { buildArchiveMetadata, buildBreadcrumbJsonLd, getStorefrontInfoPagesSettings } from '../../lib/storefront'

export async function generateMetadata() {
  const settings = await getStorefrontInfoPagesSettings()
  const about = settings?.about
  return buildArchiveMetadata({
    title: `${about?.heroTitle || 'درباره ما'} | گلینو`,
    description: about?.heroSubtitle || 'درباره گلینو، مدل کار و تجربه خرید گل و هدیه.',
    path: '/about-us',
    image: about?.desktopHeroImageUrl || about?.mobileHeroImageUrl,
    indexable: about?.enabled !== false,
    keywords: ['درباره گلینو', 'درباره ما', 'بازار گل'],
  })
}

export default async function AboutUsPage() {
  const settings = await getStorefrontInfoPagesSettings()
  if (!settings?.about?.enabled) notFound()
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'خانه', path: '/' },
    { name: 'درباره ما', path: '/about-us' },
  ])

  return (
    <StorefrontShell>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} type="application/ld+json" />
      <StorefrontAboutPage settings={settings.about} />
    </StorefrontShell>
  )
}

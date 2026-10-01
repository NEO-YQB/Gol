import { notFound } from 'next/navigation'
import { StorefrontLicensePage } from '../../components/StorefrontInfoPages'
import { StorefrontShell } from '../../components/StorefrontShell'
import { buildArchiveMetadata, buildBreadcrumbJsonLd, getStorefrontInfoPagesSettings } from '../../lib/storefront'

export async function generateMetadata() {
  const settings = await getStorefrontInfoPagesSettings()
  const license = settings?.license
  return buildArchiveMetadata({
    title: `${license?.heroTitle || 'مجوزها و نمادهای اعتماد'} | گلینو`,
    description: license?.heroSubtitle || 'مجوزها، نمادهای اعتماد و کدهای اعتبارسنجی رسمی گلینو.',
    path: '/license',
    image: license?.desktopHeroImageUrl || license?.mobileHeroImageUrl,
    indexable: license?.enabled !== false,
    keywords: ['مجوزهای گلینو', 'نماد اعتماد گلینو', 'اینماد گلینو'],
  })
}

export default async function LicensePage() {
  const settings = await getStorefrontInfoPagesSettings()
  if (!settings?.license?.enabled) notFound()
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'خانه', path: '/' },
    { name: 'مجوزها و نمادهای اعتماد', path: '/license' },
  ])

  return (
    <StorefrontShell>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} type="application/ld+json" />
      <StorefrontLicensePage settings={settings.license} />
    </StorefrontShell>
  )
}

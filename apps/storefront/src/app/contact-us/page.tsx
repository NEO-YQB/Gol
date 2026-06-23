import { notFound } from 'next/navigation'
import { StorefrontContactPage } from '../../components/StorefrontInfoPages'
import { StorefrontShell } from '../../components/StorefrontShell'
import { buildArchiveMetadata, buildBreadcrumbJsonLd, getEnrichedStorefrontPage, getStorefrontInfoPagesSettings } from '../../lib/storefront'

export async function generateMetadata() {
  const settings = await getStorefrontInfoPagesSettings()
  const contact = settings?.contact
  return buildArchiveMetadata({
    title: `${contact?.heroTitle || 'تماس با ما'} | گلینو`,
    description: contact?.heroSubtitle || 'راه‌های تماس با گلینو، آدرس، ساعت کاری و شبکه‌های اجتماعی.',
    path: '/contact-us',
    image: contact?.desktopHeroImageUrl || contact?.mobileHeroImageUrl,
    indexable: contact?.enabled !== false,
    keywords: ['تماس با گلینو', 'تماس با ما', 'پشتیبانی گلینو'],
  })
}

export default async function ContactUsPage() {
  const [settings, shellPage] = await Promise.all([
    getStorefrontInfoPagesSettings(),
    getEnrichedStorefrontPage(),
  ])
  if (!settings?.contact?.enabled) notFound()
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'خانه', path: '/' },
    { name: 'تماس با ما', path: '/contact-us' },
  ])

  return (
    <StorefrontShell>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} type="application/ld+json" />
      <StorefrontContactPage settings={settings.contact} shellPage={shellPage} />
    </StorefrontShell>
  )
}

import { notFound } from 'next/navigation'
import { StorefrontArticleDetailPage } from '../../../components/StorefrontArticleDetailPage'
import { StorefrontShell } from '../../../components/StorefrontShell'
import {
  buildArchiveMetadata,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  getStorefrontArticleBySlug,
} from '../../../lib/storefront'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const detail = await getStorefrontArticleBySlug(slug)

  if (!detail) {
    return buildArchiveMetadata({
      title: 'مقاله پیدا نشد | گلینو',
      description: 'این مقاله در دسترس نیست.',
      path: `/mag/${slug}`,
    })
  }

  return buildArchiveMetadata({
    title: detail.seo.metaTitle || `${detail.article.title} | گلینو`,
    description: detail.seo.metaDescription || detail.article.excerpt || `مطالعه مقاله ${detail.article.title} در مجله گلینو`,
    path: `/mag/${detail.article.slug}`,
    image: detail.seo.ogImage || detail.article.coverImage,
    indexable: detail.seo.robotsIndex,
    keywords: [detail.article.title, detail.article.category.title, detail.article.focusKeyword || '', 'مجله گلینو'].filter(Boolean),
    type: 'article',
  })
}

export default async function MagArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const detail = await getStorefrontArticleBySlug(slug)

  if (!detail) {
    notFound()
  }

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'خانه', path: '/' },
    { name: 'مجله', path: '/mag' },
    { name: detail.article.category.title, path: `/mag/category/${detail.article.category.slug}` },
    { name: detail.article.title, path: `/mag/${detail.article.slug}` },
  ])
  const articleJsonLd = buildArticleJsonLd(detail.article)

  return (
    <StorefrontShell>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        type="application/ld+json"
      />
      <StorefrontArticleDetailPage detail={detail} />
    </StorefrontShell>
  )
}

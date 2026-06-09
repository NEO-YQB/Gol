import { notFound } from 'next/navigation'
import { StorefrontArticleArchivePage } from '../../../../components/StorefrontArticleArchivePage'
import { StorefrontShell } from '../../../../components/StorefrontShell'
import {
  buildArchiveMetadata,
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  getStorefrontArticleCategories,
  getStorefrontArticleCategoryArchive,
  getStorefrontLatestArticles,
} from '../../../../lib/storefront'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const archive = await getStorefrontArticleCategoryArchive({ slug, page: 1, limit: 12, sort: 'NEWEST' })

  if (!archive) {
    return buildArchiveMetadata({
      title: 'دسته‌بندی مقاله پیدا نشد | گلینو',
      description: 'این دسته‌بندی مقاله در دسترس نیست.',
      path: `/mag/category/${slug}`,
    })
  }

  return buildArchiveMetadata({
    title: archive.category.metaTitle || `${archive.category.title} | مجله گلینو`,
    description: archive.category.metaDescription || archive.category.description || `آرشیو مقاله‌های ${archive.category.title} در مجله گلینو`,
    path: `/mag/category/${archive.category.slug}`,
    indexable: archive.category.robotsIndex,
    keywords: [archive.category.title, 'مجله گلینو', 'مقالات دسته‌بندی شده'],
  })
}

export default async function MagCategoryArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const query = (await searchParams) ?? {}
  const currentPage = typeof query.page === 'string' ? Number(query.page) || 1 : 1
  const archive = await getStorefrontArticleCategoryArchive({ slug, page: currentPage, limit: 12, sort: 'NEWEST' })

  if (!archive) {
    notFound()
  }

  const latestArticles = await getStorefrontLatestArticles(5)
  const categories = await getStorefrontArticleCategories()
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'خانه', path: '/' },
    { name: 'مجله', path: '/mag' },
    { name: archive.category.title, path: `/mag/category/${archive.category.slug}` },
  ])
  const collectionJsonLd = buildCollectionPageJsonLd({
    title: archive.category.title,
    description: archive.category.description || `آرشیو مقاله‌های ${archive.category.title}`,
    path: `/mag/category/${archive.category.slug}`,
  })

  return (
    <StorefrontShell>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
        type="application/ld+json"
      />
      <StorefrontArticleArchivePage
        activeCategory={{ slug: archive.category.slug, title: archive.category.title }}
        articles={archive.data}
        basePath={`/mag/category/${archive.category.slug}`}
        categories={categories}
        currentPage={archive.meta.page}
        description={archive.category.description || `آرشیو مقاله‌های ${archive.category.title}`}
        lastPage={archive.meta.lastPage}
        latestArticles={latestArticles}
        title={archive.category.title}
        total={archive.meta.total}
      />
    </StorefrontShell>
  )
}

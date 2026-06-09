import { notFound } from 'next/navigation'
import { StorefrontArticleArchivePage } from '../../../../../components/StorefrontArticleArchivePage'
import { StorefrontShell } from '../../../../../components/StorefrontShell'
import {
  buildArchiveMetadata,
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  getStorefrontArticleCategories,
  getStorefrontArticleCategoryArchive,
  getStorefrontLatestArticles,
  resolveArticleCategoryPath,
} from '../../../../../lib/storefront'

async function resolveArchiveFromSegments(slugSegments: string[]) {
  const slug = slugSegments[slugSegments.length - 1] || ''
  if (!slug) return null

  const archive = await getStorefrontArticleCategoryArchive({ slug, page: 1, limit: 12, sort: 'NEWEST' })
  if (!archive) return null

  const categories = await getStorefrontArticleCategories()
  const expectedPath = resolveArticleCategoryPath(categories, archive.category)
  const requestedPath = slugSegments.join('/')

  if (expectedPath !== requestedPath) {
    return null
  }

  return { archive, categories, expectedPath }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug: slugSegments } = await params
  const resolved = await resolveArchiveFromSegments(slugSegments)

  if (!resolved) {
    return buildArchiveMetadata({
      title: 'دسته‌بندی مقاله پیدا نشد | گلینو',
      description: 'این دسته‌بندی مقاله در دسترس نیست.',
      path: `/mag/category/${slugSegments.join('/')}`,
    })
  }

  const { archive, expectedPath } = resolved

  return buildArchiveMetadata({
    title: archive.category.metaTitle || `${archive.category.title} | مجله گلینو`,
    description: archive.category.metaDescription || archive.category.description || `آرشیو مقاله‌های ${archive.category.title} در مجله گلینو`,
    path: `/mag/category/${expectedPath}`,
    indexable: archive.category.robotsIndex,
    keywords: [archive.category.title, 'مجله گلینو', 'مقالات دسته‌بندی شده'],
  })
}

export default async function MagCategoryArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug: slugSegments } = await params
  const resolved = await resolveArchiveFromSegments(slugSegments)

  if (!resolved) {
    notFound()
  }

  const query = (await searchParams) ?? {}
  const currentPage = typeof query.page === 'string' ? Number(query.page) || 1 : 1
  const slug = slugSegments[slugSegments.length - 1]
  const archive = await getStorefrontArticleCategoryArchive({ slug, page: currentPage, limit: 12, sort: 'NEWEST' })

  if (!archive) {
    notFound()
  }

  const categories = resolved.categories
  const expectedPath = resolveArticleCategoryPath(categories, archive.category)
  if (expectedPath !== slugSegments.join('/')) {
    notFound()
  }

  const latestArticles = await getStorefrontLatestArticles(5)
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'خانه', path: '/' },
    { name: 'مجله', path: '/mag' },
    { name: archive.category.title, path: `/mag/category/${expectedPath}` },
  ])
  const collectionJsonLd = buildCollectionPageJsonLd({
    title: archive.category.title,
    description: archive.category.description || `آرشیو مقاله‌های ${archive.category.title}`,
    path: `/mag/category/${expectedPath}`,
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
        basePath={`/mag/category/${expectedPath}`}
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

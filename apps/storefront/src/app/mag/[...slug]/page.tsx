import { notFound } from 'next/navigation'
import { StorefrontArticleArchivePage } from '../../../components/StorefrontArticleArchivePage'
import { StorefrontArticleDetailPage } from '../../../components/StorefrontArticleDetailPage'
import { StorefrontShell } from '../../../components/StorefrontShell'
import {
  buildArchiveMetadata,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  getStorefrontArticleBySlug,
  getStorefrontArticleCategories,
  getStorefrontArticleCategoryArchive,
  getStorefrontLatestArticles,
  resolveArticleCategoryPath,
} from '../../../lib/storefront'

async function resolveCategoryArchive(slugSegments: string[], page = 1) {
  const slug = slugSegments[slugSegments.length - 1] || ''
  if (!slug) return null

  const archive = await getStorefrontArticleCategoryArchive({
    slug,
    page,
    limit: 12,
    sort: 'NEWEST',
  })
  if (!archive) return null

  const categories = await getStorefrontArticleCategories()
  const expectedPath = resolveArticleCategoryPath(categories, archive.category)
  const requestedPath = slugSegments.join('/')

  if (expectedPath !== requestedPath) {
    return null
  }

  return { archive, categories, expectedPath }
}

function buildCategoryBreadcrumbItems(path: string, title: string) {
  return [
    { name: 'خانه', path: '/' },
    { name: 'مجله', path: '/mag' },
    { name: title, path: `/mag/${path}` },
  ]
}

function buildArticleBreadcrumbItems(
  items: Array<{ position: number; name: string; slug: string }> | undefined,
  articleSlug: string,
) {
  const breadcrumbItems = items || []
  const categorySegments: string[] = []

  return [
    { name: 'خانه', path: '/' },
    { name: 'مجله', path: '/mag' },
    ...breadcrumbItems.slice(1, -1).map((item) => {
      categorySegments.push(item.slug)
      return {
        name: item.name,
        path: `/mag/${categorySegments.join('/')}`,
      }
    }),
    { name: breadcrumbItems[breadcrumbItems.length - 1]?.name || articleSlug, path: `/mag/${articleSlug}` },
  ]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug: slugSegments } = await params

  if (slugSegments.length === 1) {
    const detail = await getStorefrontArticleBySlug(slugSegments[0])
    if (detail) {
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
  }

  const resolvedCategory = await resolveCategoryArchive(slugSegments, 1)
  if (resolvedCategory) {
    const { archive, expectedPath } = resolvedCategory
    return buildArchiveMetadata({
      title: archive.category.metaTitle || `${archive.category.title} | مجله گلینو`,
      description: archive.category.metaDescription || archive.category.description || `آرشیو مقاله‌های ${archive.category.title} در مجله گلینو`,
      path: `/mag/${expectedPath}`,
      indexable: archive.category.robotsIndex,
      keywords: [archive.category.title, 'مجله گلینو', 'مقالات دسته‌بندی شده'],
    })
  }

  return buildArchiveMetadata({
    title: 'صفحه مجله پیدا نشد | گلینو',
    description: 'این صفحه مجله در دسترس نیست.',
    path: `/mag/${slugSegments.join('/')}`,
  })
}

export default async function MagDynamicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug: slugSegments } = await params
  const query = (await searchParams) ?? {}

  if (slugSegments.length === 1) {
    const detail = await getStorefrontArticleBySlug(slugSegments[0])
    if (detail) {
      const breadcrumbJsonLd = buildBreadcrumbJsonLd(
        buildArticleBreadcrumbItems(detail.breadcrumbs?.items, detail.article.slug),
      )
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
  }

  const currentPage = typeof query.page === 'string' ? Number(query.page) || 1 : 1
  const resolvedCategory = await resolveCategoryArchive(slugSegments, currentPage)

  if (!resolvedCategory) {
    notFound()
  }

  const { archive, categories, expectedPath } = resolvedCategory
  const latestArticles = await getStorefrontLatestArticles(5)
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    buildCategoryBreadcrumbItems(expectedPath, archive.category.title),
  )
  const collectionJsonLd = buildCollectionPageJsonLd({
    title: archive.category.title,
    description: archive.category.description || `آرشیو مقاله‌های ${archive.category.title}`,
    path: `/mag/${expectedPath}`,
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
        basePath={`/mag/${expectedPath}`}
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

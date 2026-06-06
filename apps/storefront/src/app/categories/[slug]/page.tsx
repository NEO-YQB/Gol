import { notFound } from 'next/navigation'
import { StorefrontCatalogPage } from '../../../components/StorefrontCatalogPage'
import { StorefrontShell } from '../../../components/StorefrontShell'
import {
  buildArchiveMetadata,
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  getStorefrontCatalogData,
  getStorefrontCategoryBySlug,
} from '../../../lib/storefront'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const category = await getStorefrontCategoryBySlug(slug)

  if (!category) {
    return buildArchiveMetadata({
      title: 'دسته‌بندی پیدا نشد | گلینو',
      description: 'این دسته‌بندی در دسترس نیست.',
      path: `/categories/${slug}`,
    })
  }

  return buildArchiveMetadata({
    title: category.metaTitle || `${category.name} | گلینو`,
    description: category.metaDescription || category.description || `آرشیو محصولات ${category.name} در گلینو.`,
    path: `/categories/${slug}`,
    image: category.image,
    indexable: category.isIndexed,
    keywords: [category.name, 'دسته‌بندی محصولات', 'خرید گل', 'گلینو'],
  })
}

export default async function CategoryArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const query = (await searchParams) ?? {}
  const category = await getStorefrontCategoryBySlug(slug)

  if (!category) {
    notFound()
  }

  const resolvedCategory = category

  const catalog = await getStorefrontCatalogData({
    search: typeof query.search === 'string' ? query.search : '',
    page: typeof query.page === 'string' ? Number(query.page) || 1 : 1,
    sort: typeof query.sort === 'string' ? query.sort : 'newest',
    userLat: typeof query.userLat === 'string' ? Number(query.userLat) || undefined : undefined,
    userLng: typeof query.userLng === 'string' ? Number(query.userLng) || undefined : undefined,
    categorySlug: slug,
    productTypeSlug: typeof query.type === 'string' ? query.type : '',
  })
  const pageTitle = resolvedCategory.name
  const pageDescription = `محصولات مرتبط با ${resolvedCategory.name}`
  const categoryPath = `/categories/${slug}`
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'خانه', path: '/' },
    { name: 'فروشگاه', path: '/shop' },
    { name: resolvedCategory.name, path: categoryPath },
  ])
  const collectionJsonLd = buildCollectionPageJsonLd({
    title: pageTitle,
    description: pageDescription,
    path: categoryPath,
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
      <StorefrontCatalogPage
        activeCategorySlug={slug}
        activeProductTypeSlug={typeof query.type === 'string' ? query.type : ''}
        activeSort={catalog.activeSort}
        archiveDescription={resolvedCategory.description || ''}
        basePath={`/categories/${slug}`}
        categories={catalog.categories}
        currentPage={catalog.page}
        description={pageDescription}
        lastPage={catalog.lastPage}
        productTypes={catalog.productTypes}
        products={catalog.products}
        searchValue={catalog.search}
        title={pageTitle}
        total={catalog.total}
        userLat={typeof query.userLat === 'string' ? Number(query.userLat) || undefined : undefined}
        userLng={typeof query.userLng === 'string' ? Number(query.userLng) || undefined : undefined}
      />
    </StorefrontShell>
  )
}

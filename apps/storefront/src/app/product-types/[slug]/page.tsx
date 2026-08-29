import { notFound } from 'next/navigation'
import { StorefrontCatalogPage } from '../../../components/StorefrontCatalogPage'
import { StorefrontShell } from '../../../components/StorefrontShell'
import {
  buildArchiveMetadata,
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildFaqPageJsonLd,
  getStorefrontCatalogData,
  getStorefrontProductTypeBySlug,
} from '../../../lib/storefront'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const productType = await getStorefrontProductTypeBySlug(slug)

  if (!productType) {
    return buildArchiveMetadata({
      title: 'نوع محصول پیدا نشد | گلینو',
      description: 'این نوع محصول در دسترس نیست.',
      path: `/product-types/${slug}`,
    })
  }

  return buildArchiveMetadata({
    title: productType.metaTitle || `${productType.name} | گلینو`,
    description: productType.metaDescription || productType.description || `آرشیو محصولات ${productType.name} در گلینو.`,
    path: `/product-types/${slug}`,
    image: productType.image,
    indexable: productType.isIndexed,
    keywords: [productType.name, 'نوع محصول', 'خرید گل', 'گلینو'],
  })
}

export default async function ProductTypeArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const query = (await searchParams) ?? {}
  const productType = await getStorefrontProductTypeBySlug(slug)

  if (!productType) {
    notFound()
  }

  const resolvedProductType = productType

  const catalog = await getStorefrontCatalogData({
    search: typeof query.search === 'string' ? query.search : '',
    page: typeof query.page === 'string' ? Number(query.page) || 1 : 1,
    sort: typeof query.sort === 'string' ? query.sort : 'newest',
    userLat: typeof query.userLat === 'string' ? Number(query.userLat) || undefined : undefined,
    userLng: typeof query.userLng === 'string' ? Number(query.userLng) || undefined : undefined,
    categorySlug: typeof query.category === 'string' ? query.category : '',
    productTypeSlug: slug,
    minPrice: typeof query.minPrice === 'string' ? Number(query.minPrice) || undefined : undefined,
    maxPrice: typeof query.maxPrice === 'string' ? Number(query.maxPrice) || undefined : undefined,
    elementIds:
      typeof query.elementIds === 'string'
        ? query.elementIds.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item > 0)
        : undefined,
  })
  const pageTitle = resolvedProductType.name
  const pageDescription = `محصولات مرتبط با نوع ${resolvedProductType.name}`
  const productTypePath = `/product-types/${slug}`
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'خانه', path: '/' },
    { name: 'فروشگاه', path: '/shop' },
    { name: resolvedProductType.name, path: productTypePath },
  ])
  const collectionJsonLd = buildCollectionPageJsonLd({
    title: pageTitle,
    description: pageDescription,
    path: productTypePath,
  })
  const faqJsonLd = buildFaqPageJsonLd(resolvedProductType.productTypeFaqs ?? [])

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
      {faqJsonLd ? (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
          type="application/ld+json"
        />
      ) : null}
      <StorefrontCatalogPage
        activeCategorySlug={typeof query.category === 'string' ? query.category : ''}
        activeProductTypeSlug={slug}
        activeSort={catalog.activeSort}
        archiveDescription={resolvedProductType.description || ''}
        basePath={`/product-types/${slug}`}
        categories={catalog.categories}
        currentPage={catalog.page}
        description={pageDescription}
        faqs={resolvedProductType.productTypeFaqs}
        lastPage={catalog.lastPage}
        productTypes={catalog.productTypes}
        products={catalog.products}
        searchValue={catalog.search}
        title={pageTitle}
        total={catalog.total}
        minPrice={catalog.minPrice}
        maxPrice={catalog.maxPrice}
        selectedMinPrice={typeof query.minPrice === 'string' ? Number(query.minPrice) || undefined : undefined}
        selectedMaxPrice={typeof query.maxPrice === 'string' ? Number(query.maxPrice) || undefined : undefined}
        productElements={catalog.productElements}
        activeElementIds={typeof query.elementIds === 'string' ? query.elementIds.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item > 0) : []}
        userLat={typeof query.userLat === 'string' ? Number(query.userLat) || undefined : undefined}
        userLng={typeof query.userLng === 'string' ? Number(query.userLng) || undefined : undefined}
      />
    </StorefrontShell>
  )
}

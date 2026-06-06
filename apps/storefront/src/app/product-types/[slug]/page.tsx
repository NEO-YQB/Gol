import { notFound } from 'next/navigation'
import { StorefrontCatalogPage } from '../../../components/StorefrontCatalogPage'
import { StorefrontShell } from '../../../components/StorefrontShell'
import { buildArchiveMetadata, getStorefrontCatalogData, getStorefrontProductTypeBySlug } from '../../../lib/storefront'

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
  })

  return (
    <StorefrontShell>
      <StorefrontCatalogPage
        activeCategorySlug={typeof query.category === 'string' ? query.category : ''}
        activeProductTypeSlug={slug}
        activeSort={catalog.activeSort}
        archiveDescription={resolvedProductType.description || ''}
        basePath={`/product-types/${slug}`}
        categories={catalog.categories}
        currentPage={catalog.page}
        description={`محصولات مرتبط با نوع ${resolvedProductType.name}`}
        lastPage={catalog.lastPage}
        productTypes={catalog.productTypes}
        products={catalog.products}
        searchValue={catalog.search}
        title={resolvedProductType.name}
        total={catalog.total}
        userLat={typeof query.userLat === 'string' ? Number(query.userLat) || undefined : undefined}
        userLng={typeof query.userLng === 'string' ? Number(query.userLng) || undefined : undefined}
      />
    </StorefrontShell>
  )
}

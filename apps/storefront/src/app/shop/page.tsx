import { JsonLd } from '../../components/JsonLd'
import { StorefrontCatalogPage } from '../../components/StorefrontCatalogPage'
import { StorefrontShell } from '../../components/StorefrontShell'
import { buildArchiveMetadata, buildBreadcrumbJsonLd, buildCollectionPageJsonLd, buildItemListJsonLd, getStorefrontCatalogData } from '../../lib/storefront'

export async function generateMetadata() {
  return buildArchiveMetadata({
    title: 'آرشیو محصولات | گلینو',
    description: 'فهرست کامل محصولات فروشگاه با فیلتر دسته‌بندی، نوع محصول، جستجو و مرتب‌سازی.',
    path: '/shop',
    indexable: true,
    keywords: ['آرشیو محصولات', 'خرید گل', 'فروشگاه گل', 'گلینو'],
  })
}

export default async function ShopArchivePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = (await searchParams) ?? {}
  const catalog = await getStorefrontCatalogData({
    search: typeof query.search === 'string' ? query.search : '',
    page: typeof query.page === 'string' ? Number(query.page) || 1 : 1,
    sort: typeof query.sort === 'string' ? query.sort : 'newest',
    userLat: typeof query.userLat === 'string' ? Number(query.userLat) || undefined : undefined,
    userLng: typeof query.userLng === 'string' ? Number(query.userLng) || undefined : undefined,
    categorySlug: typeof query.category === 'string' ? query.category : '',
    productTypeSlug: typeof query.type === 'string' ? query.type : '',
    minPrice: typeof query.minPrice === 'string' ? Number(query.minPrice) || undefined : undefined,
    maxPrice: typeof query.maxPrice === 'string' ? Number(query.maxPrice) || undefined : undefined,
    elementIds:
      typeof query.elementIds === 'string'
        ? query.elementIds.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item > 0)
        : undefined,
  })
  const title = 'همه محصولات'
  const description = 'همه محصولات فروشگاه'
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'خانه', path: '/' },
    { name: 'فروشگاه', path: '/shop' },
  ])
  const collectionJsonLd = buildCollectionPageJsonLd({
    title,
    description,
    path: '/shop',
  })
  const itemListJsonLd = buildItemListJsonLd(catalog.products, '/shop')

  return (
    <StorefrontShell>
      <JsonLd data={[breadcrumbJsonLd, collectionJsonLd, itemListJsonLd]} />
      <StorefrontCatalogPage
        activeCategorySlug={typeof query.category === 'string' ? query.category : ''}
        activeProductTypeSlug={typeof query.type === 'string' ? query.type : ''}
        activeSort={catalog.activeSort}
        archiveDescription=""
        basePath="/shop"
        categories={catalog.categories}
        currentPage={catalog.page}
        description={description}
        lastPage={catalog.lastPage}
        productTypes={catalog.productTypes}
        products={catalog.products}
        searchValue={catalog.search}
        title={title}
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

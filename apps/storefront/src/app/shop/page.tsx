import { StorefrontCatalogPage } from '../../components/StorefrontCatalogPage'
import { StorefrontShell } from '../../components/StorefrontShell'
import { buildArchiveMetadata, buildBreadcrumbJsonLd, buildCollectionPageJsonLd, getStorefrontCatalogData } from '../../lib/storefront'

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
    elementTypes:
      typeof query.elements === 'string'
        ? query.elements.split(',').map((item) => item.trim()).filter(Boolean) as Array<'BASE' | 'FLOWER' | 'FILLER' | 'ACCESSORY'>
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
        activeElementTypes={typeof query.elements === 'string' ? query.elements.split(',').map((item) => item.trim()).filter(Boolean) as Array<'BASE' | 'FLOWER' | 'FILLER' | 'ACCESSORY'> : []}
        userLat={typeof query.userLat === 'string' ? Number(query.userLat) || undefined : undefined}
        userLng={typeof query.userLng === 'string' ? Number(query.userLng) || undefined : undefined}
      />
    </StorefrontShell>
  )
}

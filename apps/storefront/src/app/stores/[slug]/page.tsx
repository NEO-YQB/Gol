import { notFound } from 'next/navigation'
import { StorefrontShell } from '../../../components/StorefrontShell'
import { StorefrontVendorPage } from '../../../components/StorefrontVendorPage'
import {
  buildArchiveMetadata,
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildStoreJsonLd,
  getStorefrontStorePageData,
} from '../../../lib/storefront'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const vendorPage = await getStorefrontStorePageData({ slug })

  if (!vendorPage.store) {
    return buildArchiveMetadata({
      title: 'فروشنده پیدا نشد | گلینو',
      description: 'این فروشنده در حال حاضر در دسترس نیست.',
      path: `/stores/${slug}`,
    })
  }

  const store = vendorPage.store

  return buildArchiveMetadata({
    title: `${store.name} | گلینو`,
    description:
      store.description ||
      `مشاهده محصولات، اطلاعات ارسال و جزئیات فروشگاه ${store.name} در گلینو.`,
    path: `/stores/${store.slug}`,
    image: store.logo,
    indexable: true,
    keywords: [store.name, 'فروشنده', 'فروشگاه', 'خرید گل', 'گلینو'],
    type: 'website',
  })
}

export default async function StoreDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const query = (await searchParams) ?? {}
  const vendorPage = await getStorefrontStorePageData({
    slug,
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

  if (!vendorPage.store) {
    notFound()
  }

  const store = vendorPage.store
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'خانه', path: '/' },
    { name: 'فروشگاه', path: '/shop' },
    { name: store.name, path: `/stores/${store.slug}` },
  ])
  const collectionJsonLd = buildCollectionPageJsonLd({
    title: store.name,
    description: store.description || `محصولات فروشگاه ${store.name}`,
    path: `/stores/${store.slug}`,
  })
  const storeJsonLd = buildStoreJsonLd(store, vendorPage.total)

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
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
        type="application/ld+json"
      />
      <StorefrontVendorPage
        activeCategorySlug={typeof query.category === 'string' ? query.category : ''}
        activeElementIds={typeof query.elementIds === 'string' ? query.elementIds.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item > 0) : []}
        activeProductTypeSlug={typeof query.type === 'string' ? query.type : ''}
        activeSort={vendorPage.activeSort}
        basePath={`/stores/${store.slug}`}
        categories={vendorPage.categories}
        currentPage={vendorPage.page}
        lastPage={vendorPage.lastPage}
        maxPrice={vendorPage.maxPrice}
        minPrice={vendorPage.minPrice}
        productElements={vendorPage.productElements}
        productTypes={vendorPage.productTypes}
        products={vendorPage.products}
        searchValue={vendorPage.search}
        selectedMaxPrice={typeof query.maxPrice === 'string' ? Number(query.maxPrice) || undefined : undefined}
        selectedMinPrice={typeof query.minPrice === 'string' ? Number(query.minPrice) || undefined : undefined}
        store={store}
        total={vendorPage.total}
        userLat={typeof query.userLat === 'string' ? Number(query.userLat) || undefined : undefined}
        userLng={typeof query.userLng === 'string' ? Number(query.userLng) || undefined : undefined}
      />
    </StorefrontShell>
  )
}

import { StorefrontCatalogPage } from '../../components/StorefrontCatalogPage'
import { StorefrontShell } from '../../components/StorefrontShell'
import { buildArchiveMetadata, getStorefrontCatalogData } from '../../lib/storefront'

export async function generateMetadata() {
  return buildArchiveMetadata({
    title: 'آرشیو محصولات | گلینو',
    description: 'فهرست کامل محصولات فروشگاه با فیلتر دسته‌بندی، نوع محصول، جستجو و مرتب‌سازی.',
    path: '/shop',
    indexable: true,
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
  })

  return (
    <StorefrontShell>
      <StorefrontCatalogPage
        activeCategorySlug={typeof query.category === 'string' ? query.category : ''}
        activeProductTypeSlug={typeof query.type === 'string' ? query.type : ''}
        activeSort={catalog.activeSort}
        archiveDescription="در این آرشیو می‌توانی همه محصولات منتشرشده را با فیلترهای دسته‌بندی، نوع محصول، جستجو و مرتب‌سازی واقعی فروشگاه مرور کنی."
        basePath="/shop"
        categories={catalog.categories}
        currentPage={catalog.page}
        description="همه محصولات منتشرشده و قابل خرید را در یک آرشیو یکپارچه با فیلترهای sidebar مرور کن."
        lastPage={catalog.lastPage}
        productTypes={catalog.productTypes}
        products={catalog.products}
        searchValue={catalog.search}
        title="همه محصولات"
        total={catalog.total}
        userLat={typeof query.userLat === 'string' ? Number(query.userLat) || undefined : undefined}
        userLng={typeof query.userLng === 'string' ? Number(query.userLng) || undefined : undefined}
      />
    </StorefrontShell>
  )
}

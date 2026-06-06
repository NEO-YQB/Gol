import { StorefrontAccountShell } from '../../components/StorefrontAccountShell'
import { StorefrontCatalogPage } from '../../components/StorefrontCatalogPage'
import { getStorefrontCatalogData } from '../../lib/storefront'

export default async function ShopArchivePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = (await searchParams) ?? {}
  const catalog = await getStorefrontCatalogData({
    search: typeof query.search === 'string' ? query.search : '',
    sort: typeof query.sort === 'string' ? query.sort : 'newest',
    categorySlug: typeof query.category === 'string' ? query.category : '',
    productTypeSlug: typeof query.type === 'string' ? query.type : '',
  })

  return (
    <StorefrontAccountShell
      title="آرشیو محصولات"
      description="فهرست کامل محصولات با جستجو، فیلتر دسته‌بندی و نوع محصول، و sortهای فعلی API فروشگاه."
    >
      <StorefrontCatalogPage
        activeCategorySlug={typeof query.category === 'string' ? query.category : ''}
        activeProductTypeSlug={typeof query.type === 'string' ? query.type : ''}
        activeSort={catalog.activeSort}
        basePath="/shop"
        categories={catalog.categories}
        description="همه محصولات منتشرشده و قابل خرید را در یک آرشیو یکپارچه با فیلترهای sidebar مرور کن."
        eyebrow="Shop Archive"
        productTypes={catalog.productTypes}
        products={catalog.products}
        searchValue={catalog.search}
        title="همه محصولات"
        total={catalog.total}
      />
    </StorefrontAccountShell>
  )
}

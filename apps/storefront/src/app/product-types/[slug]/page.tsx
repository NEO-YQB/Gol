import { notFound } from 'next/navigation'
import { StorefrontAccountShell } from '../../../components/StorefrontAccountShell'
import { StorefrontCatalogPage } from '../../../components/StorefrontCatalogPage'
import { getStorefrontCatalogData, getStorefrontProductTypeBySlug } from '../../../lib/storefront'

export default async function ProductTypeArchivePage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const { slug } = params
  const query = searchParams ?? {}
  const productType = await getStorefrontProductTypeBySlug(slug)

  if (!productType) {
    notFound()
  }

  const resolvedProductType = productType

  const catalog = await getStorefrontCatalogData({
    search: typeof query.search === 'string' ? query.search : '',
    sort: typeof query.sort === 'string' ? query.sort : 'newest',
    categorySlug: typeof query.category === 'string' ? query.category : '',
    productTypeSlug: slug,
  })

  return (
    <StorefrontAccountShell
      title={`نوع محصول ${resolvedProductType.name}`}
      description={resolvedProductType.description || 'آرشیو محصولات این نوع با فیلترهای واقعی و sidebar کامل آماده شده است.'}
    >
      <StorefrontCatalogPage
        activeCategorySlug={typeof query.category === 'string' ? query.category : ''}
        activeProductTypeSlug={slug}
        activeSort={catalog.activeSort}
        basePath={`/product-types/${slug}`}
        categories={catalog.categories}
        description={`محصولات مرتبط با نوع ${resolvedProductType.name} را با جستجو، دسته‌بندی و sort فعلی API مرور کن.`}
        eyebrow="Product Type Archive"
        productTypes={catalog.productTypes}
        products={catalog.products}
        searchValue={catalog.search}
        title={resolvedProductType.name}
        total={catalog.total}
      />
    </StorefrontAccountShell>
  )
}

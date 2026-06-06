import { notFound } from 'next/navigation'
import { StorefrontAccountShell } from '../../../components/StorefrontAccountShell'
import { StorefrontCatalogPage } from '../../../components/StorefrontCatalogPage'
import { getStorefrontCatalogData, getStorefrontCategoryBySlug } from '../../../lib/storefront'

export default async function CategoryArchivePage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const { slug } = params
  const query = searchParams ?? {}
  const category = await getStorefrontCategoryBySlug(slug)

  if (!category) {
    notFound()
  }

  const resolvedCategory = category

  const catalog = await getStorefrontCatalogData({
    search: typeof query.search === 'string' ? query.search : '',
    sort: typeof query.sort === 'string' ? query.sort : 'newest',
    categorySlug: slug,
    productTypeSlug: typeof query.type === 'string' ? query.type : '',
  })

  return (
    <StorefrontAccountShell
      title={`دسته‌بندی ${resolvedCategory.name}`}
      description={resolvedCategory.slug ? `آرشیو محصولات این دسته با فیلترها و sortهای واقعی فعلی API آماده شده است.` : 'آرشیو دسته‌بندی محصولات'}
    >
      <StorefrontCatalogPage
        activeCategorySlug={slug}
        activeProductTypeSlug={typeof query.type === 'string' ? query.type : ''}
        activeSort={catalog.activeSort}
        basePath={`/categories/${slug}`}
        categories={catalog.categories}
        description={`محصولات مرتبط با ${resolvedCategory.name} را با جستجو، نوع محصول و sort فعلی API مرور کن.`}
        eyebrow="Category Archive"
        productTypes={catalog.productTypes}
        products={catalog.products}
        searchValue={catalog.search}
        title={resolvedCategory.name}
        total={catalog.total}
      />
    </StorefrontAccountShell>
  )
}

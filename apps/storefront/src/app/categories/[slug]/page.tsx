import { notFound } from 'next/navigation'
import { StorefrontCatalogPage } from '../../../components/StorefrontCatalogPage'
import { StorefrontShell } from '../../../components/StorefrontShell'
import { buildArchiveMetadata, getStorefrontCatalogData, getStorefrontCategoryBySlug } from '../../../lib/storefront'

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
    categorySlug: slug,
    productTypeSlug: typeof query.type === 'string' ? query.type : '',
  })

  return (
    <StorefrontShell>
      <StorefrontCatalogPage
        activeCategorySlug={slug}
        activeProductTypeSlug={typeof query.type === 'string' ? query.type : ''}
        activeSort={catalog.activeSort}
        archiveDescription={resolvedCategory.description || ''}
        basePath={`/categories/${slug}`}
        categories={catalog.categories}
        currentPage={catalog.page}
        description={`محصولات مرتبط با ${resolvedCategory.name} را با جستجو، نوع محصول و sort فعلی API مرور کن.`}
        lastPage={catalog.lastPage}
        productTypes={catalog.productTypes}
        products={catalog.products}
        searchValue={catalog.search}
        title={resolvedCategory.name}
        total={catalog.total}
      />
    </StorefrontShell>
  )
}

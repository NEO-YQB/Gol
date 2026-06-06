import Link from 'next/link'
import { ExpandableTextBlock } from './ExpandableTextBlock'
import { NearestSortButton } from './NearestSortButton'
import { ProductCard } from './storefrontBlocks'
import { storefrontCatalog } from './storefrontCatalog'
import type { CategorySummary, ProductSummary, ProductTypeSummary } from '../lib/storefront'

type CatalogSortOption = 'newest' | 'most_sold' | 'instant_delivery' | 'nearest'

function flattenCategories(categories: CategorySummary[], depth = 0): Array<CategorySummary & { depth: number }> {
  return categories.flatMap((category) => {
    const children = Array.isArray(category.children) ? category.children : []
    return [{ ...category, depth }, ...flattenCategories(children, depth + 1)]
  })
}

export function StorefrontCatalogPage({
  title,
  description,
  products,
  total,
  currentPage,
  lastPage,
  searchValue,
  activeSort,
  basePath,
  categories,
  productTypes,
  activeCategorySlug,
  activeProductTypeSlug,
  archiveDescription,
  userLat,
  userLng,
}: {
  title: string
  description: string
  products: ProductSummary[]
  total: number
  currentPage: number
  lastPage: number
  searchValue?: string
  activeSort: CatalogSortOption
  basePath: string
  categories: CategorySummary[]
  productTypes: ProductTypeSummary[]
  activeCategorySlug?: string
  activeProductTypeSlug?: string
  archiveDescription?: string
  userLat?: number
  userLng?: number
}) {
  const flatCategories = flattenCategories(categories)
  const activeCategory = flatCategories.find((category) => category.slug === activeCategorySlug)
  const activeProductType = productTypes.find((type) => type.slug === activeProductTypeSlug)

  function buildHref(next: {
    search?: string
    sort?: CatalogSortOption
    categorySlug?: string
    productTypeSlug?: string
    page?: number
  }) {
    const params = new URLSearchParams()
    const search = next.search ?? searchValue ?? ''
    const sort = next.sort ?? activeSort
    const categorySlug = next.categorySlug ?? activeCategorySlug ?? ''
    const productTypeSlug = next.productTypeSlug ?? activeProductTypeSlug ?? ''
    const page = next.page ?? currentPage

    if (search.trim()) params.set('search', search.trim())
    if (sort && sort !== 'newest') params.set('sort', sort)
    if (categorySlug) params.set('category', categorySlug)
    if (productTypeSlug) params.set('type', productTypeSlug)
    if (page > 1) params.set('page', String(page))
    if (typeof userLat === 'number') params.set('userLat', String(userLat))
    if (typeof userLng === 'number') params.set('userLng', String(userLng))

    const query = params.toString()
    return query ? `${basePath}?${query}` : basePath
  }

  const paginationItems = Array.from({ length: lastPage }, (_, index) => index + 1).filter((pageNumber) => {
    return pageNumber === 1 || pageNumber === lastPage || Math.abs(pageNumber - currentPage) <= 1
  })

  return (
    <div className={storefrontCatalog.content}>
      <section className={storefrontCatalog.hero}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-black md:text-[2.2rem]">{title}</h1>
            <p className="mt-3 text-sm leading-7 text-white/82">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold text-white/85">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">{`${new Intl.NumberFormat('fa-IR').format(total)} محصول`}</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">سورت فعلی از API واقعی</span>
          </div>
        </div>
      </section>

      <div className={storefrontCatalog.shell}>
        <aside className={storefrontCatalog.sidebar}>
          <div className="grid gap-5">
            <section>
              <h2 className="text-lg font-black text-[#173126]">جستجو و مرتب‌سازی</h2>
              <form action={basePath} className="mt-4 grid gap-3">
                <input className={storefrontCatalog.input} defaultValue={searchValue || ''} name="search" placeholder="جستجو در نام محصول" />
                <select className={storefrontCatalog.select} defaultValue={activeSort} name="sort">
                  <option value="newest">جدیدترین</option>
                  <option value="most_sold">پرفروش‌ترین</option>
                  <option value="instant_delivery">ارسال فوری</option>
                  <option value="nearest">نزدیک‌ترین به من</option>
                </select>
                {activeCategorySlug ? <input name="category" type="hidden" value={activeCategorySlug} /> : null}
                {activeProductTypeSlug ? <input name="type" type="hidden" value={activeProductTypeSlug} /> : null}
                <button className="rounded-full bg-[#173126] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#29513f]" type="submit">
                  اعمال فیلتر
                </button>
                <NearestSortButton />
              </form>
            </section>

            <section>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-[#173126]">دسته‌بندی‌ها</h2>
                <Link className={storefrontCatalog.chip} href={buildHref({ categorySlug: '' })}>
                  همه
                </Link>
              </div>
              <div className="mt-4 grid gap-2">
                {flatCategories.map((category) => {
                  const isActive = activeCategorySlug === category.slug
                  return (
                    <Link
                      className={`rounded-[18px] px-4 py-3 text-sm transition ${isActive ? 'bg-[#173126] font-bold text-white' : 'bg-white/72 text-[#173126] hover:bg-white'}`}
                      href={buildHref({ categorySlug: category.slug })}
                      key={category.id}
                    >
                      <span style={{ paddingInlineStart: `${category.depth * 12}px` }}>{category.name}</span>
                    </Link>
                  )
                })}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-[#173126]">نوع محصول</h2>
                <Link className={storefrontCatalog.chip} href={buildHref({ productTypeSlug: '' })}>
                  همه
                </Link>
              </div>
              <div className="mt-4 grid gap-2">
                {productTypes.map((type) => {
                  const isActive = activeProductTypeSlug === type.slug
                  return (
                    <Link
                      className={`rounded-[18px] px-4 py-3 text-sm transition ${isActive ? 'bg-[#173126] font-bold text-white' : 'bg-white/72 text-[#173126] hover:bg-white'}`}
                      href={buildHref({ productTypeSlug: type.slug })}
                      key={type.id}
                    >
                      {type.name}
                    </Link>
                  )
                })}
              </div>
            </section>
          </div>
        </aside>

        <section className={storefrontCatalog.content}>
          <div className={`${storefrontCatalog.card} flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <strong className="block text-lg text-[#173126]">نتایج فهرست</strong>
              <p className="mt-1 text-sm text-[#6e6152]">این فاز با sortهای فعلی API کار می‌کند؛ سورت نزدیک‌ترین لوکیشن در فاز بعد اضافه می‌شود.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchValue ? <span className={storefrontCatalog.chip}>{`جستجو: ${searchValue}`}</span> : null}
              {activeCategory ? <span className={storefrontCatalog.chip}>{`دسته: ${activeCategory.name}`}</span> : null}
              {activeProductType ? <span className={storefrontCatalog.chip}>{`نوع: ${activeProductType.name}`}</span> : null}
            </div>
          </div>

          {products.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard className="w-full min-w-0" key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className={storefrontCatalog.empty}>هیچ محصولی با این فیلترها پیدا نشد.</div>
          )}

          {lastPage > 1 ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {paginationItems.map((pageNumber, index) => {
                const previousPage = paginationItems[index - 1]
                const shouldShowGap = previousPage !== undefined && pageNumber - previousPage > 1

                return (
                  <div className="contents" key={pageNumber}>
                    {shouldShowGap ? <span className="px-2 text-sm text-[#8e7e6d]">…</span> : null}
                    <Link
                      className={`inline-flex min-w-10 items-center justify-center rounded-full px-3 py-2 text-sm font-bold transition ${
                        pageNumber === currentPage
                          ? 'bg-[#173126] text-white'
                          : 'border border-[#1f6a52]/12 bg-white/78 text-[#173126] hover:bg-white'
                      }`}
                      href={buildHref({ page: pageNumber })}
                    >
                      {new Intl.NumberFormat('fa-IR').format(pageNumber)}
                    </Link>
                  </div>
                )
              })}
            </div>
          ) : null}

          {archiveDescription ? <ExpandableTextBlock text={archiveDescription} title={`درباره ${title}`} /> : null}
        </section>
      </div>
    </div>
  )
}

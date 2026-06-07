import Link from 'next/link'
import { ExpandableTextBlock } from './ExpandableTextBlock'
import { NearestSortButton } from './NearestSortButton'
import { ProductCard } from './storefrontBlocks'
import { storefrontCatalog } from './storefrontCatalog'
import type {
  CategorySummary,
  ProductSummary,
  ProductTypeSummary,
  StorefrontElementType,
  StorefrontProductElement,
} from '../lib/storefront'

type CatalogSortOption = 'newest' | 'most_sold' | 'instant_delivery' | 'nearest'

const ELEMENT_TYPE_LABELS: Record<StorefrontElementType, string> = {
  FLOWER: 'گل',
  FILLER: 'پرکننده',
  ACCESSORY: 'اکسسوری',
  BASE: 'بیس',
}

const ELEMENT_TYPE_OPTIONS: StorefrontElementType[] = ['FLOWER', 'FILLER', 'ACCESSORY', 'BASE']

function flattenCategories(categories: CategorySummary[], depth = 0): Array<CategorySummary & { depth: number }> {
  return categories.flatMap((category) => {
    const children = Array.isArray(category.children) ? category.children : []
    return [{ ...category, depth }, ...flattenCategories(children, depth + 1)]
  })
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('fa-IR').format(value)
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
  productElements,
  activeCategorySlug,
  activeProductTypeSlug,
  archiveDescription,
  userLat,
  userLng,
  minPrice,
  maxPrice,
  selectedMinPrice,
  selectedMaxPrice,
  activeElementIds,
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
  productElements: StorefrontProductElement[]
  activeCategorySlug?: string
  activeProductTypeSlug?: string
  archiveDescription?: string
  userLat?: number
  userLng?: number
  minPrice?: number | null
  maxPrice?: number | null
  selectedMinPrice?: number
  selectedMaxPrice?: number
  activeElementIds?: number[]
}) {
  const flatCategories = flattenCategories(categories)
  const activeCategory = flatCategories.find((category) => category.slug === activeCategorySlug)
  const activeProductType = productTypes.find((type) => type.slug === activeProductTypeSlug)
  const selectedElementIds = activeElementIds ?? []
  const activeElements = productElements.filter((item) => selectedElementIds.includes(item.id))
  const groupedElements = ELEMENT_TYPE_OPTIONS.map((elementType) => ({
    type: elementType,
    label: ELEMENT_TYPE_LABELS[elementType],
    items: productElements.filter((item) => item.type === elementType),
  })).filter((group) => group.items.length > 0)

  function buildHref(next: {
    search?: string
    sort?: CatalogSortOption
    categorySlug?: string
    productTypeSlug?: string
    page?: number
    minPrice?: number | null
    maxPrice?: number | null
    elementIds?: number[]
  }) {
    const params = new URLSearchParams()
    const search = next.search ?? searchValue ?? ''
    const sort = next.sort ?? activeSort
    const categorySlug = next.categorySlug ?? activeCategorySlug ?? ''
    const productTypeSlug = next.productTypeSlug ?? activeProductTypeSlug ?? ''
    const page = next.page ?? currentPage
    const nextMinPrice = next.minPrice !== undefined ? next.minPrice : selectedMinPrice
    const nextMaxPrice = next.maxPrice !== undefined ? next.maxPrice : selectedMaxPrice
    const nextElementIds = next.elementIds ?? selectedElementIds

    if (search.trim()) params.set('search', search.trim())
    if (sort && sort !== 'newest') params.set('sort', sort)
    if (categorySlug) params.set('category', categorySlug)
    if (productTypeSlug) params.set('type', productTypeSlug)
    if (typeof nextMinPrice === 'number') params.set('minPrice', String(nextMinPrice))
    if (typeof nextMaxPrice === 'number') params.set('maxPrice', String(nextMaxPrice))
    if (nextElementIds.length) params.set('elementIds', nextElementIds.join(','))
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-black md:text-[2.2rem]">{title}</h1>
            <p className="mt-2 text-sm leading-7 text-white/82">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold text-white/85">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">{`${new Intl.NumberFormat('fa-IR').format(total)} محصول`}</span>
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
                {selectedElementIds.length ? <input name="elementIds" type="hidden" value={selectedElementIds.join(',')} /> : null}
                <button className="rounded-full bg-[#173126] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#29513f]" type="submit">
                  اعمال فیلتر
                </button>
                <NearestSortButton />
              </form>
            </section>

            <section>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-[#173126]">فیلتر قیمت</h2>
                {typeof selectedMinPrice === 'number' || typeof selectedMaxPrice === 'number' ? (
                  <Link className={storefrontCatalog.chip} href={buildHref({ minPrice: null, maxPrice: null, page: 1 })}>
                    حذف
                  </Link>
                ) : null}
              </div>
              <form action={basePath} className="mt-4 grid gap-3">
                <input className={storefrontCatalog.input} defaultValue={typeof selectedMinPrice === 'number' ? String(selectedMinPrice) : ''} max={typeof maxPrice === 'number' ? maxPrice : undefined} min={typeof minPrice === 'number' ? minPrice : undefined} name="minPrice" placeholder={typeof minPrice === 'number' ? `از ${formatMoney(minPrice)}` : 'حداقل قیمت'} type="number" />
                <input className={storefrontCatalog.input} defaultValue={typeof selectedMaxPrice === 'number' ? String(selectedMaxPrice) : ''} max={typeof maxPrice === 'number' ? maxPrice : undefined} min={typeof minPrice === 'number' ? minPrice : undefined} name="maxPrice" placeholder={typeof maxPrice === 'number' ? `تا ${formatMoney(maxPrice)}` : 'حداکثر قیمت'} type="number" />
                {activeCategorySlug ? <input name="category" type="hidden" value={activeCategorySlug} /> : null}
                {activeProductTypeSlug ? <input name="type" type="hidden" value={activeProductTypeSlug} /> : null}
                {searchValue ? <input name="search" type="hidden" value={searchValue} /> : null}
                {activeSort !== 'newest' ? <input name="sort" type="hidden" value={activeSort} /> : null}
                {selectedElementIds.length ? <input name="elementIds" type="hidden" value={selectedElementIds.join(',')} /> : null}
                <button className="rounded-full border border-[#1f6a52]/12 bg-white px-4 py-3 text-sm font-bold text-[#173126] transition hover:bg-[#f8f2ea]" type="submit">
                  اعمال بازه قیمت
                </button>
                {typeof minPrice === 'number' && typeof maxPrice === 'number' ? (
                  <p className="text-xs text-[#92785a]">{`بازه فعلی محصولات: ${formatMoney(minPrice)} تا ${formatMoney(maxPrice)} تومان`}</p>
                ) : null}
              </form>
            </section>

            {groupedElements.map((group) => (
              <section key={group.type}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-[#173126]">{group.label}</h2>
                  {selectedElementIds.some((id) => group.items.some((item) => item.id === id)) ? (
                    <Link
                      className={storefrontCatalog.chip}
                      href={buildHref({
                        elementIds: selectedElementIds.filter((id) => !group.items.some((item) => item.id === id)),
                        page: 1,
                      })}
                    >
                      حذف
                    </Link>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2">
                  {group.items.map((element) => {
                    const isActive = selectedElementIds.includes(element.id)
                    const nextElementIds = isActive
                      ? selectedElementIds.filter((item) => item !== element.id)
                      : [...selectedElementIds, element.id]

                    return (
                      <Link
                        className={`rounded-[18px] px-4 py-3 text-sm transition ${isActive ? 'bg-[#173126] font-bold text-white' : 'bg-white/72 text-[#173126] hover:bg-white'}`}
                        href={buildHref({ elementIds: nextElementIds, page: 1 })}
                        key={element.id}
                      >
                        {element.name}
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}

            <section>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-[#173126]">دسته‌بندی‌ها</h2>
                <Link className={storefrontCatalog.chip} href={buildHref({ categorySlug: '', page: 1 })}>
                  همه
                </Link>
              </div>
              <div className="mt-4 grid gap-2">
                {flatCategories.map((category) => {
                  const isActive = activeCategorySlug === category.slug
                  return (
                    <Link
                      className={`rounded-[18px] px-4 py-3 text-sm transition ${isActive ? 'bg-[#173126] font-bold text-white' : 'bg-white/72 text-[#173126] hover:bg-white'}`}
                      href={buildHref({ categorySlug: category.slug, page: 1 })}
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
                <Link className={storefrontCatalog.chip} href={buildHref({ productTypeSlug: '', page: 1 })}>
                  همه
                </Link>
              </div>
              <div className="mt-4 grid gap-2">
                {productTypes.map((type) => {
                  const isActive = activeProductTypeSlug === type.slug
                  return (
                    <Link
                      className={`rounded-[18px] px-4 py-3 text-sm transition ${isActive ? 'bg-[#173126] font-bold text-white' : 'bg-white/72 text-[#173126] hover:bg-white'}`}
                      href={buildHref({ productTypeSlug: type.slug, page: 1 })}
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
          {searchValue || typeof selectedMinPrice === 'number' || typeof selectedMaxPrice === 'number' || activeElements.length || activeCategory || activeProductType ? (
            <div className="flex h-11 min-w-0 items-center gap-2 overflow-hidden rounded-[18px] border border-[#1f6a52]/10 bg-white/78 px-3 shadow-[0_8px_18px_rgba(52,36,17,0.04)]">
              <strong className="shrink-0 text-xs font-black leading-none text-[#173126]">فیلترهای انتخاب‌شده</strong>
              <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto py-1">
                {searchValue ? (
                  <Link className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#1f6a52]/10 bg-white px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-[#1f6a52] hover:bg-white" href={buildHref({ search: '', page: 1 })}>
                    <span>{`جستجو: ${searchValue}`}</span>
                    <span aria-hidden="true">×</span>
                  </Link>
                ) : null}
                {typeof selectedMinPrice === 'number' || typeof selectedMaxPrice === 'number' ? (
                  <Link className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#1f6a52]/10 bg-white px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-[#1f6a52] hover:bg-white" href={buildHref({ minPrice: null, maxPrice: null, page: 1 })}>
                    <span>{`قیمت: ${typeof selectedMinPrice === 'number' ? formatMoney(selectedMinPrice) : 'کمینه'} تا ${typeof selectedMaxPrice === 'number' ? formatMoney(selectedMaxPrice) : 'بیشینه'}`}</span>
                    <span aria-hidden="true">×</span>
                  </Link>
                ) : null}
                {activeElements.map((element) => (
                  <Link className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#1f6a52]/10 bg-white px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-[#1f6a52] hover:bg-white" href={buildHref({ elementIds: selectedElementIds.filter((item) => item !== element.id), page: 1 })} key={element.id}>
                    <span>{element.name}</span>
                    <span aria-hidden="true">×</span>
                  </Link>
                ))}
                {activeCategory ? (
                  <Link className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#1f6a52]/10 bg-white px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-[#1f6a52] hover:bg-white" href={buildHref({ categorySlug: '', page: 1 })}>
                    <span>{`دسته: ${activeCategory.name}`}</span>
                    <span aria-hidden="true">×</span>
                  </Link>
                ) : null}
                {activeProductType ? (
                  <Link className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#1f6a52]/10 bg-white px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-[#1f6a52] hover:bg-white" href={buildHref({ productTypeSlug: '', page: 1 })}>
                    <span>{`نوع: ${activeProductType.name}`}</span>
                    <span aria-hidden="true">×</span>
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          {products.length ? (
            <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

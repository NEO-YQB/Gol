'use client'

import Link from 'next/link'
import { ProductCard } from './storefrontBlocks'
import { storefrontCatalog } from './storefrontCatalog'
import { resolveAssetUrl } from '../lib/storefront'
import type {
  CategorySummary,
  ProductSummary,
  ProductTypeSummary,
  StoreSummary,
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

function formatRating(value: string | number | undefined) {
  const rating = Number(value ?? 0)
  return rating > 0 ? rating.toFixed(1) : 'جدید'
}

function getDeliveryLabel(store: StoreSummary) {
  if (store.sameDayDelivery) return 'امکان ارسال در همان روز'
  if (typeof store.minDeliveryHours === 'number' && typeof store.maxDeliveryHours === 'number') {
    return `${new Intl.NumberFormat('fa-IR').format(store.minDeliveryHours)} تا ${new Intl.NumberFormat('fa-IR').format(store.maxDeliveryHours)} ساعت`
  }
  return 'ارسال استاندارد'
}

export function StorefrontVendorPage({
  store,
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
  userLat,
  userLng,
  minPrice,
  maxPrice,
  selectedMinPrice,
  selectedMaxPrice,
  activeElementIds,
}: {
  store: StoreSummary
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
  const productCount = typeof store._count?.products === 'number' ? store._count.products : total

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
    <div className="grid gap-6">
      <section className={`${storefrontCatalog.hero} overflow-hidden`}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px] xl:items-start">
          <div>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2 text-xs font-bold text-white/85">
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">فروشنده منتخب</span>
                  {store.isVerified ? <span className="rounded-full border border-[#d8f0e3]/40 bg-[#d8f0e3]/18 px-3 py-2 text-white">تأیید شده</span> : null}
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">{`${new Intl.NumberFormat('fa-IR').format(productCount)} محصول`}</span>
                </div>
                <h1 className="mt-4 text-3xl font-black md:text-[2.6rem]">{store.name}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/82 md:text-[15px]">
                  {store.description || `محصولات ${store.name} را با فیلتر دسته‌بندی، جستجو و مرتب‌سازی در همین صفحه ببینید.`}
                </p>
              </div>

              {store.logo ? (
                <div className="flex shrink-0 justify-start sm:justify-end">
                  <div className="overflow-hidden rounded-[28px] border border-white/15 bg-white/95 p-3 shadow-[0_18px_44px_rgba(18,28,24,0.18)]">
                     <img alt={store.name} className="h-20 w-20 rounded-[20px] object-cover md:h-24 md:w-24" src={resolveAssetUrl(store.logo)} />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-[24px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <span className="block text-xs font-bold text-white/65">رضایت مشتریان</span>
                <strong className="mt-2 block text-2xl font-black text-white">{formatRating(store.customerRatingAverage)}</strong>
                <p className="mt-1 text-xs text-white/72">بر پایه بازخورد مشتریان</p>
              </div>
              <div className="rounded-[24px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-sm">
                <span className="block text-xs font-bold text-white/65">تعداد نظر</span>
                <strong className="mt-2 block text-2xl font-black text-white">{new Intl.NumberFormat('fa-IR').format(Number(store.customerRatingCount ?? 0))}</strong>
                <p className="mt-1 text-xs text-white/72">ثبت‌شده برای این فروشگاه</p>
              </div>
              <div className="rounded-[24px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-sm sm:col-span-2 xl:col-span-1">
                <span className="block text-xs font-bold text-white/65">زمان تحویل</span>
                <strong className="mt-2 block text-base font-black text-white leading-7">{getDeliveryLabel(store)}</strong>
                <p className="mt-1 text-xs text-white/72">براساس تنظیمات فعلی فروشنده</p>
              </div>
            </div>
          </div>

          <aside className="rounded-[32px] border border-white/10 bg-black/10 p-5 backdrop-blur-sm">
            <h2 className="text-lg font-black">اطلاعات فروشگاه</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-[20px] bg-white/10 px-4 py-4">
                <span className="block text-white/65">روش ارسال</span>
                <strong className="mt-1 block">{store.sameDayDelivery ? 'ارسال همان روز' : 'ارسال استاندارد'}</strong>
              </div>
              {store.hasExpressDelivery ? (
                <div className="rounded-[20px] bg-white/10 px-4 py-4">
                  <span className="block text-white/65">ارسال فوری</span>
                  <strong className="mt-1 block">
                    {typeof store.expressDeliveryHours === 'number'
                      ? `${new Intl.NumberFormat('fa-IR').format(store.expressDeliveryHours)} ساعت`
                      : 'فعال'}
                  </strong>
                </div>
              ) : null}
              {(typeof store.minDeliveryHours === 'number' || typeof store.maxDeliveryHours === 'number') ? (
                <div className="rounded-[20px] bg-white/10 px-4 py-4">
                  <span className="block text-white/65">بازه تحویل</span>
                  <strong className="mt-1 block">
                    {typeof store.minDeliveryHours === 'number' && typeof store.maxDeliveryHours === 'number'
                      ? `${new Intl.NumberFormat('fa-IR').format(store.minDeliveryHours)} تا ${new Intl.NumberFormat('fa-IR').format(store.maxDeliveryHours)} ساعت`
                      : typeof store.minDeliveryHours === 'number'
                        ? `${new Intl.NumberFormat('fa-IR').format(store.minDeliveryHours)} ساعت`
                        : `${new Intl.NumberFormat('fa-IR').format(Number(store.maxDeliveryHours ?? 0))} ساعت`}
                  </strong>
                </div>
              ) : null}
              {store.address ? (
                <div className="rounded-[20px] bg-white/10 px-4 py-4">
                  <span className="block text-white/65">آدرس</span>
                  <strong className="mt-1 block leading-7">{store.address}</strong>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <div className={storefrontCatalog.shell}>
        <aside className={storefrontCatalog.sidebar}>
          <div className="grid gap-5">
            <section>
              <h2 className="text-lg font-black text-[#173126]">جستجو و مرتب‌سازی</h2>
              <form action={basePath} className="mt-4 grid gap-3">
                <input className={storefrontCatalog.input} defaultValue={searchValue || ''} name="search" placeholder="جستجو در محصولات این فروشگاه" />
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
              <div className="mt-4 flex flex-wrap gap-2">
                {productTypes.map((productType) => {
                  const isActive = activeProductTypeSlug === productType.slug
                  return (
                    <Link
                      className={`rounded-full px-4 py-2 text-sm transition ${isActive ? 'bg-[#173126] font-bold text-white' : 'bg-white/80 text-[#173126] hover:bg-white'}`}
                      href={buildHref({ productTypeSlug: productType.slug, page: 1 })}
                      key={productType.id}
                    >
                      {productType.name}
                    </Link>
                  )
                })}
              </div>
            </section>
          </div>
        </aside>

        <div className="grid gap-5">
          <section className={storefrontCatalog.card}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#173126]">محصولات فروشنده</h2>
                <p className="mt-2 text-sm leading-7 text-[#6e6152]">
                  {activeCategory?.name || activeProductType?.name || activeElements.length || searchValue
                    ? 'نتایج بر اساس فیلترهای انتخاب‌شده نمایش داده می‌شود.'
                    : `همه محصولات فعال فروشگاه ${store.name} در این بخش آمده است.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold text-[#80674a]">
                <span className="rounded-full bg-[#f7efe6] px-3 py-2">{`${new Intl.NumberFormat('fa-IR').format(total)} نتیجه`}</span>
                {activeCategory?.name ? <span className="rounded-full bg-[#f7efe6] px-3 py-2">{activeCategory.name}</span> : null}
                {activeProductType?.name ? <span className="rounded-full bg-[#f7efe6] px-3 py-2">{activeProductType.name}</span> : null}
                {activeElements.map((item) => (
                  <span className="rounded-full bg-[#f7efe6] px-3 py-2" key={item.id}>
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {products.length ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard className="h-full" key={product.id} product={product} />
              ))}
            </section>
          ) : (
            <section className={storefrontCatalog.empty}>
              <h3 className="text-xl font-black text-[#173126]">محصولی پیدا نشد</h3>
              <p className="mt-3 text-sm leading-7 text-[#6e6152]">
                فیلترها را سبک‌تر کنید یا دوباره همه محصولات فروشگاه را ببینید.
              </p>
              <div className="mt-4">
                <Link className="inline-flex rounded-full bg-[#173126] px-5 py-3 text-sm font-bold text-white" href={basePath}>
                  بازگشت به همه محصولات فروشنده
                </Link>
              </div>
            </section>
          )}

          {lastPage > 1 ? (
            <nav className="flex flex-wrap items-center justify-center gap-2">
              {paginationItems.map((pageNumber, index) => {
                const previous = paginationItems[index - 1]
                const showGap = typeof previous === 'number' && pageNumber - previous > 1
                const isActive = pageNumber === currentPage

                return (
                  <div className="contents" key={pageNumber}>
                    {showGap ? <span className="px-2 text-sm text-[#92785a]">…</span> : null}
                    <Link
                      className={`inline-flex min-w-11 items-center justify-center rounded-full px-4 py-2 text-sm font-bold transition ${isActive ? 'bg-[#173126] text-white' : 'border border-[#1f6a52]/12 bg-white text-[#173126] hover:bg-[#f8f2ea]'}`}
                      href={buildHref({ page: pageNumber })}
                    >
                      {new Intl.NumberFormat('fa-IR').format(pageNumber)}
                    </Link>
                  </div>
                )
              })}
            </nav>
          ) : null}

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_320px]">
            <article className={storefrontCatalog.card}>
              <h2 className="text-2xl font-black text-[#173126]">درباره فروشنده</h2>
              <div className="mt-4 text-sm leading-8 text-[#5f564c] whitespace-pre-line">
                {store.description || `برای فروشگاه ${store.name} هنوز توضیح کامل ثبت نشده است.`}
              </div>
            </article>

            <aside className="rounded-[30px] border border-[#b7d7c8] bg-[linear-gradient(180deg,rgba(237,248,241,0.98),rgba(224,242,232,0.96))] px-5 py-5 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
              <h2 className="text-xl font-black text-[#224638]">اعتماد و ارسال</h2>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[20px] bg-white/70 px-4 py-4">
                  <span className="block text-xs font-bold text-[#6f8f80]">رضایت مشتریان</span>
                  <strong className="mt-1 block text-base text-[#224638]">{formatRating(store.customerRatingAverage)}</strong>
                </div>
                <div className="rounded-[20px] bg-white/70 px-4 py-4">
                  <span className="block text-xs font-bold text-[#6f8f80]">تعداد نظرات</span>
                  <strong className="mt-1 block text-base text-[#224638]">{new Intl.NumberFormat('fa-IR').format(Number(store.customerRatingCount ?? 0))}</strong>
                </div>
                <div className="rounded-[20px] bg-white/70 px-4 py-4">
                  <span className="block text-xs font-bold text-[#6f8f80]">زمان تحویل</span>
                  <strong className="mt-1 block text-base text-[#224638]">{getDeliveryLabel(store)}</strong>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </div>
  )
}

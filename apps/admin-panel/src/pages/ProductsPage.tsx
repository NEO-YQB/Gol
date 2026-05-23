import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import {
  formatCurrency,
  formatJalaliDate,
  formatPersianNumber,
  getContentReadinessLabel,
  getProductCategory,
  getProductName,
  getProductPrice,
  getProductQuantity,
  getProductDiscountPrice,
  getProductSeoReadinessLabel,
  getProductSlug,
  getProductStatusLabel,
  getProductStore,
  getProductType,
} from '../lib/products'
import type { AuthSession } from '../lib/session'

type ProductsPageProps = {
  session: AuthSession
  onCreateProduct: () => void
  onEditProduct: (product: Record<string, unknown>) => void
}

type ProductRecord = Record<string, unknown>

const productColumns = [
  { key: 'name', label: 'محصول' },
  { key: 'store', label: 'فروشنده' },
  { key: 'catalog', label: 'دسته و نوع' },
  { key: 'pricing', label: 'قیمت و موجودی' },
  { key: 'readiness', label: 'آمادگی' },
  { key: 'updatedAt', label: 'آخرین ویرایش' },
]

const selectionPageSize = 8

export function ProductsPage({ session, onCreateProduct, onEditProduct }: ProductsPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [stores, setStores] = useState<Record<string, unknown>[]>([])
  const [categories, setCategories] = useState<Record<string, unknown>[]>([])
  const [search, setSearch] = useState('')
  const [storeFilter, setStoreFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'LOW' | 'EMPTY'>('ALL')
  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null)
  const [selectionPage, setSelectionPage] = useState(1)
  useNoticeEffect(error, 'error')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [productsPayload, storesPayload, categoriesPayload] = await Promise.all([
          adminApi.getProducts(session, { page: 1, limit: 100 }),
          adminApi.getStores(session),
          adminApi.getCategories(session),
        ])

        if (!active) return

        const nextProducts = toArray((productsPayload as Record<string, unknown>)?.data)
        setProducts(nextProducts)
        setStores(toArray(storesPayload))
        setCategories(toArray(categoriesPayload))

        if (nextProducts.length > 0) {
          setSelectedProductSlug(readText(nextProducts[0], ['slug'], ''))
        }
      } catch (requestError) {
        if (!active) return
        setError(requestError instanceof Error ? requestError.message : 'خطا در بارگذاری کارتابل محصولات')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [session])

  useEffect(() => {
    if (!selectedProductSlug) {
      setSelectedProduct(null)
      return
    }

    const match = products.find((item) => readText(item, ['slug'], '') === selectedProductSlug) ?? null
    setSelectedProduct(match)
  }, [products, selectedProductSlug])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return products.filter((item) => {
      if (storeFilter !== 'ALL' && readText(item, ['storeId'], '') !== storeFilter) return false
      if (categoryFilter !== 'ALL' && readText(item, ['categoryId'], '') !== categoryFilter) return false

      const quantity = getProductQuantity(item)
      if (statusFilter === 'READY' && quantity < 5) return false
      if (statusFilter === 'LOW' && (quantity <= 0 || quantity >= 5)) return false
      if (statusFilter === 'EMPTY' && quantity > 0) return false

      if (!normalizedSearch) return true

      const haystack = [
        getProductName(item),
        getProductSlug(item),
        getProductStore(item),
        getProductCategory(item),
        getProductType(item),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [categoryFilter, products, search, statusFilter, storeFilter])

  useEffect(() => {
    setSelectionPage(1)
  }, [search, storeFilter, categoryFilter, statusFilter])

  useEffect(() => {
    if (filteredProducts.length === 0) {
      setSelectedProductSlug(null)
      return
    }

    const hasSelected = filteredProducts.some((item) => readText(item, ['slug'], '') === selectedProductSlug)
    if (!hasSelected) {
      setSelectedProductSlug(readText(filteredProducts[0], ['slug'], ''))
    }
  }, [filteredProducts, selectedProductSlug])

  const stats = useMemo(
    () => [
      {
        label: 'کل محصول‌ها',
        value: formatPersianNumber(products.length),
        delta: `${formatPersianNumber(filteredProducts.length)} در نمای فعلی`,
        detail: 'کارتابل اصلی برای تیم محتوا و سئو',
        hint: 'این عدد نشان می‌دهد چند محصول در کل وجود دارد و چند مورد با فیلترهای فعلی دیده می‌شوند.',
        tone: 'primary' as const,
      },
      {
        label: 'محصول آماده سئو',
        value: formatPersianNumber(products.filter((item) => getProductSeoReadinessLabel(item) === 'آماده').length),
        delta: 'آماده برای بهینه سازی',
        detail: 'محصول‌هایی که عنوان، توضیح متا و اسلاگ‌شان کامل‌تر است',
        hint: 'محصولی که metadata پایه‌اش تکمیل باشد راحت‌تر وارد مرحله بازبینی و انتشار می‌شود.',
        tone: 'success' as const,
      },
      {
        label: 'کم موجودی / ناموجود',
        value: formatPersianNumber(products.filter((item) => getProductQuantity(item) < 5).length),
        delta: 'نیازمند توجه',
        detail: 'ترکیب وضعیت موجودی برای تصمیم‌های سریع‌تر',
        hint: 'این عدد کمک می‌کند تیم ادمین زودتر محصول‌های نیازمند رسیدگی یا بازنویسی را پیدا کند.',
        tone: 'warning' as const,
      },
    ],
    [filteredProducts.length, products],
  )

  const rows = useMemo(
    () =>
      filteredProducts.slice(0, 20).map((item, index) => ({
        id: readText(item, ['id'], String(index + 1)),
        name: getProductName(item),
        store: getProductStore(item),
        catalog: `${getProductCategory(item)} / ${getProductType(item)}`,
        pricing: `${formatCurrency(getProductPrice(item))} · ${formatPersianNumber(getProductQuantity(item))} عدد`,
        readiness: `${getContentReadinessLabel(item)} · ${getProductSeoReadinessLabel(item)}`,
        updatedAt: formatJalaliDate(item.updatedAt ?? item.createdAt, true),
      })),
    [filteredProducts],
  )

  const paginatedSelection = useMemo(
    () => filteredProducts.slice((selectionPage - 1) * selectionPageSize, selectionPage * selectionPageSize),
    [filteredProducts, selectionPage],
  )

  const totalSelectionPages = Math.max(1, Math.ceil(filteredProducts.length / selectionPageSize))

  const selectionSummary = selectedProduct
    ? [
        { label: 'وضعیت موجودی', value: getProductStatusLabel(selectedProduct) },
        { label: 'آمادگی محتوایی', value: getContentReadinessLabel(selectedProduct) },
        { label: 'آمادگی سئو', value: getProductSeoReadinessLabel(selectedProduct) },
        { label: 'قیمت فعلی', value: formatCurrency(getProductPrice(selectedProduct)) },
        {
          label: 'قیمت تخفیفی',
          value: getProductDiscountPrice(selectedProduct) > 0 ? formatCurrency(getProductDiscountPrice(selectedProduct)) : 'ثبت نشده',
        },
        { label: 'آخرین به‌روزرسانی', value: formatJalaliDate(selectedProduct.updatedAt ?? selectedProduct.createdAt, true) },
      ]
    : []

  return (
    <div className="fm-stack products-page">
      <LoadableState error={error} loading={loading}>
        <div className="fm-grid refined-stat-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>
      </LoadableState>

      <div className="products-toolbar">
        <SectionCard
          eyebrow="کارتابل محصولات"
          title="فهرست فشرده برای triage محتوایی، سئو و تعریف محصول"
          description="این صفحه برای اسکن سریع محصول‌ها، تشخیص آمادگی و ورود به workspace کامل ساخت یا ویرایش محصول طراحی شده است."
          actions={
            <div className="products-header-actions">
              <button className="content-secondary-action" onClick={onCreateProduct} type="button">
                تعریف محصول جدید
              </button>
            </div>
          }
        >
          <div className="products-filters">
            <input
              className="fm-input content-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جستجو در نام محصول، اسلاگ، فروشنده یا دسته بندی"
              type="search"
              value={search}
            />
            <select className="fm-input" onChange={(event) => setStoreFilter(event.target.value)} value={storeFilter}>
              <option value="ALL">همه فروشنده‌ها</option>
              {stores.map((store) => (
                <option key={readText(store, ['id'], '')} value={readText(store, ['id'], '')}>
                  {readText(store, ['name'], 'فروشگاه')}
                </option>
              ))}
            </select>
            <select className="fm-input" onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
              <option value="ALL">همه دسته‌بندی‌ها</option>
              {categories.map((category) => (
                <option key={readText(category, ['id'], '')} value={readText(category, ['id'], '')}>
                  {readText(category, ['name', 'title'], 'دسته‌بندی')}
                </option>
              ))}
            </select>
            <div className="products-filter-chips">
              {[
                { key: 'ALL', label: 'همه وضعیت‌ها' },
                { key: 'READY', label: 'آماده فروش' },
                { key: 'LOW', label: 'کم موجودی' },
                { key: 'EMPTY', label: 'ناموجود' },
              ].map((item) => (
                <button
                  key={item.key}
                  className={`products-filter-chip${statusFilter === item.key ? ' is-active' : ''}`}
                  onClick={() => setStatusFilter(item.key as typeof statusFilter)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="products-layout">
        <div className="products-table-card">
          <SectionCard eyebrow="نمای جدولی" title="کارتابل خلاصه محصول‌ها" description="جدول برای scan سریع و مقایسه استفاده می‌شود؛ ویرایش کامل داخل workspace جدا انجام می‌شود.">
            <DataTable columns={productColumns} rows={rows} />
          </SectionCard>
        </div>

        <div className="products-lower-grid">
          <SectionCard eyebrow="صف انتخاب" title="محصول‌های نمای فعلی" description="در این بخش محصول موردنظر را انتخاب کن تا summary کوتاه و actionهای سریع آن را ببینی.">
            <div className="products-selection-list">
              {paginatedSelection.map((item) => {
                const slug = readText(item, ['slug'], '')
                const active = slug === selectedProductSlug
                return (
                  <button
                    key={slug}
                    className={`products-selection-item${active ? ' is-active' : ''}`}
                    onClick={() => setSelectedProductSlug(slug)}
                    type="button"
                  >
                    <strong>{getProductName(item)}</strong>
                    <span>{getProductStore(item)}</span>
                    <small>{`${getProductCategory(item)} / ${getProductType(item)}`}</small>
                  </button>
                )
              })}
            </div>

            <div className="orders-pagination">
              <span>{`صفحه ${formatPersianNumber(selectionPage)} از ${formatPersianNumber(totalSelectionPages)}`}</span>
              <div className="orders-inline-actions">
                <button
                  className="orders-pagination-button"
                  disabled={selectionPage <= 1}
                  onClick={() => setSelectionPage((page) => Math.max(1, page - 1))}
                  type="button"
                >
                  قبلی
                </button>
                <button
                  className="orders-pagination-button"
                  disabled={selectionPage >= totalSelectionPages}
                  onClick={() => setSelectionPage((page) => Math.min(totalSelectionPages, page + 1))}
                  type="button"
                >
                  بعدی
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="ورود به workspace"
            title={selectedProduct ? `ادامه روی ${getProductName(selectedProduct)}` : 'هنوز محصولی انتخاب نشده'}
            description="ورود به workspace باید کنار فهرست انتخاب بماند تا بعد از انتخاب، کاربر سریع وارد سطح focused ویرایش شود."
            actions={
              selectedProduct ? (
                <button className="content-primary-action" onClick={() => onEditProduct(selectedProduct)} type="button">
                  ورود به workspace محصول
                </button>
              ) : undefined
            }
          >
            {selectedProduct ? (
              <div className="products-summary-grid">
                {selectionSummary.map((item) => (
                  <article className="products-summary-item" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>
            ) : (
              <p className="products-muted-note">برای دیدن summary و actionهای سریع، یک محصول را از فهرست انتخاب کن.</p>
            )}
          </SectionCard>
        </div>

        <div className="products-detail-column">
          <SectionCard eyebrow="تصمیم سریع" title="برداشت اجرایی از محصول" description="بدون بازکردن editor کامل هم باید بدانی این محصول الان بیشتر به چه نوع رسیدگی نیاز دارد.">
            {selectedProduct ? (
              <div className="products-brief-list">
                <article className="products-brief-item">
                  <strong>وضعیت کارتابل</strong>
                  <p>{`این محصول برای ${getContentReadinessLabel(selectedProduct) === 'آماده' ? 'مرحله بازبینی و polish' : 'تکمیل محتوای اصلی'} مناسب‌تر است.`}</p>
                </article>
                <article className="products-brief-item">
                  <strong>سیگنال سئو</strong>
                  <p>{`آمادگی سئوی محصول در حال حاضر ${getProductSeoReadinessLabel(selectedProduct)} است و باید قبل از نهایی‌سازی بررسی شود.`}</p>
                </article>
                <article className="products-brief-item">
                  <strong>موجودی و قیمت</strong>
                  <p>{`موجودی فعلی ${formatPersianNumber(getProductQuantity(selectedProduct))} عدد است و قیمت پایه ${formatCurrency(getProductPrice(selectedProduct))} ثبت شده.`}</p>
                </article>
              </div>
            ) : (
              <p className="products-muted-note">این بخش بعد از انتخاب محصول، خلاصه تصمیم‌محور و کوتاه همان آیتم را نمایش می‌دهد.</p>
            )}
          </SectionCard>

          <SectionCard eyebrow="راهنمای UX" title="قاعده این route" description="صفحه اصلی سبک می‌ماند و فرم سنگین یا preview کامل را به workspace جدا می‌فرستد.">
            <div className="access-control-capability-list compact-capability-list">
              <Pill tone="success">تاریخ شمسی</Pill>
              <Pill tone="warning">summary کوتاه</Pill>
              <Pill>workspace جدا</Pill>
              <Pill>hint فارسی</Pill>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

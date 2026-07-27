import { Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
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
  onOpenCategoryWorkspace: () => void
  onOpenProductTypeWorkspace: () => void
}

type ProductRecord = Record<string, unknown>
type ProductElementRecord = Record<string, unknown>

const selectionPageSize = 8

function getProductElementTypeLabel(type: string) {
  switch (type) {
    case 'FLOWER':
      return 'گل'
    case 'FILLER':
      return 'پرکننده'
    case 'BASE':
      return 'بیس'
    case 'ACCESSORY':
      return 'اکسسوری'
    default:
      return type || 'نامشخص'
  }
}

function getPublicationStatusLabel(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'پیش‌نویس'
    case 'SUBMITTED':
      return 'در بازبینی'
    case 'CHANGES_REQUESTED':
      return 'نیازمند اصلاح'
    case 'APPROVED':
      return 'تایید شده'
    case 'PUBLISHED':
      return 'منتشرشده'
    case 'REJECTED':
      return 'رد شده'
    default:
      return status || 'نامشخص'
  }
}

export function ProductsPage({ session, onCreateProduct, onEditProduct, onOpenCategoryWorkspace, onOpenProductTypeWorkspace }: ProductsPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [elementError, setElementError] = useState<string | null>(null)
  const [elementMessage, setElementMessage] = useState<string | null>(null)
  const [savingElement, setSavingElement] = useState(false)
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [elements, setElements] = useState<ProductElementRecord[]>([])
  const [stores, setStores] = useState<Record<string, unknown>[]>([])
  const [categories, setCategories] = useState<Record<string, unknown>[]>([])
  const [search, setSearch] = useState('')
  const [storeFilter, setStoreFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'LOW' | 'EMPTY' | 'SUBMITTED' | 'CHANGES' | 'PUBLISHED'>('ALL')
  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null)
  const [selectionPage, setSelectionPage] = useState(1)
  useNoticeEffect(error, 'error')
  useNoticeEffect(elementError, 'error')
  useNoticeEffect(elementMessage, 'success')
  const [elementForm, setElementForm] = useState({
    name: '',
    type: 'FLOWER' as 'FLOWER' | 'FILLER' | 'BASE' | 'ACCESSORY',
    unit: 'شاخه',
    image: '',
  })

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [productsPayload, storesPayload, categoriesPayload, elementsPayload] = await Promise.all([
          adminApi.getProducts(session, { page: 1, limit: 100 }),
          adminApi.getStores(session),
          adminApi.getCategories(session),
          adminApi.getProductElements(session),
        ])

        if (!active) return

        const nextProducts = toArray((productsPayload as Record<string, unknown>)?.data)
        setProducts(nextProducts)
        setStores(toArray(storesPayload))
        setCategories(toArray(categoriesPayload))
        setElements(toArray(elementsPayload))

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
      const publicationStatus = readText(item, ['publicationStatus'], '')
      if (statusFilter === 'READY' && quantity < 5) return false
      if (statusFilter === 'LOW' && (quantity <= 0 || quantity >= 5)) return false
      if (statusFilter === 'EMPTY' && quantity > 0) return false
      if (statusFilter === 'SUBMITTED' && publicationStatus !== 'SUBMITTED') return false
      if (statusFilter === 'CHANGES' && publicationStatus !== 'CHANGES_REQUESTED') return false
      if (statusFilter === 'PUBLISHED' && publicationStatus !== 'PUBLISHED') return false

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
        label: 'کل',
        value: formatPersianNumber(products.length),
        delta: `${formatPersianNumber(filteredProducts.length)} در فیلتر`,
        detail: '',
        tone: 'primary' as const,
      },
      {
        label: 'سئو آماده',
        value: formatPersianNumber(products.filter((item) => getProductSeoReadinessLabel(item) === 'آماده').length),
        delta: 'metadata کامل',
        detail: '',
        tone: 'success' as const,
      },
      {
        label: 'موجودی کم',
        value: formatPersianNumber(products.filter((item) => getProductQuantity(item) < 5).length),
        delta: 'نیازمند توجه',
        detail: '',
        tone: 'warning' as const,
      },
      {
        label: 'بازبینی',
        value: formatPersianNumber(products.filter((item) => readText(item, ['publicationStatus'], '') === 'SUBMITTED').length),
        delta: 'منتظر تصمیم',
        detail: '',
        tone: 'danger' as const,
      },
    ],
    [filteredProducts.length, products],
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
        { label: 'انتشار', value: getPublicationStatusLabel(readText(selectedProduct, ['publicationStatus'], 'DRAFT')) },
        { label: 'قیمت فعلی', value: formatCurrency(getProductPrice(selectedProduct)) },
        {
          label: 'قیمت تخفیفی',
          value: getProductDiscountPrice(selectedProduct) > 0 ? formatCurrency(getProductDiscountPrice(selectedProduct)) : 'ثبت نشده',
        },
        { label: 'آخرین به‌روزرسانی', value: formatJalaliDate(selectedProduct.updatedAt ?? selectedProduct.createdAt, true) },
      ]
    : []

  async function handleCreateElement() {
    if (!elementForm.name.trim()) {
      setElementError('نام جزء را وارد کن.')
      return
    }

    setSavingElement(true)
    setElementError(null)
    setElementMessage(null)

    try {
      await adminApi.createProductElement(session, {
        name: elementForm.name.trim(),
        type: elementForm.type,
        unit: elementForm.unit.trim() || undefined,
        image: elementForm.image.trim() || undefined,
      })
      const nextElements = await adminApi.getProductElements(session)
      setElements(toArray(nextElements))
      setElementForm({ name: '', type: 'FLOWER', unit: 'شاخه', image: '' })
      setElementMessage('جزء جدید با موفقیت اضافه شد.')
    } catch (requestError) {
      setElementError(requestError instanceof Error ? requestError.message : 'ثبت جزء جدید ناموفق بود')
    } finally {
      setSavingElement(false)
    }
  }

  async function handleRemoveElement(elementId: string) {
    setSavingElement(true)
    setElementError(null)
    setElementMessage(null)

    try {
      await adminApi.removeProductElement(session, elementId)
      const nextElements = await adminApi.getProductElements(session)
      setElements(toArray(nextElements))
      setElementMessage('جزء با موفقیت حذف شد.')
    } catch (requestError) {
      setElementError(requestError instanceof Error ? requestError.message : 'حذف جزء ناموفق بود')
    } finally {
      setSavingElement(false)
    }
  }

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
          eyebrow="محصولات"
          title="کارتابل محصول"
          actions={
            <div className="products-header-actions">
              <button className="content-secondary-action" onClick={onOpenCategoryWorkspace} type="button">
                دسته‌بندی
              </button>
              <button className="content-secondary-action" onClick={onOpenProductTypeWorkspace} type="button">
                نوع کالا
              </button>
              <button className="content-secondary-action" onClick={onCreateProduct} type="button">
                محصول جدید
              </button>
            </div>
          }
        >
          <div className="products-filters">
            <input
              className="fm-input content-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جستجو محصول، اسلاگ، فروشنده"
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
                { key: 'SUBMITTED', label: 'در صف بازبینی' },
                { key: 'CHANGES', label: 'برگشتی برای اصلاح' },
                { key: 'PUBLISHED', label: 'منتشرشده' },
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

      <SectionCard
        eyebrow="المان‌ها"
        title="اجزای سراسری"
      >
        <div className="products-elements-layout product-workspace-page">
          <div className="products-elements-form">
            <label className="fm-field">
              <span>نام جزء</span>
              <input
                className="fm-input"
                onChange={(event) => setElementForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="مثلاً آفتابگردان"
                value={elementForm.name}
              />
            </label>
            <label className="fm-field">
              <span>نوع</span>
              <select className="fm-input" onChange={(event) => setElementForm((current) => ({ ...current, type: event.target.value as typeof current.type }))} value={elementForm.type}>
                <option value="FLOWER">گل</option>
                <option value="FILLER">پرکننده</option>
                <option value="ACCESSORY">اکسسوری</option>
                <option value="BASE">بیس</option>
              </select>
            </label>
            <label className="fm-field">
              <span>واحد</span>
              <input
                className="fm-input"
                onChange={(event) => setElementForm((current) => ({ ...current, unit: event.target.value }))}
                placeholder="مثلاً شاخه"
                value={elementForm.unit}
              />
            </label>
            <label className="fm-field">
              <span>تصویر مرجع</span>
              <input
                className="fm-input"
                onChange={(event) => setElementForm((current) => ({ ...current, image: event.target.value }))}
                placeholder="اختیاری"
                value={elementForm.image}
              />
            </label>
            <div className="products-header-actions">
              <button className="content-primary-action" disabled={savingElement} onClick={() => void handleCreateElement()} type="button">
                {savingElement ? 'در حال ثبت...' : 'افزودن جزء'}
              </button>
            </div>
            {elementMessage ? <p className="products-muted-note">{elementMessage}</p> : null}
            {elementError ? <p className="products-muted-note">{elementError}</p> : null}
          </div>

          <div className="products-elements-list">
            {elements.length ? (
              elements.map((item) => (
                <article className="products-element-item" key={readText(item, ['id'], '')}>
                  <strong>{readText(item, ['name'], 'جزء بدون نام')}</strong>
                  <span>{`${getProductElementTypeLabel(readText(item, ['type'], ''))} · ${readText(item, ['unit'], 'واحد نامشخص')}`}</span>
                  <div className="products-header-actions">
                    <button className="content-secondary-action" disabled={savingElement} onClick={() => void handleRemoveElement(readText(item, ['id'], ''))} type="button">
                      حذف
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="products-muted-note">هنوز هیچ جزء سراسری تعریف نشده است.</p>
            )}
          </div>
        </div>
      </SectionCard>

      <div className="products-layout">
        <div className="products-lower-grid">
          <SectionCard eyebrow="فهرست" title="محصول‌ها">
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
                      <div className="products-selection-meta">
                        <Pill>{getPublicationStatusLabel(readText(item, ['publicationStatus'], 'DRAFT'))}</Pill>
                        <Pill tone={getProductQuantity(item) > 0 ? 'success' : 'danger'}>{getProductStatusLabel(item)}</Pill>
                        <Pill>{formatCurrency(getProductPrice(item))}</Pill>
                      </div>
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
            eyebrow="میزکار"
            title={selectedProduct ? `ادامه روی ${getProductName(selectedProduct)}` : 'هنوز محصولی انتخاب نشده'}
            actions={
              selectedProduct ? (
                <button className="content-primary-action" onClick={() => onEditProduct(selectedProduct)} type="button">
                  باز کردن میزکار
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
          <SectionCard eyebrow="خلاصه" title="وضعیت انتخاب">
            {selectedProduct ? (
              <div className="products-brief-list">
                <article className="products-brief-item">
                  <strong>محتوا</strong>
                  <p>{getContentReadinessLabel(selectedProduct)}</p>
                </article>
                <article className="products-brief-item">
                  <strong>سئو</strong>
                  <p>{getProductSeoReadinessLabel(selectedProduct)}</p>
                </article>
                <article className="products-brief-item">
                  <strong>موجودی و قیمت</strong>
                  <p>{`${formatPersianNumber(getProductQuantity(selectedProduct))} عدد · ${formatCurrency(getProductPrice(selectedProduct))}`}</p>
                </article>
              </div>
            ) : (
              <p className="products-muted-note">این بخش بعد از انتخاب محصول، خلاصه تصمیم‌محور و کوتاه همان آیتم را نمایش می‌دهد.</p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

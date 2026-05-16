import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi, type VendorProductPayload } from '../lib/api'
import { formatFaNumber, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type ProductRecord = Record<string, unknown>
type CategoryRecord = Record<string, unknown>
type ProductTypeRecord = Record<string, unknown>

type ProductFormState = {
  name: string
  categoryId: string
  productTypeId: string
  price: string
  discountPrice: string
  quantity: string
  mainImage: string
  imagesText: string
  videoUrl: string
  shortDescription: string
  description: string
  metaTitle: string
  metaDescription: string
}

type ProductOption = {
  id: string
  label: string
}

const productColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'name', label: 'محصول' },
  { key: 'category', label: 'دسته' },
  { key: 'price', label: 'قیمت' },
  { key: 'quantity', label: 'موجودی' },
]

const initialFormState: ProductFormState = {
  name: '',
  categoryId: '',
  productTypeId: '',
  price: '',
  discountPrice: '',
  quantity: '',
  mainImage: '',
  imagesText: '',
  videoUrl: '',
  shortDescription: '',
  description: '',
  metaTitle: '',
  metaDescription: '',
}

function getProductName(record: ProductRecord) {
  return readText(record, ['name'], '—')
}

function getProductCategory(record: ProductRecord) {
  const category = record.category
  if (typeof category === 'object' && category !== null) {
    return readText(category as ProductRecord, ['name', 'title'], '—')
  }

  return readText(record, ['categoryName'], '—')
}

function getProductType(record: ProductRecord) {
  const productType = record.productType
  if (typeof productType === 'object' && productType !== null) {
    return readText(productType as ProductRecord, ['name'], '—')
  }

  return readText(record, ['productTypeName'], '—')
}

function getProductQuantity(record: ProductRecord) {
  return Number(readText(record, ['quantity'], '0'))
}

function getProductPrice(record: ProductRecord) {
  return Number(readText(record, ['price'], '0'))
}

function getDiscountPrice(record: ProductRecord) {
  const raw = readText(record, ['discountPrice'], '')
  if (!raw || raw === '—') return null
  const numeric = Number(raw)
  return Number.isNaN(numeric) ? null : numeric
}

function getInventoryState(record: ProductRecord) {
  const quantity = getProductQuantity(record)
  const discountPrice = getDiscountPrice(record)

  if (quantity <= 0) return 'ناموجود'
  if (quantity <= 5) return 'کم‌موجودی'
  if (discountPrice !== null && discountPrice > 0) return 'دارای تخفیف'
  return 'عادی'
}

function inventoryOptions(items: ProductRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getInventoryState(item))))
  return ['ALL', ...unique]
}

function flattenCategories(items: CategoryRecord[], depth = 0): ProductOption[] {
  return items.flatMap((item) => {
    const id = readText(item, ['id'], '')
    const name = readText(item, ['name', 'title'], 'دسته بدون نام')
    const prefix = depth > 0 ? `${'— '.repeat(depth)}` : ''
    const children = Array.isArray(item.children) ? item.children.map((child) => (typeof child === 'object' && child !== null ? (child as CategoryRecord) : {})) : []

    return [
      { id, label: `${prefix}${name}` },
      ...flattenCategories(children, depth + 1),
    ]
  })
}

function buildPayload(form: ProductFormState, storeId: number): VendorProductPayload {
  const images = form.imagesText
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    shortDescription: form.shortDescription.trim() || undefined,
    price: Number(form.price),
    discountPrice: form.discountPrice.trim() ? Number(form.discountPrice) : undefined,
    quantity: Number(form.quantity),
    mainImage: form.mainImage.trim(),
    images: images.length > 0 ? images : undefined,
    videoUrl: form.videoUrl.trim() || undefined,
    categoryId: Number(form.categoryId),
    storeId,
    productTypeId: Number(form.productTypeId),
    metaTitle: form.metaTitle.trim() || undefined,
    metaDescription: form.metaDescription.trim() || undefined,
  }
}

function formatPrice(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—'
  return `${formatFaNumber(value)} تومان`
}

function getImagesText(record: ProductRecord) {
  if (!Array.isArray(record.images)) return ''
  return record.images.map((item) => String(item)).join('\n')
}

export function ProductsPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [categoryOptions, setCategoryOptions] = useState<ProductOption[]>([])
  const [productTypeOptions, setProductTypeOptions] = useState<ProductOption[]>([])
  const [search, setSearch] = useState('')
  const [inventoryFilter, setInventoryFilter] = useState('ALL')
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [storeId, setStoreId] = useState<number>(0)
  const [form, setForm] = useState<ProductFormState>(initialFormState)

  async function loadProductData(activeRef = { current: true }) {
    const health = await vendorApi.getHealthSummary(session)
    if (!activeRef.current) return

    const store = (((health as Record<string, unknown>).store as Record<string, unknown>) ?? {})
    const nextStoreId = Number(readText(store, ['id'], '0'))
    setStoreId(nextStoreId)

    const [productsPayload, categoriesPayload, productTypesPayload] = await Promise.all([
      nextStoreId ? vendorApi.getProducts(session, { storeId: nextStoreId, search, limit: 50 }) : Promise.resolve({ data: [] }),
      vendorApi.getCategories(),
      vendorApi.getProductTypes(),
    ])
    if (!activeRef.current) return

    const productList = toArray(productsPayload)
    const categoryList = toArray(categoriesPayload)
    const productTypeList = toArray(productTypesPayload)
    const nextCategoryOptions = flattenCategories(categoryList)
    const nextProductTypeOptions = productTypeList.map((item) => ({
      id: readText(item, ['id'], ''),
      label: readText(item, ['name'], 'نوع بدون نام'),
    }))

    setProducts(productList)
    setCategoryOptions(nextCategoryOptions)
    setProductTypeOptions(nextProductTypeOptions)

    if (productList.length > 0) {
      setSelectedProductId((current) => current ?? readText(productList[0], ['id'], ''))
    }

    setForm((current) => ({
      ...current,
      categoryId: current.categoryId || nextCategoryOptions[0]?.id || '',
      productTypeId: current.productTypeId || nextProductTypeOptions[0]?.id || '',
    }))
  }

  useEffect(() => {
    const activeRef = { current: true }

    async function load() {
      setLoading(true)
      setError(null)

      try {
        await loadProductData(activeRef)
      } catch (loadError) {
        if (!activeRef.current) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری محصولات فروشگاه')
      } finally {
        if (activeRef.current) setLoading(false)
      }
    }

    void load()
    return () => {
      activeRef.current = false
    }
  }, [search, session])

  const filteredProducts = useMemo(
    () => products.filter((item) => (inventoryFilter === 'ALL' ? true : getInventoryState(item) === inventoryFilter)),
    [inventoryFilter, products],
  )

  useEffect(() => {
    if (filteredProducts.length === 0) {
      setSelectedProductId(null)
      return
    }

    const hasSelected = filteredProducts.some((item) => readText(item, ['id'], '') === selectedProductId)
    if (!hasSelected) {
      setSelectedProductId(readText(filteredProducts[0], ['id'], ''))
    }
  }, [filteredProducts, selectedProductId])

  const rows = useMemo(
    () =>
      filteredProducts.slice(0, 20).map((item, index) => ({
        id: readText(item, ['id'], String(index + 1)),
        name: getProductName(item),
        category: getProductCategory(item),
        price: formatPrice(getProductPrice(item)),
        quantity: formatFaNumber(getProductQuantity(item)),
      })),
    [filteredProducts],
  )

  const stats = useMemo(
    () => [
      {
        label: 'کل محصولات',
        value: formatFaNumber(products.length),
        delta: `${formatFaNumber(filteredProducts.length)} در view فعلی`,
        detail: 'صف اصلی محصولات فروشگاه',
        tone: 'primary' as const,
      },
      {
        label: 'کم‌موجودی',
        value: formatFaNumber(products.filter((item) => getProductQuantity(item) > 0 && getProductQuantity(item) <= 5).length),
        delta: 'نیازمند تامین',
        detail: 'محصول‌هایی که به refill نزدیک شده‌اند',
        tone: 'warning' as const,
      },
      {
        label: 'ناموجود',
        value: formatFaNumber(products.filter((item) => getProductQuantity(item) <= 0).length),
        delta: 'خارج از چرخه فروش',
        detail: 'محصول‌هایی که فعلا موجودی ندارند',
        tone: 'danger' as const,
      },
      {
        label: 'دارای تخفیف',
        value: formatFaNumber(products.filter((item) => getDiscountPrice(item) !== null).length),
        delta: 'آماده promotion',
        detail: 'محصول‌هایی که discountPrice دارند',
        tone: 'success' as const,
      },
    ],
    [filteredProducts.length, products],
  )

  const selectedProduct = useMemo(
    () => filteredProducts.find((item) => readText(item, ['id'], '') === selectedProductId) ?? null,
    [filteredProducts, selectedProductId],
  )

  const selectedSummary = selectedProduct
    ? [
        { label: 'شناسه', value: readText(selectedProduct, ['id'], '—') },
        { label: 'نام محصول', value: getProductName(selectedProduct) },
        { label: 'دسته‌بندی', value: getProductCategory(selectedProduct) },
        { label: 'نوع محصول', value: getProductType(selectedProduct) },
        { label: 'وضعیت موجودی', value: getInventoryState(selectedProduct) },
        { label: 'قیمت پایه', value: formatPrice(getProductPrice(selectedProduct)) },
        { label: 'قیمت با تخفیف', value: getDiscountPrice(selectedProduct) === null ? 'بدون تخفیف' : formatPrice(getDiscountPrice(selectedProduct)) },
        { label: 'موجودی', value: formatFaNumber(getProductQuantity(selectedProduct)) },
        { label: 'اسلاگ', value: readText(selectedProduct, ['slug'], '—') },
      ]
    : []

  function resetForm() {
    setEditingProductId(null)
    setFormError(null)
    setFormMessage(null)
    setForm({
      ...initialFormState,
      categoryId: categoryOptions[0]?.id || '',
      productTypeId: productTypeOptions[0]?.id || '',
    })
  }

  function handleStartEdit() {
    if (!selectedProduct) return

    setEditingProductId(readText(selectedProduct, ['id'], ''))
    setFormError(null)
    setFormMessage(null)
    setForm({
      name: readText(selectedProduct, ['name'], ''),
      categoryId: readText(selectedProduct, ['categoryId'], readText((selectedProduct.category as ProductRecord) ?? {}, ['id'], '')),
      productTypeId: readText(selectedProduct, ['productTypeId'], readText((selectedProduct.productType as ProductRecord) ?? {}, ['id'], '')),
      price: readText(selectedProduct, ['price'], ''),
      discountPrice: readText(selectedProduct, ['discountPrice'], ''),
      quantity: readText(selectedProduct, ['quantity'], ''),
      mainImage: readText(selectedProduct, ['mainImage'], ''),
      imagesText: getImagesText(selectedProduct),
      videoUrl: readText(selectedProduct, ['videoUrl'], ''),
      shortDescription: readText(selectedProduct, ['shortDescription'], ''),
      description: readText(selectedProduct, ['description'], ''),
      metaTitle: readText(selectedProduct, ['metaTitle'], ''),
      metaDescription: readText(selectedProduct, ['metaDescription'], ''),
    })
  }

  async function handleDelete() {
    if (!selectedProduct) return

    setSaving(true)
    setFormError(null)
    setFormMessage(null)

    try {
      await vendorApi.deleteProduct(session, Number(readText(selectedProduct, ['id'], '0')))
      setFormMessage('محصول با موفقیت حذف شد.')
      setEditingProductId(null)
      await loadProductData({ current: true })
    } catch (deleteError) {
      setFormError(deleteError instanceof Error ? deleteError.message : 'حذف محصول ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    if (!storeId) {
      setFormError('فروشگاه فعالی برای این حساب پیدا نشد.')
      return
    }

    if (!form.name.trim() || !form.categoryId || !form.productTypeId || !form.price.trim() || !form.quantity.trim() || !form.mainImage.trim()) {
      setFormError('نام، دسته‌بندی، نوع محصول، قیمت، موجودی و تصویر اصلی الزامی هستند.')
      return
    }

    setSaving(true)
    setFormError(null)
    setFormMessage(null)

    try {
      const payload = buildPayload(form, storeId)

      if (editingProductId) {
        await vendorApi.updateProduct(session, Number(editingProductId), payload)
        setFormMessage('محصول با موفقیت به‌روزرسانی شد.')
      } else {
        await vendorApi.createProduct(session, payload)
        setFormMessage('محصول جدید با موفقیت ایجاد شد.')
      }

      await loadProductData({ current: true })
      resetForm()
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'ذخیره محصول ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fm-stack">
      <LoadableState loading={loading} error={error}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="کارتابل محصولات"
          title="workspace محصولات فروشگاه"
          description="این route حالا از visibility ساده عبور کرده و surface اولیه مدیریت محصول، موجودی و آماده‌سازی promotion را باز می‌کند."
          actions={<Pill tone="primary">محصولات v2</Pill>}
        >
          <div className="vendor-products-toolbar">
            <div className="fm-field vendor-products-search">
              <label htmlFor="vendor-products-search">جستجو</label>
              <input
                id="vendor-products-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="نام محصول یا بخشی از عنوان"
                value={search}
              />
            </div>

            <div className="vendor-products-filters">
              {inventoryOptions(products).map((status) => (
                <button
                  className={`vendor-products-filter-chip ${status === inventoryFilter ? 'is-active' : ''}`}
                  key={status}
                  onClick={() => setInventoryFilter(status)}
                  type="button"
                >
                  {status === 'ALL' ? 'همه وضعیت‌ها' : status}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        <div className="vendor-products-layout">
          <SectionCard
            eyebrow="جدول محصولات"
            title="لیست محصولات قابل اسکن"
            description="فروشنده باید بتواند سریع ببیند کدام محصول نیاز به تامین، تخفیف یا بازنویسی data دارد."
            actions={<Pill tone="success">{`${formatFaNumber(filteredProducts.length)} محصول`}</Pill>}
          >
            <div className="vendor-products-table-card">
              <DataTable columns={productColumns} rows={rows} />

              <div className="vendor-products-selection-list">
                {filteredProducts.slice(0, 8).map((item) => {
                  const id = readText(item, ['id'], '—')
                  const isActive = id === selectedProductId

                  return (
                    <button
                      className={`vendor-products-selection-item ${isActive ? 'is-active' : ''}`}
                      key={id}
                      onClick={() => setSelectedProductId(id)}
                      type="button"
                    >
                      <strong>{getProductName(item)}</strong>
                      <span>{getProductCategory(item)}</span>
                      <small>{getInventoryState(item)}</small>
                    </button>
                  )
                })}
              </div>
            </div>
          </SectionCard>

          <div className="vendor-products-detail-column">
            <SectionCard
              eyebrow="محصول انتخاب‌شده"
              title={selectedProduct ? getProductName(selectedProduct) : 'محصولی انتخاب نشده'}
              description="این summary حالا نقطه ورود به actionهای inventory، data hygiene و promotion readiness است."
              actions={<Pill tone="warning">{selectedProduct ? getInventoryState(selectedProduct) : 'بدون انتخاب'}</Pill>}
            >
              {selectedSummary.length ? (
                <div className="vendor-products-detail-grid">
                  {selectedSummary.map((item) => (
                    <article className="vendor-products-detail-item" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                  <article className="vendor-products-detail-item vendor-products-detail-item--wide">
                    <span>یادداشت کارتابل</span>
                    <strong>
                      این سطح حالا برای ویرایش inventory، metadata، تصویر اصلی و آماده‌سازی سریع promotion روی هر محصول استفاده می‌شود.
                    </strong>
                  </article>
                </div>
              ) : (
                <div className="vendor-note-card">در این فیلتر هنوز محصولی برای نمایش جزئیات وجود ندارد.</div>
              )}
            </SectionCard>

            <SectionCard
              eyebrow="مدیریت محصول"
              title={editingProductId ? 'ویرایش محصول انتخاب‌شده' : 'ایجاد محصول جدید'}
              description="در این مرحله فروشنده می‌تواند محصول جدید بسازد یا اطلاعات محصول موجود را برای موجودی، تصویر و دسته‌بندی کامل‌تر کند."
              actions={
                <div className="vendor-products-actions">
                  <button className="fm-button fm-button--ghost" onClick={resetForm} type="button">
                    محصول جدید
                  </button>
                  <button
                    className="fm-button fm-button--secondary"
                    disabled={!selectedProduct}
                    onClick={handleStartEdit}
                    type="button"
                  >
                    ویرایش انتخاب‌شده
                  </button>
                  <button
                    className="fm-button fm-button--secondary"
                    disabled={!selectedProduct || saving}
                    onClick={handleDelete}
                    type="button"
                  >
                    حذف انتخاب‌شده
                  </button>
                </div>
              }
            >
              <div className="vendor-products-form-grid">
                <div className="fm-field">
                  <label htmlFor="product-name">نام محصول</label>
                  <input
                    id="product-name"
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="مثلا باکس رز سفید"
                    value={form.name}
                  />
                </div>

                <div className="fm-field">
                  <label htmlFor="product-quantity">موجودی</label>
                  <input
                    id="product-quantity"
                    inputMode="numeric"
                    onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                    placeholder="مثلا ۱۲"
                    value={form.quantity}
                  />
                </div>

                <div className="fm-field">
                  <label htmlFor="product-category">دسته‌بندی</label>
                  <select
                    id="product-category"
                    onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                    value={form.categoryId}
                  >
                    {!categoryOptions.length ? <option value="">دسته‌بندی در دسترس نیست</option> : null}
                    {categoryOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fm-field">
                  <label htmlFor="product-type">نوع محصول</label>
                  <select
                    id="product-type"
                    onChange={(event) => setForm((current) => ({ ...current, productTypeId: event.target.value }))}
                    value={form.productTypeId}
                  >
                    {!productTypeOptions.length ? <option value="">نوع محصول در دسترس نیست</option> : null}
                    {productTypeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fm-field">
                  <label htmlFor="product-price">قیمت پایه</label>
                  <input
                    id="product-price"
                    inputMode="decimal"
                    onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                    placeholder="مثلا ۵۵۰۰۰۰"
                    value={form.price}
                  />
                </div>

                <div className="fm-field">
                  <label htmlFor="product-discount-price">قیمت با تخفیف</label>
                  <input
                    id="product-discount-price"
                    inputMode="decimal"
                    onChange={(event) => setForm((current) => ({ ...current, discountPrice: event.target.value }))}
                    placeholder="اختیاری"
                    value={form.discountPrice}
                  />
                </div>

                <div className="fm-field vendor-products-field--wide">
                  <label htmlFor="product-main-image">تصویر اصلی</label>
                  <input
                    id="product-main-image"
                    onChange={(event) => setForm((current) => ({ ...current, mainImage: event.target.value }))}
                    placeholder="https://..."
                    value={form.mainImage}
                  />
                </div>

                <div className="fm-field vendor-products-field--wide">
                  <label htmlFor="product-images">تصاویر گالری</label>
                  <textarea
                    id="product-images"
                    onChange={(event) => setForm((current) => ({ ...current, imagesText: event.target.value }))}
                    placeholder="هر URL در یک خط"
                    rows={4}
                    value={form.imagesText}
                  />
                </div>

                <div className="fm-field vendor-products-field--wide">
                  <label htmlFor="product-video">ویدیو</label>
                  <input
                    id="product-video"
                    onChange={(event) => setForm((current) => ({ ...current, videoUrl: event.target.value }))}
                    placeholder="https://..."
                    value={form.videoUrl}
                  />
                </div>

                <div className="fm-field vendor-products-field--wide">
                  <label htmlFor="product-short-description">توضیح کوتاه</label>
                  <textarea
                    id="product-short-description"
                    onChange={(event) => setForm((current) => ({ ...current, shortDescription: event.target.value }))}
                    placeholder="خلاصه کوتاه برای vitrine یا کارت محصول"
                    rows={3}
                    value={form.shortDescription}
                  />
                </div>

                <div className="fm-field vendor-products-field--wide">
                  <label htmlFor="product-description">توضیح کامل</label>
                  <textarea
                    id="product-description"
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="شرح کامل برای تیم و محتوای محصول"
                    rows={5}
                    value={form.description}
                  />
                </div>

                <div className="fm-field">
                  <label htmlFor="product-meta-title">meta title</label>
                  <input
                    id="product-meta-title"
                    onChange={(event) => setForm((current) => ({ ...current, metaTitle: event.target.value }))}
                    placeholder="اختیاری"
                    value={form.metaTitle}
                  />
                </div>

                <div className="fm-field">
                  <label htmlFor="product-meta-description">meta description</label>
                  <textarea
                    id="product-meta-description"
                    onChange={(event) => setForm((current) => ({ ...current, metaDescription: event.target.value }))}
                    placeholder="اختیاری"
                    rows={3}
                    value={form.metaDescription}
                  />
                </div>

                <div className="vendor-products-submit-row vendor-products-field--wide">
                  <button className="fm-button fm-button--primary" disabled={saving} onClick={handleSubmit} type="button">
                    {saving ? 'در حال ذخیره...' : editingProductId ? 'ذخیره تغییرات' : 'ایجاد محصول'}
                  </button>
                  {formMessage ? <div className="fm-message fm-message--success">{formMessage}</div> : null}
                  {formError ? <div className="fm-message fm-message--danger">{formError}</div> : null}
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </LoadableState>
    </div>
  )
}

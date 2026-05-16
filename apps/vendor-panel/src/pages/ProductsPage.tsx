import { DataTable, Pill, RichTextEditor, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi, type VendorProductPayload } from '../lib/api'
import { formatFaNumber, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type ProductRecord = Record<string, unknown>
type CategoryRecord = Record<string, unknown>

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
    const children = Array.isArray(item.children)
      ? item.children.map((child) => (typeof child === 'object' && child !== null ? (child as CategoryRecord) : {}))
      : []

    return [{ id, label: `${prefix}${name}` }, ...flattenCategories(children, depth + 1)]
  })
}

function getGalleryImages(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildPayload(form: ProductFormState, storeId: number): VendorProductPayload {
  const galleryImages = getGalleryImages(form.imagesText)

  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    shortDescription: form.shortDescription.trim() || undefined,
    price: Number(form.price),
    discountPrice: form.discountPrice.trim() ? Number(form.discountPrice) : undefined,
    quantity: Number(form.quantity),
    mainImage: form.mainImage.trim(),
    images: galleryImages.length ? galleryImages : undefined,
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
  const mainImageInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingMainImage, setUploadingMainImage] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
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
  const [editorOpen, setEditorOpen] = useState(false)
  const [storeId, setStoreId] = useState<number>(0)
  const [form, setForm] = useState<ProductFormState>(initialFormState)

  const galleryImages = useMemo(() => getGalleryImages(form.imagesText), [form.imagesText])

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
        detail: 'فهرست فعلی محصولات فروشگاه',
        tone: 'primary' as const,
      },
      {
        label: 'کم‌موجودی',
        value: formatFaNumber(products.filter((item) => getProductQuantity(item) > 0 && getProductQuantity(item) <= 5).length),
        delta: 'نیازمند تامین سریع',
        detail: 'محصول‌هایی که refill می‌خواهند',
        tone: 'warning' as const,
      },
      {
        label: 'ناموجود',
        value: formatFaNumber(products.filter((item) => getProductQuantity(item) <= 0).length),
        delta: 'خارج از چرخه فروش',
        detail: 'محصول‌هایی که فعلاً روی vitrine نباید بمانند',
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
        { label: 'نام محصول', value: getProductName(selectedProduct) },
        { label: 'دسته‌بندی', value: getProductCategory(selectedProduct) },
        { label: 'نوع محصول', value: getProductType(selectedProduct) },
        { label: 'قیمت پایه', value: formatPrice(getProductPrice(selectedProduct)) },
        { label: 'قیمت با تخفیف', value: getDiscountPrice(selectedProduct) === null ? 'بدون تخفیف' : formatPrice(getDiscountPrice(selectedProduct)) },
        { label: 'موجودی', value: formatFaNumber(getProductQuantity(selectedProduct)) },
        { label: 'وضعیت', value: getInventoryState(selectedProduct) },
        { label: 'اسلاگ', value: readText(selectedProduct, ['slug'], '—') },
      ]
    : []

  function openCreateEditor() {
    setEditingProductId(null)
    setEditorOpen(true)
    setFormError(null)
    setFormMessage(null)
    setForm({
      ...initialFormState,
      categoryId: categoryOptions[0]?.id || '',
      productTypeId: productTypeOptions[0]?.id || '',
    })
  }

  function openEditEditor() {
    if (!selectedProduct) return

    setEditingProductId(readText(selectedProduct, ['id'], ''))
    setEditorOpen(true)
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

  function closeEditor() {
    setEditorOpen(false)
    setEditingProductId(null)
    setFormError(null)
    setFormMessage(null)
  }

  async function handleDelete() {
    if (!selectedProduct) return

    setSaving(true)
    setFormError(null)
    setFormMessage(null)

    try {
      await vendorApi.deleteProduct(session, Number(readText(selectedProduct, ['id'], '0')))
      setFormMessage('محصول با موفقیت حذف شد.')
      await loadProductData({ current: true })
      closeEditor()
    } catch (deleteError) {
      setFormError(deleteError instanceof Error ? deleteError.message : 'حذف محصول ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  async function handleMainImageChoose(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return

    setUploadingMainImage(true)
    setFormError(null)
    setFormMessage(null)

    try {
      const uploaded = await vendorApi.uploadProductImage(session, file)
      setForm((current) => ({ ...current, mainImage: uploaded.url }))
      setFormMessage('تصویر اصلی آپلود شد و در فرم قرار گرفت.')
    } catch (uploadError) {
      setFormError(uploadError instanceof Error ? uploadError.message : 'آپلود تصویر اصلی ناموفق بود')
    } finally {
      setUploadingMainImage(false)
      if (mainImageInputRef.current) {
        mainImageInputRef.current.value = ''
      }
    }
  }

  async function handleGalleryChoose(fileList: FileList | null) {
    const files = fileList ? Array.from(fileList) : []
    if (!files.length) return

    setUploadingGallery(true)
    setFormError(null)
    setFormMessage(null)

    try {
      const uploaded = await vendorApi.uploadGalleryImages(session, files)
      const nextUrls = uploaded.map((item) => item.url)
      setForm((current) => {
        const merged = Array.from(new Set([...getGalleryImages(current.imagesText), ...nextUrls]))
        return { ...current, imagesText: merged.join('\n') }
      })
      setFormMessage('تصاویر گالری آپلود شدند و به فرم اضافه شدند.')
    } catch (uploadError) {
      setFormError(uploadError instanceof Error ? uploadError.message : 'آپلود تصاویر گالری ناموفق بود')
    } finally {
      setUploadingGallery(false)
      if (galleryInputRef.current) {
        galleryInputRef.current.value = ''
      }
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
      closeEditor()
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
          title="فهرست محصول‌ها و مسیر مدیریت منظم"
          description="این صفحه حالا لیست، فیلتر و انتخاب محصول را از workspace ویرایش جدا می‌کند تا برای product / article / taxonomy الگوی تمیزتری داشته باشیم."
          actions={
            <div className="vendor-products-actions">
              <button className="fm-button fm-button--primary" onClick={openCreateEditor} type="button">
                افزودن محصول جدید
              </button>
              <Pill tone="primary">products workspace v3</Pill>
            </div>
          }
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

        {!editorOpen ? (
          <div className="vendor-products-workspace-grid">
            <SectionCard
              eyebrow="جدول محصولات"
              title="لیست محصولات قابل اسکن"
              description="فروشنده باید بتواند سریع ببیند کدام محصول نیاز به تامین، تخفیف یا بازنویسی محتوایی دارد."
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

            <SectionCard
              eyebrow="محصول انتخاب‌شده"
              title={selectedProduct ? getProductName(selectedProduct) : 'محصولی انتخاب نشده'}
              description="از اینجا فقط quick context و actionهای اصلی را می‌بینی؛ ویرایش کامل در workspace جدا انجام می‌شود."
              actions={
                <div className="vendor-products-actions">
                  <Pill tone="warning">{selectedProduct ? getInventoryState(selectedProduct) : 'بدون انتخاب'}</Pill>
                  <button className="fm-button fm-button--secondary" disabled={!selectedProduct} onClick={openEditEditor} type="button">
                    ویرایش کامل
                  </button>
                </div>
              }
            >
              {selectedSummary.length ? (
                <div className="vendor-products-summary-grid">
                  {selectedSummary.map((item) => (
                    <article className="vendor-products-summary-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="vendor-note-card">هنوز محصولی برای نمایش جزئیات انتخاب نشده است.</div>
              )}
            </SectionCard>
          </div>
        ) : null}

        {editorOpen ? (
          <SectionCard
            eyebrow={editingProductId ? 'ویرایش محصول' : 'ایجاد محصول'}
            title={editingProductId ? `ویرایش ${form.name || 'محصول انتخاب‌شده'}` : 'ایجاد محصول جدید'}
            description="این workspace برای مدیریت کامل اطلاعات، رسانه، توضیحات، سئو و محتوای محصول ساخته شده و عمداً از لیست جدا است تا clutter ایجاد نشود."
            actions={
              <div className="vendor-products-actions">
                <button className="fm-button fm-button--ghost" onClick={closeEditor} type="button">
                  بازگشت به لیست
                </button>
                {editingProductId ? (
                  <button className="fm-button fm-button--secondary" disabled={saving} onClick={handleDelete} type="button">
                    حذف محصول
                  </button>
                ) : null}
                <button className="fm-button fm-button--primary" disabled={saving} onClick={handleSubmit} type="button">
                  {saving ? 'در حال ذخیره...' : editingProductId ? 'ذخیره تغییرات' : 'ایجاد محصول'}
                </button>
              </div>
            }
          >
            <div className="vendor-product-editor-shell">
              <section className="vendor-product-editor-main">
                <div className="vendor-product-editor-grid">
                  <article className="vendor-product-editor-panel">
                    <div className="vendor-product-editor-panel-head">
                      <strong>اطلاعات پایه</strong>
                      <span>نام، دسته، نوع و وضعیت موجودی محصول</span>
                    </div>

                    <div className="vendor-product-editor-fields">
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
                    </div>
                  </article>

                  <article className="vendor-product-editor-panel">
                    <div className="vendor-product-editor-panel-head">
                      <strong>رسانه و assetها</strong>
                      <span>آپلود مستقیم برای تصویرها و لینک برای ویدیو</span>
                    </div>

                    <div className="vendor-product-editor-fields">
                      <div className="fm-field vendor-product-editor-wide">
                        <label htmlFor="product-main-image">تصویر اصلی</label>
                        <div className="vendor-products-upload-card">
                          <div className="vendor-products-upload-actions">
                            <button
                              className="fm-button fm-button--secondary"
                              disabled={uploadingMainImage}
                              onClick={() => mainImageInputRef.current?.click()}
                              type="button"
                            >
                              {uploadingMainImage ? 'در حال آپلود...' : 'انتخاب تصویر اصلی'}
                            </button>
                            <input
                              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                              className="vendor-products-file-input"
                              onChange={(event) => void handleMainImageChoose(event.target.files)}
                              ref={mainImageInputRef}
                              type="file"
                            />
                            <span className="vendor-products-upload-hint">تصویر را انتخاب کن تا URL نهایی خودکار در فرم بنشیند.</span>
                          </div>

                          <input
                            id="product-main-image"
                            onChange={(event) => setForm((current) => ({ ...current, mainImage: event.target.value }))}
                            placeholder="https://..."
                            value={form.mainImage}
                          />

                          {form.mainImage ? (
                            <div className="vendor-products-image-preview">
                              <img alt="پیش‌نمایش تصویر اصلی محصول" src={form.mainImage} />
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="fm-field vendor-product-editor-wide">
                        <label htmlFor="product-images">تصاویر گالری</label>
                        <div className="vendor-products-upload-card">
                          <div className="vendor-products-upload-actions">
                            <button
                              className="fm-button fm-button--secondary"
                              disabled={uploadingGallery}
                              onClick={() => galleryInputRef.current?.click()}
                              type="button"
                            >
                              {uploadingGallery ? 'در حال آپلود...' : 'انتخاب تصاویر گالری'}
                            </button>
                            <input
                              multiple
                              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                              className="vendor-products-file-input"
                              onChange={(event) => void handleGalleryChoose(event.target.files)}
                              ref={galleryInputRef}
                              type="file"
                            />
                            <span className="vendor-products-upload-hint">چند تصویر را یکجا انتخاب کن تا به گالری این محصول اضافه شوند.</span>
                          </div>

                          <textarea
                            id="product-images"
                            onChange={(event) => setForm((current) => ({ ...current, imagesText: event.target.value }))}
                            placeholder="هر URL در یک خط"
                            rows={4}
                            value={form.imagesText}
                          />

                          {galleryImages.length ? (
                            <div className="vendor-products-gallery-preview">
                              {galleryImages.map((url) => (
                                <article className="vendor-products-gallery-item" key={url}>
                                  <img alt="پیش‌نمایش گالری محصول" src={url} />
                                  <span>{url}</span>
                                </article>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="fm-field vendor-product-editor-wide">
                        <label htmlFor="product-video">ویدیو</label>
                        <input
                          id="product-video"
                          onChange={(event) => setForm((current) => ({ ...current, videoUrl: event.target.value }))}
                          placeholder="https://..."
                          value={form.videoUrl}
                        />
                        <small className="vendor-products-upload-hint">backend فعلاً برای ویدیو فیلد `videoUrl` دارد؛ پس در این مرحله لینک ویدیو وارد می‌شود.</small>
                      </div>
                    </div>
                  </article>

                  <article className="vendor-product-editor-panel vendor-product-editor-panel--full">
                    <div className="vendor-product-editor-panel-head">
                      <strong>محتوای کوتاه و توضیح اصلی</strong>
                      <span>ویرایشگر کامل برای heading، link، image و ساختار سئو</span>
                    </div>

                    <div className="vendor-product-editor-stack">
                      <div className="fm-field">
                        <label htmlFor="product-short-description">توضیح کوتاه</label>
                        <RichTextEditor
                          id="product-short-description"
                          onChange={(nextValue) => setForm((current) => ({ ...current, shortDescription: nextValue }))}
                          placeholder="خلاصه کوتاه برای vitrine یا کارت محصول"
                          rows={6}
                          value={form.shortDescription}
                        />
                      </div>

                      <div className="fm-field">
                        <label htmlFor="product-description">توضیح کامل</label>
                        <RichTextEditor
                          id="product-description"
                          onChange={(nextValue) => setForm((current) => ({ ...current, description: nextValue }))}
                          placeholder="توضیح کامل، ساختار مقاله‌مانند، لینک‌دهی داخلی و محتوای SEO-friendly را اینجا بساز"
                          rows={12}
                          value={form.description}
                        />
                      </div>
                    </div>
                  </article>

                  <article className="vendor-product-editor-panel vendor-product-editor-panel--full">
                    <div className="vendor-product-editor-panel-head">
                      <strong>SEO و metadata</strong>
                      <span>متای اصلی برای indexability، CTR و preview بهتر</span>
                    </div>

                    <div className="vendor-product-editor-fields">
                      <div className="fm-field">
                        <label htmlFor="product-meta-title">meta title</label>
                        <input
                          id="product-meta-title"
                          onChange={(event) => setForm((current) => ({ ...current, metaTitle: event.target.value }))}
                          placeholder="اختیاری"
                          value={form.metaTitle}
                        />
                      </div>

                      <div className="fm-field vendor-product-editor-wide">
                        <label htmlFor="product-meta-description">meta description</label>
                        <textarea
                          id="product-meta-description"
                          onChange={(event) => setForm((current) => ({ ...current, metaDescription: event.target.value }))}
                          placeholder="اختیاری"
                          rows={4}
                          value={form.metaDescription}
                        />
                      </div>
                    </div>
                  </article>
                </div>

                <div className="vendor-product-editor-footer">
                  <article className="vendor-product-editor-sidecard">
                    <strong>خلاصه سریع</strong>
                    <div className="vendor-product-editor-sidegrid">
                      <span>وضعیت</span>
                      <strong>{form.quantity.trim() ? (Number(form.quantity) <= 0 ? 'ناموجود' : Number(form.quantity) <= 5 ? 'کم‌موجودی' : 'عادی') : 'نامشخص'}</strong>
                      <span>گالری</span>
                      <strong>{formatFaNumber(galleryImages.length)}</strong>
                      <span>دسته</span>
                      <strong>{categoryOptions.find((item) => item.id === form.categoryId)?.label || '—'}</strong>
                      <span>نوع</span>
                      <strong>{productTypeOptions.find((item) => item.id === form.productTypeId)?.label || '—'}</strong>
                    </div>
                  </article>

                  <article className="vendor-product-editor-sidecard">
                    <strong>راهنمای نظم صفحه</strong>
                    <p>
                      لیست و ویرایش از هم جدا شده‌اند تا بعداً همین الگو برای مقالات، دسته‌بندی‌ها، تگ‌ها و typeها هم بدون شلوغی تکرار شود.
                    </p>
                  </article>
                </div>

                {formMessage ? <div className="fm-message fm-message--success">{formMessage}</div> : null}
                {formError ? <div className="fm-message fm-message--danger">{formError}</div> : null}
              </section>
            </div>
          </SectionCard>
        ) : null}
      </LoadableState>
    </div>
  )
}

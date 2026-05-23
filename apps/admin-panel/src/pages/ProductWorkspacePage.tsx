import { FormatTextarea, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import {
  formatCurrency,
  formatPersianNumber,
  formatJalaliDate,
  getProductCategory,
  getProductCompositions,
  getProductImageCount,
  getContentReadinessLabel,
  getProductSeoReadinessLabel,
  getProductStatusLabel,
  getProductStore,
  getProductType,
  normalizeSlug,
  toProductRecord,
} from '../lib/products'
import type { AuthSession } from '../lib/session'

type ProductWorkspacePageProps = {
  session: AuthSession
  mode: 'create' | 'edit'
  productSlug: string | null
  onBack: () => void
}

type ProductRecord = Record<string, unknown>

type ProductFormState = {
  name: string
  slug: string
  shortDescription: string
  description: string
  price: string
  discountPrice: string
  quantity: string
  mainImage: string
  mainImageAlt: string
  imagesText: string
  galleryAltText: string
  videoUrl: string
  storeId: string
  categoryId: string
  productTypeId: string
  metaTitle: string
  metaDescription: string
}

function createEmptyProductForm(): ProductFormState {
  return {
    name: '',
    slug: '',
    shortDescription: '',
    description: '',
    price: '',
    discountPrice: '',
    quantity: '',
    mainImage: '',
    mainImageAlt: '',
    imagesText: '',
    galleryAltText: '',
    videoUrl: '',
    storeId: '',
    categoryId: '',
    productTypeId: '',
    metaTitle: '',
    metaDescription: '',
  }
}

function toOptionalNumber(value: string) {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function toOptionalText(value: string) {
  const normalized = value.trim()
  return normalized === '' ? undefined : normalized
}

function mapProductToForm(product: ProductRecord): ProductFormState {
  const images = Array.isArray(product.images) ? product.images.filter((item): item is string => typeof item === 'string') : []
  return {
    name: readText(product, ['name'], ''),
    slug: readText(product, ['slug'], ''),
    shortDescription: readText(product, ['shortDescription'], ''),
    description: readText(product, ['description'], ''),
    price: readText(product, ['price'], ''),
    discountPrice: readText(product, ['discountPrice'], ''),
    quantity: readText(product, ['quantity'], ''),
    mainImage: readText(product, ['mainImage'], ''),
    mainImageAlt: '',
    imagesText: images.join('\n'),
    galleryAltText: '',
    videoUrl: readText(product, ['videoUrl'], ''),
    storeId: readText(product, ['storeId'], ''),
    categoryId: readText(product, ['categoryId'], ''),
    productTypeId: readText(product, ['productTypeId'], ''),
    metaTitle: readText(product, ['metaTitle'], ''),
    metaDescription: readText(product, ['metaDescription'], ''),
  }
}

export function ProductWorkspacePage({ session, mode, productSlug, onBack }: ProductWorkspacePageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [uploadingMainImage, setUploadingMainImage] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [workspaceMode, setWorkspaceMode] = useState<'create' | 'edit' | 'review'>(mode === 'create' ? 'create' : 'edit')
  const [currentProductSlug, setCurrentProductSlug] = useState<string | null>(productSlug)
  const [productDetail, setProductDetail] = useState<ProductRecord | null>(null)
  const [productForm, setProductForm] = useState<ProductFormState>(() => createEmptyProductForm())
  const [stores, setStores] = useState<ProductRecord[]>([])
  const [categories, setCategories] = useState<ProductRecord[]>([])
  const [productTypes, setProductTypes] = useState<ProductRecord[]>([])
  const [elements, setElements] = useState<ProductRecord[]>([])
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    seo: false,
    preview: true,
    signals: false,
    media: false,
    composition: false,
  })
  const mainImageInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)

  useNoticeEffect(error, 'error')
  useNoticeEffect(submitMessage, 'success')

  useEffect(() => {
    setWorkspaceMode(mode === 'create' ? 'create' : 'edit')
    setCurrentProductSlug(productSlug)
  }, [mode, productSlug])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [storesPayload, categoriesPayload, typesPayload, elementsPayload, detailPayload] = await Promise.all([
          adminApi.getStores(session),
          adminApi.getCategories(session),
          adminApi.getProductTypes(session),
          adminApi.getProductElements(session),
          currentProductSlug ? adminApi.getProductDetail(session, currentProductSlug) : Promise.resolve(null),
        ])

        if (!active) return

        setStores(toArray(storesPayload))
        setCategories(toArray(categoriesPayload))
        setProductTypes(toArray(typesPayload))
        setElements(toArray(elementsPayload))

        if (detailPayload) {
          const nextProduct = toProductRecord(detailPayload)
          setProductDetail(nextProduct)
          setProductForm(mapProductToForm(nextProduct))
        } else {
          setProductDetail(null)
          setProductForm(createEmptyProductForm())
        }
      } catch (requestError) {
        if (!active) return
        setError(requestError instanceof Error ? requestError.message : 'خطا در بارگذاری workspace محصول')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [currentProductSlug, session])

  const contentReadiness = useMemo(
    () =>
      getContentReadinessLabel({
        name: productForm.name,
        shortDescription: productForm.shortDescription,
        description: productForm.description,
        mainImage: productForm.mainImage,
      }),
    [productForm.description, productForm.mainImage, productForm.name, productForm.shortDescription],
  )

  const seoReadiness = useMemo(
    () =>
      getProductSeoReadinessLabel({
        slug: productForm.slug,
        metaTitle: productForm.metaTitle,
        metaDescription: productForm.metaDescription,
      }),
    [productForm.metaDescription, productForm.metaTitle, productForm.slug],
  )

  const galleryImages = useMemo(
    () =>
      productForm.imagesText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    [productForm.imagesText],
  )

  const galleryAltItems = useMemo(
    () =>
      productForm.galleryAltText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    [productForm.galleryAltText],
  )

  const workspaceMeta = useMemo(
    () => [
      { label: 'حالت فعال', value: workspaceMode === 'create' ? 'ایجاد محصول' : workspaceMode === 'review' ? 'بازبینی محصول' : 'ویرایش محصول' },
      { label: 'فروشگاه', value: productDetail ? getProductStore(productDetail) : readText(stores.find((item) => readText(item, ['id'], '') === productForm.storeId) ?? {}, ['name'], 'هنوز انتخاب نشده') },
      { label: 'دسته‌بندی', value: productDetail ? getProductCategory(productDetail) : readText(categories.find((item) => readText(item, ['id'], '') === productForm.categoryId) ?? {}, ['name', 'title'], 'هنوز انتخاب نشده') },
      { label: 'نوع محصول', value: productDetail ? getProductType(productDetail) : readText(productTypes.find((item) => readText(item, ['id'], '') === productForm.productTypeId) ?? {}, ['name'], 'هنوز انتخاب نشده') },
      { label: 'آخرین ویرایش', value: productDetail ? formatJalaliDate(productDetail.updatedAt ?? productDetail.createdAt, true) : 'هنوز ثبت نشده' },
      { label: 'وضعیت موجودی', value: getProductStatusLabel({ quantity: Number(productForm.quantity || 0) }) },
    ],
    [categories, productDetail, productForm.categoryId, productForm.productTypeId, productForm.quantity, productForm.storeId, productTypes, stores, workspaceMode],
  )

  const workspaceSignals = useMemo(
    () => [
      { label: 'تصویرها', value: formatPersianNumber((productForm.mainImage.trim() ? 1 : 0) + galleryImages.length), hint: 'تصویر اصلی و گالری' },
      { label: 'قیمت نهایی', value: productForm.discountPrice ? formatCurrency(productForm.discountPrice) : productForm.price ? formatCurrency(productForm.price) : 'ثبت نشده', hint: 'مبنای نمایش فعلی' },
      { label: 'المان‌های آماده', value: formatPersianNumber(elements.length), hint: 'برای composition بعدی' },
      { label: 'حجم توضیح', value: formatPersianNumber(productForm.description.replace(/<[^>]*>/g, ' ').trim().length), hint: 'تقریبی از محتوای بدنه' },
    ],
    [elements.length, galleryImages.length, productForm.description, productForm.discountPrice, productForm.mainImage, productForm.price],
  )

  const seoChecklist = useMemo(
    () => [
      { label: 'اسلاگ', value: productForm.slug.trim() ? 'آماده' : 'نیازمند تکمیل' },
      { label: 'عنوان متا', value: productForm.metaTitle.trim() ? `${formatPersianNumber(productForm.metaTitle.trim().length)} کاراکتر` : 'نیازمند تکمیل' },
      { label: 'توضیح متا', value: productForm.metaDescription.trim() ? `${formatPersianNumber(productForm.metaDescription.trim().length)} کاراکتر` : 'نیازمند تکمیل' },
      { label: 'خلاصه کوتاه', value: productForm.shortDescription.trim() ? 'ثبت شده' : 'نیازمند تکمیل' },
    ],
    [productForm.metaDescription, productForm.metaTitle, productForm.shortDescription, productForm.slug],
  )

  const operationalNotes = useMemo(
    () => [
      `این محصول از نظر محتوا ${contentReadiness} است و باید قبل از انتشار، متن و رسانه‌اش یکدست بماند.`,
      `آمادگی سئو فعلاً ${seoReadiness} است؛ قبل از نهایی‌سازی، عنوان متا و توضیح متا را بازبینی کن.`,
      productForm.quantity ? `موجودی فعلی ${formatPersianNumber(productForm.quantity)} عدد است و باید با قیمت ثبت‌شده هم‌خوان بماند.` : 'موجودی هنوز مشخص نشده و برای تصمیم‌گیری عملیاتی باید کامل شود.',
    ],
    [contentReadiness, productForm.quantity, seoReadiness],
  )

  const previewTitle = productForm.metaTitle.trim() || productForm.name.trim() || 'عنوان محصول'
  const previewDescription =
    productForm.metaDescription.trim() ||
    productForm.shortDescription.trim() ||
    productForm.description.replace(/\s+/g, ' ').trim().slice(0, 160) ||
    'توضیح کوتاه برای این محصول هنوز تکمیل نشده است.'

  async function handleSubmit() {
    if (!productForm.name.trim()) {
      setError('نام محصول را وارد کن.')
      return
    }
    if (!productForm.storeId || !productForm.categoryId || !productForm.productTypeId) {
      setError('فروشگاه، دسته‌بندی و نوع محصول باید مشخص شوند.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSubmitMessage(null)

    const body = {
      name: productForm.name.trim(),
      shortDescription: toOptionalText(productForm.shortDescription),
      description: toOptionalText(productForm.description),
      price: toOptionalNumber(productForm.price) ?? 0,
      discountPrice: toOptionalNumber(productForm.discountPrice),
      quantity: toOptionalNumber(productForm.quantity) ?? 0,
      mainImage: productForm.mainImage.trim(),
      images: productForm.imagesText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
      videoUrl: toOptionalText(productForm.videoUrl),
      storeId: Number(productForm.storeId),
      categoryId: Number(productForm.categoryId),
      productTypeId: Number(productForm.productTypeId),
      compositions: [],
      metaTitle: toOptionalText(productForm.metaTitle),
      metaDescription: toOptionalText(productForm.metaDescription),
    }

    try {
      if (workspaceMode === 'create') {
        const created = await adminApi.createProduct(session, body)
        const createdRecord = toProductRecord(created)
        const nextSlug = readText(createdRecord, ['slug'], '')
        setSubmitMessage('محصول جدید با موفقیت ثبت شد.')
        if (nextSlug) {
          setCurrentProductSlug(nextSlug)
          setWorkspaceMode('edit')
        }
      } else if (productDetail) {
        await adminApi.updateProduct(session, readText(productDetail, ['id'], ''), body)
        setSubmitMessage('تغییرات محصول با موفقیت ذخیره شد.')
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ذخیره محصول ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMainImageChoose(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return

    setUploadingMainImage(true)
    setError(null)

    try {
      const uploaded = await adminApi.uploadProductImage(session, file)
      setProductForm((current) => ({
        ...current,
        mainImage: uploaded.url,
        mainImageAlt: current.mainImageAlt.trim() || current.name.trim() || 'تصویر اصلی محصول',
      }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'آپلود تصویر اصلی ناموفق بود')
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
    setError(null)

    try {
      const uploaded = await adminApi.uploadGalleryImages(session, files)
      setProductForm((current) => {
        const currentImages = current.imagesText
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean)
        const currentAlts = current.galleryAltText
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean)
        const nextImages = [...currentImages, ...uploaded.map((item) => item.url)]
        const nextAlts = [...currentAlts, ...uploaded.map(() => current.name.trim() || 'تصویر گالری محصول')]

        return {
          ...current,
          imagesText: nextImages.join('\n'),
          galleryAltText: nextAlts.join('\n'),
        }
      })
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'آپلود گالری ناموفق بود')
    } finally {
      setUploadingGallery(false)
      if (galleryInputRef.current) {
        galleryInputRef.current.value = ''
      }
    }
  }

  function toggleSection(key: string) {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <div className="fm-stack product-workspace-page">
      <LoadableState error={error} loading={loading}>
        <div className="content-workspace-topbar-actions">
          <button className="content-secondary-action" onClick={onBack} type="button">
            بازگشت به کارتابل محصول‌ها
          </button>
          <button className="content-primary-action" disabled={submitting} onClick={() => setWorkspaceMode('review')} type="button">
            حالت بازبینی
          </button>
          <button className="content-primary-action" disabled={submitting} onClick={handleSubmit} type="button">
            {workspaceMode === 'create' ? 'ثبت محصول' : 'ذخیره تغییرات'}
          </button>
        </div>

        <div className="content-workspace-meta-grid product-workspace-meta-grid">
          {workspaceMeta.map((item) => (
            <article className="content-workspace-meta-item" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>

        <SectionCard eyebrow="برداشت سریع" title="خلاصه تصمیم‌محور میزکار" description="قبل از ورود به فرم‌های عمیق، همین‌جا باید بدانی این محصول از نظر محتوا، سئو و عملیات در چه وضعیتی است.">
          <div className="content-workspace-signal-grid product-workspace-signal-grid">
            <article className="content-workspace-signal-item">
              <span>آمادگی محتوایی</span>
              <strong>{contentReadiness}</strong>
            </article>
            <article className="content-workspace-signal-item">
              <span>آمادگی سئو</span>
              <strong>{seoReadiness}</strong>
            </article>
            {workspaceSignals.map((item) => (
              <article className="content-workspace-signal-item" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
          <div className="product-workspace-note-list">
            {operationalNotes.map((note) => (
              <article className="product-workspace-note-item" key={note}>
                <strong>یادداشت اجرایی</strong>
                <p>{note}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="وضعیت اجرایی" title="بازبینی ادمین و availability" description="بر اساس backend فعلی، انتشار نهایی و کنترل buyability هنوز به فیلدها و endpointهای اختصاصی محصول نیاز دارد. اینجا منطق محصولی ثبت می‌شود تا UI رفتار اشتباه نسازد.">
          <div className="product-workspace-note-list">
            <article className="product-workspace-note-item">
              <strong>workflow تایید محصول</strong>
              <p>محصولی که فروشنده می‌سازد باید در حالت پیش‌نویس یا submitted به صف ادمین برسد، ادمین برای اصلاح برگرداند یا بعد از ویرایش محتوایی/سئویی آن را تایید و منتشر کند. این flow هنوز در مدل `Product` و APIهای backend پیاده نشده است.</p>
            </article>
            <article className="product-workspace-note-item">
              <strong>حذف نکردن محصول</strong>
              <p>برای حفظ جایگاه سئو، محصول نباید از لیست حذف شود؛ باید بتوان آن را غیرقابل‌خرید یا موقتاً غیرفعال کرد و بعداً دوباره فعالش کرد. backend فعلی برای `Product` هنوز فیلدی مثل `isPurchasable` یا `publicationStatus` ندارد.</p>
            </article>
          </div>
        </SectionCard>

        <div className="content-workspace-stack product-workspace-stack">
          <SectionCard eyebrow="اطلاعات پایه" title="هسته محصول" description="نام، اسلاگ، خلاصه و قیمت‌ها را اینجا کامل کن تا هویت محصول روشن شود.">
            <div className="content-editor-grid">
              <label className="content-select-field">
                <span>نام محصول</span>
                <input
                  className="fm-input"
                  onChange={(event) => {
                    const nextName = event.target.value
                    setProductForm((current) => ({
                      ...current,
                      name: nextName,
                      slug: current.slug ? current.slug : normalizeSlug(nextName),
                    }))
                  }}
                  value={productForm.name}
                />
              </label>
              <label className="content-select-field">
                <span>اسلاگ</span>
                <input
                  className="fm-input"
                  onChange={(event) => setProductForm((current) => ({ ...current, slug: normalizeSlug(event.target.value) }))}
                  value={productForm.slug}
                />
              </label>
              <label className="content-select-field content-editor-field--wide">
                <span>خلاصه کوتاه</span>
                <textarea
                  className="fm-input"
                  onChange={(event) => setProductForm((current) => ({ ...current, shortDescription: event.target.value }))}
                  rows={4}
                  value={productForm.shortDescription}
                />
              </label>
              <label className="content-select-field content-editor-field--wide">
                <span>توضیح کامل محصول</span>
                <FormatTextarea
                  id="product-description"
                  onChange={(value) => setProductForm((current) => ({ ...current, description: value }))}
                  placeholder="توضیح کامل محصول را اینجا بنویس..."
                  value={productForm.description}
                />
              </label>
              <label className="content-select-field">
                <span>قیمت پایه</span>
                <input className="fm-input" inputMode="numeric" onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} placeholder="مثلاً ۴۹۰۰۰۰" value={productForm.price} />
              </label>
              <label className="content-select-field">
                <span>قیمت تخفیفی</span>
                <input className="fm-input" inputMode="numeric" onChange={(event) => setProductForm((current) => ({ ...current, discountPrice: event.target.value }))} placeholder="در صورت وجود تخفیف" value={productForm.discountPrice} />
              </label>
              <label className="content-select-field">
                <span>موجودی</span>
                <input className="fm-input" inputMode="numeric" onChange={(event) => setProductForm((current) => ({ ...current, quantity: event.target.value }))} placeholder="تعداد موجودی" value={productForm.quantity} />
              </label>
            </div>
          </SectionCard>

          <SectionCard eyebrow="مالکیت و دسته‌بندی" title="فروشگاه، دسته و نوع محصول" description="این بخش مسیر ناوبری، مالکیت و تفسیر محتوایی محصول را مشخص می‌کند.">
            <div className="content-editor-grid">
              <label className="content-select-field">
                <span>فروشگاه</span>
                <select className="fm-input" onChange={(event) => setProductForm((current) => ({ ...current, storeId: event.target.value }))} value={productForm.storeId}>
                  <option value="">انتخاب فروشگاه</option>
                  {stores.map((item) => (
                    <option key={readText(item, ['id'], '')} value={readText(item, ['id'], '')}>
                      {readText(item, ['name'], 'فروشگاه')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="content-select-field">
                <span>دسته‌بندی</span>
                <select className="fm-input" onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))} value={productForm.categoryId}>
                  <option value="">انتخاب دسته‌بندی</option>
                  {categories.map((item) => (
                    <option key={readText(item, ['id'], '')} value={readText(item, ['id'], '')}>
                      {readText(item, ['name', 'title'], 'دسته‌بندی')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="content-select-field">
                <span>نوع محصول</span>
                <select className="fm-input" onChange={(event) => setProductForm((current) => ({ ...current, productTypeId: event.target.value }))} value={productForm.productTypeId}>
                  <option value="">انتخاب نوع محصول</option>
                  {productTypes.map((item) => (
                    <option key={readText(item, ['id'], '')} value={readText(item, ['id'], '')}>
                      {readText(item, ['name'], 'نوع محصول')}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="رسانه‌ها"
            title="تصویر و ویدیو"
            description="این بخش کمک می‌کند تیم محتوا سریع ببیند محصول از نظر رسانه آماده است یا نه."
            actions={
              <button className={`content-accordion-trigger${openSections.media ? ' is-open' : ''}`} onClick={() => toggleSection('media')} type="button">
                {openSections.media ? 'بستن رسانه‌ها' : 'باز کردن رسانه‌ها'}
              </button>
            }
          >
            {openSections.media ? (
              <div className="content-editor-grid">
                <div className="content-select-field content-editor-field--wide">
                  <span>تصویر اصلی</span>
                  <div className="admin-products-upload-card">
                    <div className="admin-products-upload-actions">
                      <button className="content-secondary-action" disabled={uploadingMainImage} onClick={() => mainImageInputRef.current?.click()} type="button">
                        {uploadingMainImage ? 'در حال آپلود...' : 'انتخاب تصویر اصلی'}
                      </button>
                      <input
                        ref={mainImageInputRef}
                        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                        className="admin-products-file-input"
                        onChange={(event) => void handleMainImageChoose(event.target.files)}
                        type="file"
                      />
                      <span className="admin-products-upload-hint">لینک مستقیم تصویر پنهان شده تا UI شلوغ نشود؛ بعد از انتخاب فایل، آدرس نهایی خودکار ثبت می‌شود.</span>
                    </div>

                    {productForm.mainImage ? (
                      <div className="admin-products-image-preview">
                        <img alt={productForm.mainImageAlt.trim() || 'پیش‌نمایش تصویر اصلی محصول'} src={productForm.mainImage} />
                      </div>
                    ) : null}

                    <label className="content-select-field">
                      <span>متن جایگزین تصویر اصلی</span>
                      <input
                        className="fm-input"
                        onChange={(event) => setProductForm((current) => ({ ...current, mainImageAlt: event.target.value }))}
                        placeholder="مثلاً دسته‌گل رز سفید برای مناسبت رسمی"
                        value={productForm.mainImageAlt}
                      />
                    </label>
                  </div>
                </div>

                <div className="content-select-field content-editor-field--wide">
                  <span>تصاویر گالری</span>
                  <div className="admin-products-upload-card">
                    <div className="admin-products-upload-actions">
                      <button className="content-secondary-action" disabled={uploadingGallery} onClick={() => galleryInputRef.current?.click()} type="button">
                        {uploadingGallery ? 'در حال آپلود...' : 'انتخاب تصاویر گالری'}
                      </button>
                      <input
                        ref={galleryInputRef}
                        multiple
                        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                        className="admin-products-file-input"
                        onChange={(event) => void handleGalleryChoose(event.target.files)}
                        type="file"
                      />
                      <span className="admin-products-upload-hint">برای هر تصویر گالری هم ALT لازم است؛ فعلاً هر خط ALT متناظر با همان تصویر در همان ترتیب ذخیره می‌شود.</span>
                    </div>

                    {galleryImages.length ? (
                      <div className="admin-products-gallery-preview">
                        {galleryImages.map((url, index) => (
                          <article className="admin-products-gallery-item" key={`${url}-${index}`}>
                            <img alt={galleryAltItems[index] || `پیش‌نمایش گالری ${index + 1}`} src={url} />
                            <span>{galleryAltItems[index] || 'ALT ثبت نشده'}</span>
                          </article>
                        ))}
                      </div>
                    ) : null}

                    <label className="content-select-field content-editor-field--wide">
                      <span>متن جایگزین گالری</span>
                      <textarea
                        className="fm-input"
                        onChange={(event) => setProductForm((current) => ({ ...current, galleryAltText: event.target.value }))}
                        placeholder="هر خط ALT متناظر با یک تصویر گالری باشد"
                        rows={4}
                        value={productForm.galleryAltText}
                      />
                    </label>
                  </div>
                </div>

                <label className="content-select-field">
                  <span>ویدیو</span>
                  <input className="fm-input" onChange={(event) => setProductForm((current) => ({ ...current, videoUrl: event.target.value }))} value={productForm.videoUrl} />
                </label>
              </div>
            ) : (
              <p className="content-collapsed-note">برای جلوگیری از طول زیاد صفحه، رسانه‌ها در این بخش collapsible نگه داشته می‌شوند.</p>
            )}
          </SectionCard>

          <SectionCard
            eyebrow="سئو و پیش‌نمایش"
            title="metadata، snippet و readiness"
            description="این بخش مخصوص تیم سئو است تا بدون شلوغ شدن route، آماده‌بودن خروجی جستجو را ببیند."
            actions={
              <button className={`content-accordion-trigger${openSections.seo ? ' is-open' : ''}`} onClick={() => toggleSection('seo')} type="button">
                {openSections.seo ? 'بستن تنظیمات سئو' : 'باز کردن تنظیمات سئو'}
              </button>
            }
          >
            {openSections.seo ? (
              <div className="content-editor-grid">
                <label className="content-select-field">
                  <span>عنوان متا</span>
                  <input className="fm-input" onChange={(event) => setProductForm((current) => ({ ...current, metaTitle: event.target.value }))} value={productForm.metaTitle} />
                </label>
                <label className="content-select-field content-editor-field--wide">
                  <span>توضیح متا</span>
                  <textarea className="fm-input" onChange={(event) => setProductForm((current) => ({ ...current, metaDescription: event.target.value }))} rows={4} value={productForm.metaDescription} />
                </label>
              </div>
            ) : (
              <p className="content-collapsed-note">تنظیمات سئو در این بخش جمع می‌شوند تا تمرکز روی هسته محصول حفظ شود.</p>
            )}

            <div className="content-workspace-checklist-grid product-workspace-checklist-grid">
              {seoChecklist.map((item) => (
                <article className="content-workspace-check-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>

            <div className="content-preview-grid product-preview-grid">
              <article className="content-preview-card">
                <span>پیش‌نمایش جستجو</span>
                <strong>{previewTitle}</strong>
                <p>{previewDescription}</p>
              </article>
              <article className="content-preview-card">
                <span>سیگنال سئو</span>
                <strong>{seoReadiness}</strong>
                <p>اسلاگ، عنوان متا و توضیح متا معیارهای اولیه این نمای readiness هستند.</p>
              </article>
              <article className="content-preview-card">
                <span>پیش‌نمایش محصول</span>
                <strong>{productForm.name.trim() || 'نام محصول هنوز تکمیل نشده'}</strong>
                <p>{productForm.shortDescription.trim() || 'خلاصه کوتاه این محصول هنوز نوشته نشده است.'}</p>
              </article>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="سیگنال‌ها و بازبینی"
            title="نمای کوتاه برای تیم محتوا و سئو"
            description="این بخش فقط برای decision support است و قرار نیست جای فرم اصلی را بگیرد."
            actions={
              <button className={`content-accordion-trigger${openSections.signals ? ' is-open' : ''}`} onClick={() => toggleSection('signals')} type="button">
                {openSections.signals ? 'بستن سیگنال‌ها' : 'باز کردن سیگنال‌ها'}
              </button>
            }
          >
            {openSections.signals ? (
              <div className="content-workspace-signal-grid">
                <article className="content-workspace-signal-item">
                  <span>آمادگی محتوایی</span>
                  <strong>{contentReadiness}</strong>
                </article>
                <article className="content-workspace-signal-item">
                  <span>آمادگی سئو</span>
                  <strong>{seoReadiness}</strong>
                </article>
                <article className="content-workspace-signal-item">
                  <span>وضعیت موجودی</span>
                  <strong>
                    {getProductStatusLabel({
                      quantity: Number(productForm.quantity || 0),
                    })}
                  </strong>
                </article>
                <article className="content-workspace-signal-item">
                  <span>وضعیت قیمت</span>
                  <strong>{productForm.price ? formatCurrency(productForm.price) : 'ثبت نشده'}</strong>
                </article>
              </div>
            ) : (
              <p className="content-collapsed-note">signalهای کوتاه برای بازبینی سریع در این بخش فشرده نگه داشته می‌شوند.</p>
            )}
          </SectionCard>

          <SectionCard
            eyebrow="ترکیب محصول"
            title="elementها و composition"
            description="در این نسخه، visibility این بخش اضافه شده تا type و elementهای مجاز برای توسعه بعدی روشن بمانند."
            actions={
              <button className={`content-accordion-trigger${openSections.composition ? ' is-open' : ''}`} onClick={() => toggleSection('composition')} type="button">
                {openSections.composition ? 'بستن composition' : 'باز کردن composition'}
              </button>
            }
          >
            {openSections.composition ? (
              <>
                <div className="content-workspace-checklist-grid product-workspace-checklist-grid">
                  <article className="content-workspace-check-item">
                    <span>تعداد تصویرهای ثبت‌شده</span>
                    <strong>{formatPersianNumber((productForm.mainImage.trim() ? 1 : 0) + galleryImages.length)}</strong>
                  </article>
                  <article className="content-workspace-check-item">
                    <span>تعداد composition فعلی</span>
                    <strong>{formatPersianNumber(getProductCompositions(productDetail ?? {}).length)}</strong>
                  </article>
                  <article className="content-workspace-check-item">
                    <span>رسانه آماده نمایش</span>
                    <strong>{formatPersianNumber(getProductImageCount(productDetail ?? {}) || ((productForm.mainImage.trim() ? 1 : 0) + galleryImages.length))}</strong>
                  </article>
                </div>
                <div className="content-mini-checklist">
                  {elements.slice(0, 8).map((item) => (
                    <article className="content-mini-checklist-item" key={readText(item, ['id'], '')}>
                      <span>{readText(item, ['type'], 'المان')}</span>
                      <strong>{readText(item, ['name'], 'بدون نام')}</strong>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p className="content-collapsed-note">composition در این فاز بیشتر برای visibility و آمادگی توسعه بعدی نگه داشته شده است.</p>
            )}
          </SectionCard>

          <SectionCard eyebrow="راهنمای کار" title="قاعده این workspace" description="این صفحه برای ویرایش متمرکز ساخته شده است؛ summary کوتاه می‌دهد اما فرم اصلی را از دید کاربر پنهان نمی‌کند.">
            <div className="product-workspace-note-list">
              <article className="product-workspace-note-item">
                <strong>ترتیب پیشنهادی</strong>
                <p>اول هویت محصول و قیمت را کامل کن، بعد رسانه‌ها را ببند، و در آخر metadata و preview جستجو را بازبینی کن.</p>
              </article>
              <article className="product-workspace-note-item">
                <strong>قاعده انتشار</strong>
                <p>اگر خلاصه، توضیح، تصویر اصلی و metadata ناقص باشد، این محصول هنوز برای بازبینی نهایی و تصمیم محتوایی آماده نیست.</p>
              </article>
            </div>
          </SectionCard>
        </div>
      </LoadableState>
    </div>
  )
}

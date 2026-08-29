import { FormatTextarea, Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type ProductTypeWorkspacePageProps = {
  session: AuthSession
  onBack: () => void
}

type ProductTypeRecord = Record<string, unknown>
type ProductElementRecord = Record<string, unknown>
type ProductTypeFaqRecord = Record<string, unknown>

type ProductTypeFaqFormState = {
  question: string
  answer: string
  sortOrder: string
  isActive: boolean
}

type ProductTypeFormState = {
  name: string
  slug: string
  description: string
  image: string
  imageAlt: string
  thumbnailUrl: string
  metaTitle: string
  metaDescription: string
  isIndexed: boolean
  allowedElementIds: string[]
}

function createEmptyProductTypeForm(): ProductTypeFormState {
  return {
    name: '',
    slug: '',
    description: '',
    image: '',
    imageAlt: '',
    thumbnailUrl: '',
    metaTitle: '',
    metaDescription: '',
    isIndexed: true,
    allowedElementIds: [],
  }
}

function createEmptyProductTypeFaqForm(): ProductTypeFaqFormState {
  return {
    question: '',
    answer: '',
    sortOrder: '0',
    isActive: true,
  }
}

function mapProductTypeToForm(productType: ProductTypeRecord): ProductTypeFormState {
  const allowedElements = toArray(productType.allowedElements)
  return {
    name: readText(productType, ['name'], ''),
    slug: readText(productType, ['slug'], ''),
    description: readText(productType, ['description'], ''),
    image: readText(productType, ['image'], ''),
    imageAlt: readText(productType, ['imageAlt'], ''),
    thumbnailUrl: readText(productType, ['thumbnailUrl'], ''),
    metaTitle: readText(productType, ['metaTitle'], ''),
    metaDescription: readText(productType, ['metaDescription'], ''),
    isIndexed: productType.isIndexed !== false,
    allowedElementIds: allowedElements.map((item) => readText(item, ['id'], '')).filter(Boolean),
  }
}

function toOptionalText(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

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

export function ProductTypeWorkspacePage({ session, onBack }: ProductTypeWorkspacePageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [productTypes, setProductTypes] = useState<ProductTypeRecord[]>([])
  const [elements, setElements] = useState<ProductElementRecord[]>([])
  const [productTypeFaqs, setProductTypeFaqs] = useState<ProductTypeFaqRecord[]>([])
  const [selectedProductTypeId, setSelectedProductTypeId] = useState<string>('new')
  const [form, setForm] = useState<ProductTypeFormState>(() => createEmptyProductTypeForm())
  const [faqForm, setFaqForm] = useState<ProductTypeFaqFormState>(() => createEmptyProductTypeFaqForm())
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null)
  const [faqSubmitting, setFaqSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingDescriptionImage, setUploadingDescriptionImage] = useState(false)
  const descriptionInsertRef = useRef<((content: string) => void) | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const descriptionImageInputRef = useRef<HTMLInputElement | null>(null)

  useNoticeEffect(error, 'error')
  useNoticeEffect(message, 'success')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [productTypesPayload, elementsPayload] = await Promise.all([
          adminApi.getProductTypes(session),
          adminApi.getProductElements(session),
        ])

        if (!active) return
        setProductTypes(toArray(productTypesPayload))
        setElements(toArray(elementsPayload))
      } catch (requestError) {
        if (!active) return
        setError(requestError instanceof Error ? requestError.message : 'بارگذاری نوع‌های محصول ناموفق بود')
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
    if (selectedProductTypeId === 'new') {
      setForm(createEmptyProductTypeForm())
      setProductTypeFaqs([])
      setFaqForm(createEmptyProductTypeFaqForm())
      setEditingFaqId(null)
      return
    }

    const productType = productTypes.find((item) => readText(item, ['id'], '') === selectedProductTypeId)
    if (productType) {
      setForm(mapProductTypeToForm(productType))
      void (async () => {
        try {
          const payload = await adminApi.getProductTypeFaqs(session, selectedProductTypeId)
          setProductTypeFaqs(toArray(payload))
        } catch {
          setProductTypeFaqs([])
        }
      })()
    }
  }, [productTypes, selectedProductTypeId, session])

  const selectedElementNames = useMemo(() => {
    const elementMap = new Map(elements.map((item) => [readText(item, ['id'], ''), readText(item, ['name'], 'بدون نام')]))
    return form.allowedElementIds.map((id) => elementMap.get(id) ?? `المان ${id}`)
  }, [elements, form.allowedElementIds])

  async function reloadProductTypes(nextSelectedId?: string) {
    const payload = await adminApi.getProductTypes(session)
    const nextProductTypes = toArray(payload)
    setProductTypes(nextProductTypes)
    if (nextSelectedId) {
      setSelectedProductTypeId(nextSelectedId)
      const productType = nextProductTypes.find((item) => readText(item, ['id'], '') === nextSelectedId)
      setForm(productType ? mapProductTypeToForm(productType) : createEmptyProductTypeForm())
    }
  }

  async function reloadProductTypeFaqs(productTypeId: string) {
    const payload = await adminApi.getProductTypeFaqs(session, productTypeId)
    setProductTypeFaqs(toArray(payload))
  }

  function updateForm<K extends keyof ProductTypeFormState>(key: K, value: ProductTypeFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleImageChoose(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return

    setUploadingImage(true)
    setError(null)
    try {
      const uploaded = await adminApi.uploadProductImage(session, file)
      updateForm('image', uploaded.url)
      if (uploaded.variants?.thumbnail?.url) {
        updateForm('thumbnailUrl', uploaded.variants.thumbnail.url)
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'آپلود تصویر نوع محصول ناموفق بود')
    } finally {
      setUploadingImage(false)
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
    }
  }

  async function handleDescriptionImageChoose(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return

    setUploadingDescriptionImage(true)
    setError(null)
    try {
      const uploaded = await adminApi.uploadProductImage(session, file)
      if (descriptionInsertRef.current) {
        const altAttr = form.imageAlt.trim() ? ` alt="${form.imageAlt.trim()}"` : ''
        descriptionInsertRef.current(`<p><img src="${uploaded.url}"${altAttr}></p>`)
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'آپلود تصویر نوع محصول ناموفق بود')
    } finally {
      setUploadingDescriptionImage(false)
      if (descriptionImageInputRef.current) {
        descriptionImageInputRef.current.value = ''
      }
    }
  }

  function openDescriptionImageUpload() {
    descriptionImageInputRef.current?.click()
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.slug.trim()) {
      setError('نام و اسلاگ نوع محصول الزامی هستند.')
      return
    }

    setSubmitting(true)
    setError(null)
    setMessage(null)

    const body = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: toOptionalText(form.description),
      image: toOptionalText(form.image),
      imageAlt: toOptionalText(form.imageAlt),
      thumbnailUrl: toOptionalText(form.thumbnailUrl),
      metaTitle: toOptionalText(form.metaTitle),
      metaDescription: toOptionalText(form.metaDescription),
      isIndexed: form.isIndexed,
      allowedElementIds: form.allowedElementIds.map((id) => Number(id)),
    }

    try {
      const payload =
        selectedProductTypeId === 'new'
          ? await adminApi.createProductType(session, body)
          : await adminApi.updateProductType(session, selectedProductTypeId, body)

      const nextId = readText(payload as Record<string, unknown>, ['id'], selectedProductTypeId)
      await reloadProductTypes(nextId === 'new' ? undefined : nextId)
      setMessage(selectedProductTypeId === 'new' ? 'نوع محصول جدید ساخته شد.' : 'نوع محصول با موفقیت به‌روزرسانی شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ذخیره نوع محصول ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (selectedProductTypeId === 'new') return

    setSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      await adminApi.deleteProductType(session, selectedProductTypeId)
      await reloadProductTypes()
      setSelectedProductTypeId('new')
      setForm(createEmptyProductTypeForm())
      setMessage('نوع محصول حذف شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'حذف نوع محصول ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFaqSubmit() {
    if (selectedProductTypeId === 'new') return
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      setError('سوال و پاسخ الزامی هستند.')
      return
    }

    setFaqSubmitting(true)
    setError(null)

    const body = {
      question: faqForm.question.trim(),
      answer: faqForm.answer.trim(),
      sortOrder: Number(faqForm.sortOrder) || 0,
      isActive: faqForm.isActive,
    }

    try {
      if (editingFaqId) {
        await adminApi.updateProductTypeFaq(session, selectedProductTypeId, editingFaqId, body)
      } else {
        await adminApi.createProductTypeFaq(session, selectedProductTypeId, body)
      }
      await reloadProductTypeFaqs(selectedProductTypeId)
      setFaqForm(createEmptyProductTypeFaqForm())
      setEditingFaqId(null)
      setMessage(editingFaqId ? 'سوال متداول به‌روزرسانی شد.' : 'سوال متداول جدید اضافه شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ذخیره سوال متداول ناموفق بود')
    } finally {
      setFaqSubmitting(false)
    }
  }

  async function handleFaqDelete(faqId: string) {
    if (selectedProductTypeId === 'new') return

    setFaqSubmitting(true)
    setError(null)

    try {
      await adminApi.deleteProductTypeFaq(session, selectedProductTypeId, faqId)
      await reloadProductTypeFaqs(selectedProductTypeId)
      if (editingFaqId === faqId) {
        setFaqForm(createEmptyProductTypeFaqForm())
        setEditingFaqId(null)
      }
      setMessage('سوال متداول حذف شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'حذف سوال متداول ناموفق بود')
    } finally {
      setFaqSubmitting(false)
    }
  }

  function handleFaqEdit(faq: ProductTypeFaqRecord) {
    setEditingFaqId(readText(faq, ['id'], ''))
    setFaqForm({
      question: readText(faq, ['question'], ''),
      answer: readText(faq, ['answer'], ''),
      sortOrder: readText(faq, ['sortOrder'], '0'),
      isActive: faq.isActive !== false,
    })
  }

  return (
    <div className="fm-stack">
      <LoadableState error={error} loading={loading}>
        <input
          ref={imageInputRef}
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          className="admin-products-file-input"
          onChange={(event) => void handleImageChoose(event.target.files)}
          type="file"
        />
        <input
          ref={descriptionImageInputRef}
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          className="admin-products-file-input"
          onChange={(event) => void handleDescriptionImageChoose(event.target.files)}
          type="file"
        />

        <SectionCard
          eyebrow="نوع کالا"
          title="نوع محصول"
          actions={
            <div className="page-builder-workspace__actions">
              <button className="fm-button fm-button--ghost" onClick={onBack} type="button">
                بازگشت
              </button>
              <button className="fm-button fm-button--secondary" onClick={() => { setSelectedProductTypeId('new'); setForm(createEmptyProductTypeForm()) }} type="button">
                نوع جدید
              </button>
              {selectedProductTypeId !== 'new' ? (
                <button className="fm-button fm-button--secondary" disabled={submitting} onClick={() => void handleDelete()} type="button">
                  حذف نوع
                </button>
              ) : null}
              <button className="fm-button fm-button--primary" disabled={submitting} onClick={() => void handleSubmit()} type="button">
                {submitting ? 'در حال ذخیره...' : selectedProductTypeId === 'new' ? 'ساخت نوع' : 'ذخیره تغییرات'}
              </button>
            </div>
          }
        >
          <div className="page-builder-workspace__pills">
            <Pill>{selectedProductTypeId === 'new' ? 'نوع جدید' : `#${selectedProductTypeId}`}</Pill>
            <Pill>{`${productTypes.length} نوع`}</Pill>
            <Pill>{`${form.allowedElementIds.length} المان مجاز`}</Pill>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="ویرایش"
          title="اطلاعات نوع"
        >
          <div className="fm-grid page-builder-form-grid">
            <label className="fm-field page-builder-field--wide">
              <span>انتخاب نوع</span>
              <select onChange={(event) => setSelectedProductTypeId(event.target.value)} value={selectedProductTypeId}>
                <option value="new">نوع جدید</option>
                {productTypes.map((productType) => {
                  const id = readText(productType, ['id'], '')
                  const name = readText(productType, ['name'], 'بدون نام')
                  return (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  )
                })}
              </select>
            </label>

            <label className="fm-field">
              <span>نام نوع</span>
              <input onChange={(event) => updateForm('name', event.target.value)} type="text" value={form.name} />
            </label>
            <label className="fm-field">
              <span>اسلاگ</span>
              <input onChange={(event) => updateForm('slug', event.target.value)} type="text" value={form.slug} />
            </label>
            <label className="fm-field page-builder-field--wide">
              <span>توضیحات</span>
              <FormatTextarea
                id="product-type-description"
                onChange={(value) => updateForm('description', value)}
                placeholder="توضیحات کامل نوع محصول را اینجا بنویس..."
                toolbarActions={(editorApi) => {
                  descriptionInsertRef.current = editorApi.insertContentAtCursor
                  return (
                    <button className="fm-rich-editor-chip" disabled={uploadingDescriptionImage} onClick={openDescriptionImageUpload} type="button">
                      {uploadingDescriptionImage ? 'در حال آپلود...' : 'آپلود تصویر'}
                    </button>
                  )
                }}
                value={form.description}
              />
            </label>

            <label className="fm-field page-builder-field--wide">
              <span>تصویر نوع</span>
              <input onChange={(event) => updateForm('image', event.target.value)} type="text" value={form.image} />
            </label>
            <div className="admin-products-upload-card page-builder-field--wide">
              <div className="admin-products-upload-actions">
                <button className="content-secondary-action" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()} type="button">
                  {uploadingImage ? 'در حال آپلود...' : 'آپلود تصویر'}
                </button>
              </div>
              {form.image.trim() ? (
                <div className="admin-products-image-preview">
                  <img alt={form.imageAlt || 'Preview product type'} src={form.image} />
                </div>
              ) : null}
            </div>

            <label className="fm-field page-builder-field--wide">
              <span>متن جایگزین تصویر (Alt Text)</span>
              <input
                onChange={(event) => updateForm('imageAlt', event.target.value)}
                placeholder="توصیف تصویر برای موتورهای جستجو و دسترسی‌پذیری"
                type="text"
                value={form.imageAlt}
              />
            </label>

            <label className="fm-field">
              <span>Meta title</span>
              <input onChange={(event) => updateForm('metaTitle', event.target.value)} type="text" value={form.metaTitle} />
            </label>
            <label className="fm-field">
              <span>Meta description</span>
              <textarea
                onChange={(event) => updateForm('metaDescription', event.target.value)}
                rows={3}
                value={form.metaDescription}
              />
            </label>

            <label className="fm-field page-builder-checkbox">
              <span>ایندکس در SEO</span>
              <input checked={form.isIndexed} onChange={(event) => updateForm('isIndexed', event.target.checked)} type="checkbox" />
            </label>

            <label className="fm-field page-builder-field--wide">
              <span>المان‌های مجاز</span>
              <select
                multiple
                onChange={(event) =>
                  updateForm(
                    'allowedElementIds',
                    Array.from(event.target.selectedOptions).map((option) => option.value),
                  )
                }
                value={form.allowedElementIds}
              >
                {elements.map((element) => {
                  const id = readText(element, ['id'], '')
                  const name = readText(element, ['name'], 'بدون نام')
                  const type = getProductElementTypeLabel(readText(element, ['type'], ''))
                  return (
                    <option key={id} value={id}>
                      {`${name} · ${type}`}
                    </option>
                  )
                })}
              </select>
            </label>

            {selectedElementNames.length ? (
              <div className="page-builder-preview-card page-builder-field--wide">
                <strong>المان‌های انتخاب‌شده</strong>
                <div className="page-builder-preview-tags">
                  {selectedElementNames.map((name) => (
                    <span className="page-builder-preview-tag" key={name}>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard eyebrow="سوالات متداول" title="FAQ نوع محصول">
          {selectedProductTypeId === 'new' ? (
            <p className="content-collapsed-note">ابتدا نوع محصول را ذخیره کنید تا بتوانید سوالات متداول اضافه کنید.</p>
          ) : (
            <div className="category-faq-section">
              <div className="category-faq-form content-editor-grid">
                <label className="content-select-field page-builder-field--wide">
                  <span>سوال</span>
                  <input
                    className="fm-input"
                    onChange={(event) => setFaqForm((current) => ({ ...current, question: event.target.value }))}
                    value={faqForm.question}
                  />
                </label>
                <label className="content-select-field page-builder-field--wide">
                  <span>پاسخ</span>
                  <textarea
                    className="fm-input"
                    onChange={(event) => setFaqForm((current) => ({ ...current, answer: event.target.value }))}
                    rows={3}
                    value={faqForm.answer}
                  />
                </label>
                <label className="content-select-field">
                  <span>ترتیب نمایش</span>
                  <input
                    className="fm-input"
                    inputMode="numeric"
                    onChange={(event) => setFaqForm((current) => ({ ...current, sortOrder: event.target.value }))}
                    value={faqForm.sortOrder}
                  />
                </label>
                <label className="fm-field page-builder-checkbox">
                  <span>فعال</span>
                  <input
                    checked={faqForm.isActive}
                    onChange={(event) => setFaqForm((current) => ({ ...current, isActive: event.target.checked }))}
                    type="checkbox"
                  />
                </label>
                <div className="products-header-actions">
                  <button className="content-primary-action" disabled={faqSubmitting} onClick={() => void handleFaqSubmit()} type="button">
                    {faqSubmitting ? 'در حال ذخیره...' : editingFaqId ? 'به‌روزرسانی' : 'افزودن سوال'}
                  </button>
                  {editingFaqId ? (
                    <button className="content-secondary-action" disabled={faqSubmitting} onClick={() => { setFaqForm(createEmptyProductTypeFaqForm()); setEditingFaqId(null) }} type="button">
                      لغو
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="category-faq-list">
                {productTypeFaqs.length ? (
                  productTypeFaqs.map((faq) => {
                    const faqId = readText(faq, ['id'], '')
                    return (
                      <article className="category-faq-item" key={faqId}>
                        <div className="category-faq-item__content">
                          <strong>{readText(faq, ['question'], 'بدون سوال')}</strong>
                          <p>{readText(faq, ['answer'], 'بدون پاسخ')}</p>
                          <span className="category-faq-item__meta">
                            ترتیب: {readText(faq, ['sortOrder'], '0')} · {faq.isActive !== false ? 'فعال' : 'غیرفعال'}
                          </span>
                        </div>
                        <div className="products-header-actions">
                          <button className="content-secondary-action" disabled={faqSubmitting} onClick={() => handleFaqEdit(faq)} type="button">
                            ویرایش
                          </button>
                          <button className="content-secondary-action" disabled={faqSubmitting} onClick={() => void handleFaqDelete(faqId)} type="button">
                            حذف
                          </button>
                        </div>
                      </article>
                    )
                  })
                ) : (
                  <p className="content-collapsed-note">هنوز سوالی تعریف نشده است.</p>
                )}
              </div>
            </div>
          )}
        </SectionCard>
      </LoadableState>
    </div>
  )
}

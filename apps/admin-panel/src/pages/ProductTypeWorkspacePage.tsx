import { Pill, SectionCard } from '@flower-marketplace/frontend-core'
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

export function ProductTypeWorkspacePage({ session, onBack }: ProductTypeWorkspacePageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [productTypes, setProductTypes] = useState<ProductTypeRecord[]>([])
  const [elements, setElements] = useState<ProductElementRecord[]>([])
  const [selectedProductTypeId, setSelectedProductTypeId] = useState<string>('new')
  const [form, setForm] = useState<ProductTypeFormState>(() => createEmptyProductTypeForm())
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

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
      return
    }

    const productType = productTypes.find((item) => readText(item, ['id'], '') === selectedProductTypeId)
    if (productType) {
      setForm(mapProductTypeToForm(productType))
    }
  }, [productTypes, selectedProductTypeId])

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

        <SectionCard
          eyebrow="catalog product types"
          title="مدیریت نوع محصول"
          description="ساخت و ویرایش product typeها به همراه تصویر، SEO و المان‌های مجاز هر نوع محصول."
          actions={
            <div className="page-builder-workspace__actions">
              <button className="fm-button fm-button--ghost" onClick={onBack} type="button">
                بازگشت
              </button>
              <button className="fm-button fm-button--secondary" onClick={() => { setSelectedProductTypeId('new'); setForm(createEmptyProductTypeForm()) }} type="button">
                نوع محصول جدید
              </button>
              {selectedProductTypeId !== 'new' ? (
                <button className="fm-button fm-button--secondary" disabled={submitting} onClick={() => void handleDelete()} type="button">
                  حذف نوع محصول
                </button>
              ) : null}
              <button className="fm-button fm-button--primary" disabled={submitting} onClick={() => void handleSubmit()} type="button">
                {submitting ? 'در حال ذخیره...' : selectedProductTypeId === 'new' ? 'ساخت نوع محصول' : 'ذخیره تغییرات'}
              </button>
            </div>
          }
        >
          <div className="page-builder-workspace__pills">
            <Pill>{selectedProductTypeId === 'new' ? 'نوع محصول جدید' : `شناسه ${selectedProductTypeId}`}</Pill>
            <Pill>{`${productTypes.length} نوع محصول`}</Pill>
            <Pill>{`${form.allowedElementIds.length} المان مجاز`}</Pill>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="product type manager"
          title="فرم نوع محصول"
          description="همین‌جا نام، اسلاگ، تصویر، توضیحات و المان‌های مجاز را تعیین کن."
        >
          <div className="fm-grid page-builder-form-grid">
            <label className="fm-field page-builder-field--wide">
              <span>انتخاب نوع محصول برای ویرایش</span>
              <select onChange={(event) => setSelectedProductTypeId(event.target.value)} value={selectedProductTypeId}>
                <option value="new">نوع محصول جدید</option>
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
              <span>نام نوع محصول</span>
              <input onChange={(event) => updateForm('name', event.target.value)} type="text" value={form.name} />
            </label>
            <label className="fm-field">
              <span>اسلاگ</span>
              <input onChange={(event) => updateForm('slug', event.target.value)} type="text" value={form.slug} />
            </label>
            <label className="fm-field page-builder-field--wide">
              <span>توضیحات</span>
              <textarea onChange={(event) => updateForm('description', event.target.value)} rows={4} value={form.description} />
            </label>

            <label className="fm-field page-builder-field--wide">
              <span>تصویر نوع محصول</span>
              <input onChange={(event) => updateForm('image', event.target.value)} type="text" value={form.image} />
            </label>
            <div className="admin-products-upload-card page-builder-field--wide">
              <div className="admin-products-upload-actions">
                <button className="content-secondary-action" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()} type="button">
                  {uploadingImage ? 'در حال آپلود...' : 'آپلود تصویر نوع محصول'}
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
              <textarea onChange={(event) => updateForm('metaDescription', event.target.value)} rows={3} value={form.metaDescription} />
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
                  const type = readText(element, ['type'], '—')
                  return (
                    <option key={id} value={id}>
                      {`${name} / ${type}`}
                    </option>
                  )
                })}
              </select>
              <small>برای انتخاب چند المان، `Ctrl/Cmd` را نگه دار.</small>
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
      </LoadableState>
    </div>
  )
}

import { Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type CategoryWorkspacePageProps = {
  session: AuthSession
  onBack: () => void
}

type CategoryRecord = Record<string, unknown>

type CategoryFormState = {
  name: string
  slug: string
  parentId: string
  description: string
  image: string
  metaTitle: string
  metaDescription: string
  isIndexed: boolean
  isCampaign: boolean
}

function createEmptyCategoryForm(): CategoryFormState {
  return {
    name: '',
    slug: '',
    parentId: '',
    description: '',
    image: '',
    metaTitle: '',
    metaDescription: '',
    isIndexed: true,
    isCampaign: false,
  }
}

function flattenCategories(categories: CategoryRecord[], depth = 0): Array<CategoryRecord & { depth: number }> {
  return categories.flatMap((category) => {
    const children = toArray(category.children)
    return [{ ...category, depth }, ...flattenCategories(children, depth + 1)]
  })
}

function countDescendants(category: CategoryRecord): number {
  const children = toArray(category.children)
  return children.length + children.reduce((sum, child) => sum + countDescendants(child), 0)
}

function mapCategoryToForm(category: CategoryRecord): CategoryFormState {
  return {
    name: readText(category, ['name'], ''),
    slug: readText(category, ['slug'], ''),
    parentId: readText(category, ['parentId'], ''),
    description: readText(category, ['description'], ''),
    image: readText(category, ['image'], ''),
    metaTitle: readText(category, ['metaTitle'], ''),
    metaDescription: readText(category, ['metaDescription'], ''),
    isIndexed: category.isIndexed !== false,
    isCampaign: category.isCampaign === true,
  }
}

function toOptionalText(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function getCategoryDepthLabel(depth: number) {
  if (depth <= 0) return 'ریشه'
  return `سطح ${depth + 1}`
}

export function CategoryWorkspacePage({ session, onBack }: CategoryWorkspacePageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('new')
  const [form, setForm] = useState<CategoryFormState>(() => createEmptyCategoryForm())
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
        const payload = await adminApi.getCategories(session)
        if (!active) return
        setCategories(toArray(payload))
      } catch (requestError) {
        if (!active) return
        setError(requestError instanceof Error ? requestError.message : 'بارگذاری دسته‌بندی‌ها ناموفق بود')
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
    if (selectedCategoryId === 'new') {
      setForm(createEmptyCategoryForm())
      return
    }

    const flat = flattenCategories(categories)
    const category = flat.find((item) => readText(item, ['id'], '') === selectedCategoryId)
    if (category) {
      setForm(mapCategoryToForm(category))
    }
  }, [categories, selectedCategoryId])

  const categoryOptions = useMemo(() => flattenCategories(categories), [categories])
  const selectedCategory =
    selectedCategoryId === 'new' ? null : categoryOptions.find((item) => readText(item, ['id'], '') === selectedCategoryId) ?? null

  async function reloadCategories(nextSelectedId?: string) {
    const payload = await adminApi.getCategories(session)
    const nextCategories = toArray(payload)
    setCategories(nextCategories)
    if (nextSelectedId) {
      setSelectedCategoryId(nextSelectedId)
      const flat = flattenCategories(nextCategories)
      const category = flat.find((item) => readText(item, ['id'], '') === nextSelectedId)
      setForm(category ? mapCategoryToForm(category) : createEmptyCategoryForm())
    }
  }

  function updateForm<K extends keyof CategoryFormState>(key: K, value: CategoryFormState[K]) {
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
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'آپلود تصویر دسته‌بندی ناموفق بود')
    } finally {
      setUploadingImage(false)
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
    }
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.slug.trim()) {
      setError('نام و اسلاگ دسته‌بندی الزامی هستند.')
      return
    }

    setSubmitting(true)
    setError(null)
    setMessage(null)

    const body = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      parentId: form.parentId ? Number(form.parentId) : undefined,
      description: toOptionalText(form.description),
      image: toOptionalText(form.image),
      metaTitle: toOptionalText(form.metaTitle),
      metaDescription: toOptionalText(form.metaDescription),
      isIndexed: form.isIndexed,
      isCampaign: form.isCampaign,
    }

    try {
      const payload =
        selectedCategoryId === 'new'
          ? await adminApi.createCategory(session, body)
          : await adminApi.updateCategory(session, selectedCategoryId, body)

      const nextId = readText(payload as Record<string, unknown>, ['id'], selectedCategoryId)
      await reloadCategories(nextId === 'new' ? undefined : nextId)
      setMessage(selectedCategoryId === 'new' ? 'دسته‌بندی جدید ساخته شد.' : 'دسته‌بندی با موفقیت به‌روزرسانی شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ذخیره دسته‌بندی ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (selectedCategoryId === 'new') return

    setSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      await adminApi.deleteCategory(session, selectedCategoryId)
      await reloadCategories()
      setSelectedCategoryId('new')
      setForm(createEmptyCategoryForm())
      setMessage('دسته‌بندی حذف شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'حذف دسته‌بندی ناموفق بود')
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
          eyebrow="catalog taxonomy"
          title="مدیریت دسته‌بندی محصولات"
          description="ساخت، ویرایش و سازمان‌دهی دسته‌بندی‌های مادر و فرزند محصولات با دید درختی، تصویر و SEO هر دسته."
          actions={
            <div className="page-builder-workspace__actions">
              <button className="fm-button fm-button--ghost" onClick={onBack} type="button">
                بازگشت
              </button>
              <button
                className="fm-button fm-button--secondary"
                onClick={() => {
                  setSelectedCategoryId('new')
                  setForm(createEmptyCategoryForm())
                }}
                type="button"
              >
                دسته جدید
              </button>
              {selectedCategoryId !== 'new' ? (
                <button className="fm-button fm-button--secondary" disabled={submitting} onClick={() => void handleDelete()} type="button">
                  حذف دسته
                </button>
              ) : null}
              <button className="fm-button fm-button--primary" disabled={submitting} onClick={() => void handleSubmit()} type="button">
                {submitting ? 'در حال ذخیره...' : selectedCategoryId === 'new' ? 'ساخت دسته' : 'ذخیره تغییرات'}
              </button>
            </div>
          }
        >
          <div className="page-builder-workspace__pills">
            <Pill>{selectedCategoryId === 'new' ? 'دسته جدید' : `شناسه ${selectedCategoryId}`}</Pill>
            <Pill>{`${categoryOptions.length} دسته / زیر‌دسته`}</Pill>
            <Pill>{selectedCategory ? getCategoryDepthLabel(selectedCategory.depth) : 'آماده ساخت'}</Pill>
          </div>
        </SectionCard>

        <div className="category-workspace-layout">
          <SectionCard
            eyebrow="tree navigator"
            title="ساختار درختی دسته‌بندی‌ها"
            description="ابتدا یک دسته را از درخت انتخاب کن یا دسته جدید بساز. عمق، والد و تعداد فرزندها همین‌جا مشخص است."
          >
            <div className="category-workspace-tree">
              <button
                className={`category-tree-card ${selectedCategoryId === 'new' ? 'is-active' : ''}`}
                onClick={() => {
                  setSelectedCategoryId('new')
                  setForm(createEmptyCategoryForm())
                }}
                type="button"
              >
                <span className="category-tree-card__content">
                  <strong className="category-tree-card__title">+ ساخت دسته جدید</strong>
                  <span className="category-tree-card__meta">یک node جدید در taxonomy بساز</span>
                </span>
              </button>

              {categoryOptions.map((category) => {
                const id = readText(category, ['id'], '')
                const name = readText(category, ['name'], 'بدون نام')
                const childCount = toArray(category.children).length
                const descendants = countDescendants(category)
                const parentName =
                  category.depth > 0
                    ? readText(
                        categoryOptions.find((item) => readText(item, ['id'], '') === readText(category, ['parentId'], '')),
                        ['name'],
                        'نامشخص',
                      )
                    : 'بدون والد'

                return (
                  <button
                    key={id}
                    className={`category-tree-card ${selectedCategoryId === id ? 'is-active' : ''}`}
                    onClick={() => setSelectedCategoryId(id)}
                    style={{ ['--category-depth' as string]: String(category.depth) }}
                    type="button"
                  >
                    <span className="category-tree-card__branch" aria-hidden="true">
                      {category.depth > 0 ? '└' : '•'}
                    </span>
                    <span className="category-tree-card__content">
                      <strong className="category-tree-card__title">{name}</strong>
                      <span className="category-tree-card__meta">{`${getCategoryDepthLabel(category.depth)} · والد: ${parentName}`}</span>
                      <span className="category-tree-card__meta">{`${childCount} فرزند مستقیم · ${descendants} آیتم در زیر‌درخت`}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="category manager"
            title="فرم دسته‌بندی"
            description="همین‌جا دسته مادر، توضیح، تصویر و SEO دسته را تنظیم کن."
          >
            <div className="fm-grid page-builder-form-grid">
              <label className="fm-field page-builder-field--wide">
                <span>انتخاب دسته برای ویرایش</span>
                <select onChange={(event) => setSelectedCategoryId(event.target.value)} value={selectedCategoryId}>
                  <option value="new">دسته جدید</option>
                  {categoryOptions.map((category) => {
                    const id = readText(category, ['id'], '')
                    const name = readText(category, ['name'], 'بدون نام')
                    const prefix = category.depth > 0 ? `${'— '.repeat(category.depth)}` : ''
                    return (
                      <option key={id} value={id}>
                        {`${prefix}${name}`}
                      </option>
                    )
                  })}
                </select>
              </label>

              <div className="category-workspace-summary page-builder-field--wide">
                <div>
                  <strong>{selectedCategory ? readText(selectedCategory, ['name'], 'بدون نام') : 'دسته جدید'}</strong>
                  <span>{selectedCategory ? getCategoryDepthLabel(selectedCategory.depth) : 'هنوز ذخیره نشده'}</span>
                </div>
                <div>
                  <strong>{form.parentId ? 'دارای والد' : 'دسته ریشه'}</strong>
                  <span>{form.parentId ? 'در حال اتصال به دسته بالادست' : 'در بالاترین سطح taxonomy'}</span>
                </div>
                <div>
                  <strong>{form.isCampaign ? 'کمپینی' : 'استاندارد'}</strong>
                  <span>{form.isIndexed ? 'قابل ایندکس' : 'No-index'}</span>
                </div>
              </div>

              <label className="fm-field">
                <span>نام دسته</span>
                <input onChange={(event) => updateForm('name', event.target.value)} type="text" value={form.name} />
              </label>
              <label className="fm-field">
                <span>اسلاگ</span>
                <input onChange={(event) => updateForm('slug', event.target.value)} type="text" value={form.slug} />
              </label>
              <label className="fm-field">
                <span>دسته والد</span>
                <select onChange={(event) => updateForm('parentId', event.target.value)} value={form.parentId}>
                  <option value="">بدون والد / دسته اصلی</option>
                  {categoryOptions
                    .filter((category) => readText(category, ['id'], '') !== selectedCategoryId)
                    .map((category) => {
                      const id = readText(category, ['id'], '')
                      const name = readText(category, ['name'], 'بدون نام')
                      const prefix = category.depth > 0 ? `${'— '.repeat(category.depth)}` : ''
                      return (
                        <option key={id} value={id}>
                          {`${prefix}${name}`}
                        </option>
                      )
                    })}
                </select>
              </label>

              <label className="fm-field page-builder-field--wide">
                <span>توضیحات دسته</span>
                <textarea onChange={(event) => updateForm('description', event.target.value)} rows={4} value={form.description} />
              </label>

              <label className="fm-field page-builder-field--wide">
                <span>تصویر دسته</span>
                <input onChange={(event) => updateForm('image', event.target.value)} type="text" value={form.image} />
              </label>
              <div className="admin-products-upload-card page-builder-field--wide">
                <div className="admin-products-upload-actions">
                  <button className="content-secondary-action" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()} type="button">
                    {uploadingImage ? 'در حال آپلود...' : 'آپلود تصویر دسته'}
                  </button>
                  <span className="admin-products-upload-hint">تصویر از همان سرویس upload سراسری استفاده می‌کند.</span>
                </div>
                {form.image.trim() ? (
                  <div className="admin-products-image-preview">
                    <img alt="Preview category" src={form.image} />
                  </div>
                ) : null}
              </div>

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
              <label className="fm-field page-builder-checkbox">
                <span>دسته کمپین است</span>
                <input checked={form.isCampaign} onChange={(event) => updateForm('isCampaign', event.target.checked)} type="checkbox" />
              </label>
            </div>
          </SectionCard>
        </div>
      </LoadableState>
    </div>
  )
}

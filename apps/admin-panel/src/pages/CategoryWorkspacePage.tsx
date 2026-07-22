import { FormatTextarea, Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import { formatPersianNumber } from '../lib/products'
import type { AuthSession } from '../lib/session'

type CategoryWorkspacePageProps = {
  session: AuthSession
  onBack: () => void
}

type CategoryRecord = Record<string, unknown>
type FaqRecord = Record<string, unknown>

type CategoryFormState = {
  name: string
  slug: string
  parentId: string
  description: string
  descriptionHtml: string
  image: string
  imageAlt: string
  thumbnailUrl: string
  metaTitle: string
  metaDescription: string
  isIndexed: boolean
  isCampaign: boolean
}

type FaqFormState = {
  question: string
  answer: string
  sortOrder: string
  isActive: boolean
}

function createEmptyCategoryForm(): CategoryFormState {
  return {
    name: '',
    slug: '',
    parentId: '',
    description: '',
    descriptionHtml: '',
    image: '',
    imageAlt: '',
    thumbnailUrl: '',
    metaTitle: '',
    metaDescription: '',
    isIndexed: true,
    isCampaign: false,
  }
}

function createEmptyFaqForm(): FaqFormState {
  return {
    question: '',
    answer: '',
    sortOrder: '0',
    isActive: true,
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
    descriptionHtml: readText(category, ['descriptionHtml'], ''),
    image: readText(category, ['image'], ''),
    imageAlt: readText(category, ['imageAlt'], ''),
    thumbnailUrl: readText(category, ['thumbnailUrl'], ''),
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

  const [openSections, setOpenSections] = useState({
    tree: true,
    basics: true,
    description: true,
    seo: false,
    faq: false,
  })

  const [faqs, setFaqs] = useState<FaqRecord[]>([])
  const [faqForm, setFaqForm] = useState<FaqFormState>(() => createEmptyFaqForm())
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null)
  const [faqSubmitting, setFaqSubmitting] = useState(false)

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
      setFaqs([])
      return
    }

    const flat = flattenCategories(categories)
    const category = flat.find((item) => readText(item, ['id'], '') === selectedCategoryId)
    if (category) {
      setForm(mapCategoryToForm(category))
      setFaqs(toArray(category.categoryFaqs))
    }
  }, [categories, selectedCategoryId])

  const categoryOptions = useMemo(() => flattenCategories(categories), [categories])
  const selectedCategory =
    selectedCategoryId === 'new' ? null : categoryOptions.find((item) => readText(item, ['id'], '') === selectedCategoryId) ?? null

  const seoChecklist = useMemo(() => {
    const titleLen = form.metaTitle.trim().length
    const descLen = form.metaDescription.trim().length
    return [
      { label: 'عنوان متا', value: titleLen > 0 ? `${formatPersianNumber(titleLen)} کاراکتر` : 'نیازمند تکمیل', ok: titleLen > 0 },
      { label: 'توضیح متا', value: descLen > 0 ? `${formatPersianNumber(descLen)} کاراکتر` : 'نیازمند تکمیل', ok: descLen > 0 },
      { label: 'اسلاگ', value: form.slug.trim() ? form.slug.trim() : 'نیازمند تکمیل', ok: !!form.slug.trim() },
      { label: 'ایندکس', value: form.isIndexed ? 'فعال' : 'غیرفعال', ok: form.isIndexed },
    ]
  }, [form.metaTitle, form.metaDescription, form.slug, form.isIndexed])

  const previewTitle = form.metaTitle.trim() || form.name.trim() || 'عنوان دسته‌بندی'
  const previewDescription = form.metaDescription.trim() || form.description.trim() || 'توضیحات این دسته‌بندی هنوز نوشته نشده است.'

  function toggleSection(key: keyof typeof openSections) {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }))
  }

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
      if (uploaded.variants?.thumbnail?.url) {
        updateForm('thumbnailUrl', uploaded.variants.thumbnail.url)
      }
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
      descriptionHtml: toOptionalText(form.descriptionHtml),
      image: toOptionalText(form.image),
      imageAlt: toOptionalText(form.imageAlt),
      thumbnailUrl: toOptionalText(form.thumbnailUrl),
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

  async function handleFaqSubmit() {
    if (!selectedCategoryId || selectedCategoryId === 'new') return
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
        await adminApi.updateCategoryFaq(session, selectedCategoryId, editingFaqId, body)
      } else {
        await adminApi.createCategoryFaq(session, selectedCategoryId, body)
      }
      const updatedFaqs = await adminApi.getCategoryFaqs(session, selectedCategoryId)
      setFaqs(toArray(updatedFaqs))
      setFaqForm(createEmptyFaqForm())
      setEditingFaqId(null)
      setMessage(editingFaqId ? 'سوال متداول به‌روزرسانی شد.' : 'سوال متداول جدید اضافه شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ذخیره سوال متداول ناموفق بود')
    } finally {
      setFaqSubmitting(false)
    }
  }

  async function handleFaqDelete(faqId: string) {
    if (!selectedCategoryId || selectedCategoryId === 'new') return

    setFaqSubmitting(true)
    setError(null)

    try {
      await adminApi.deleteCategoryFaq(session, selectedCategoryId, faqId)
      const updatedFaqs = await adminApi.getCategoryFaqs(session, selectedCategoryId)
      setFaqs(toArray(updatedFaqs))
      if (editingFaqId === faqId) {
        setFaqForm(createEmptyFaqForm())
        setEditingFaqId(null)
      }
      setMessage('سوال متداول حذف شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'حذف سوال متداول ناموفق بود')
    } finally {
      setFaqSubmitting(false)
    }
  }

  function handleFaqEdit(faq: FaqRecord) {
    setEditingFaqId(readText(faq, ['id'], ''))
    setFaqForm({
      question: readText(faq, ['question'], ''),
      answer: readText(faq, ['answer'], ''),
      sortOrder: readText(faq, ['sortOrder'], '0'),
      isActive: faq.isActive !== false,
    })
  }

  function handleFaqCancelEdit() {
    setEditingFaqId(null)
    setFaqForm(createEmptyFaqForm())
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
          eyebrow="تاکسونومی"
          title="دسته‌بندی‌ها"
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
                  setFaqs([])
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
            <Pill>{selectedCategoryId === 'new' ? 'دسته جدید' : `#${selectedCategoryId}`}</Pill>
            <Pill>{`${categoryOptions.length} دسته / زیر‌دسته`}</Pill>
            <Pill>{selectedCategory ? getCategoryDepthLabel(selectedCategory.depth) : 'آماده ساخت'}</Pill>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="درخت"
          title="ساختار دسته‌ها"
          actions={
            <button className={`content-accordion-trigger${openSections.tree ? ' is-open' : ''}`} onClick={() => toggleSection('tree')} type="button">
              {openSections.tree ? 'بستن' : 'باز کردن'}
            </button>
          }
        >
          {openSections.tree ? (
            <div className="category-workspace-tree">
              <button
                className={`category-tree-card ${selectedCategoryId === 'new' ? 'is-active' : ''}`}
                onClick={() => {
                  setSelectedCategoryId('new')
                  setForm(createEmptyCategoryForm())
                  setFaqs([])
                }}
                type="button"
              >
                <span className="category-tree-card__content">
                  <strong className="category-tree-card__title">+ ساخت دسته جدید</strong>
                  <span className="category-tree-card__meta">دسته تازه</span>
                </span>
              </button>

              {categoryOptions.map((category) => {
                const id = readText(category, ['id'], '')
                const name = readText(category, ['name'], 'بدون نام')
                const childCount = toArray(category.children).length
                const descendants = countDescendants(category)
                const parentCategory = categoryOptions.find(
                  (item) => readText(item, ['id'], '') === readText(category, ['parentId'], ''),
                )
                const parentName = parentCategory ? readText(parentCategory, ['name'], 'نامشخص') : 'بدون والد'

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
          ) : (
            <p className="content-collapsed-note">درخت دسته‌بندی بسته است.</p>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="ویرایش"
          title="اطلاعات پایه"
          actions={
            <button className={`content-accordion-trigger${openSections.basics ? ' is-open' : ''}`} onClick={() => toggleSection('basics')} type="button">
              {openSections.basics ? 'بستن' : 'باز کردن'}
            </button>
          }
        >
          {openSections.basics ? (
            <div className="category-workspace-layout">
              <div className="category-edit-form">
                <label className="fm-field content-select-field page-builder-field--wide">
                  <span>انتخاب دسته برای ویرایش</span>
                  <select className="fm-input" onChange={(event) => setSelectedCategoryId(event.target.value)} value={selectedCategoryId}>
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
                    <span>{form.parentId ? 'زیرمجموعه' : 'سطح اصلی'}</span>
                  </div>
                  <div>
                    <strong>{form.isCampaign ? 'کمپینی' : 'استاندارد'}</strong>
                    <span>{form.isIndexed ? 'قابل ایندکس' : 'No-index'}</span>
                  </div>
                </div>

                <label className="fm-field content-select-field">
                  <span>نام دسته</span>
                  <input className="fm-input" onChange={(event) => updateForm('name', event.target.value)} type="text" value={form.name} />
                </label>
                <label className="fm-field content-select-field">
                  <span>اسلاگ</span>
                  <input className="fm-input" onChange={(event) => updateForm('slug', event.target.value)} type="text" value={form.slug} />
                </label>
                <label className="fm-field content-select-field page-builder-field--wide">
                  <span>دسته والد</span>
                  <select className="fm-input" onChange={(event) => updateForm('parentId', event.target.value)} value={form.parentId}>
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

                <label className="fm-field content-select-field page-builder-field--wide">
                  <span>تصویر دسته</span>
                  <input className="fm-input" onChange={(event) => updateForm('image', event.target.value)} type="text" value={form.image} />
                </label>
                <div className="admin-products-upload-card page-builder-field--wide">
                  <div className="admin-products-upload-actions">
                    <button className="content-secondary-action" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()} type="button">
                      {uploadingImage ? 'در حال آپلود...' : 'آپلود تصویر دسته'}
                    </button>
                  </div>
                  {form.image.trim() ? (
                    <div className="admin-products-image-preview">
                      <img alt={form.imageAlt || 'Preview category'} src={form.image} />
                    </div>
                  ) : null}
                </div>

                <label className="fm-field content-select-field page-builder-field--wide">
                  <span>متن جایگزین تصویر (Alt Text)</span>
                  <input
                    className="fm-input"
                    onChange={(event) => updateForm('imageAlt', event.target.value)}
                    placeholder="توصیف تصویر برای موتورهای جستجو و دسترسی‌پذیری"
                    type="text"
                    value={form.imageAlt}
                  />
                </label>

                <label className="fm-field page-builder-checkbox">
                  <span>دسته کمپین است</span>
                  <input checked={form.isCampaign} onChange={(event) => updateForm('isCampaign', event.target.checked)} type="checkbox" />
                </label>
              </div>
            </div>
          ) : (
            <p className="content-collapsed-note">اطلاعات پایه بسته است.</p>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="محتوا"
          title="توضیحات دسته"
          actions={
            <button className={`content-accordion-trigger${openSections.description ? ' is-open' : ''}`} onClick={() => toggleSection('description')} type="button">
              {openSections.description ? 'بستن' : 'باز کردن'}
            </button>
          }
        >
          {openSections.description ? (
            <FormatTextarea
              id="category-description"
              onChange={(value) => {
                updateForm('descriptionHtml', value)
                updateForm('description', value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
              }}
              placeholder="توضیحات کامل دسته‌بندی را اینجا بنویسید..."
              value={form.descriptionHtml}
            />
          ) : (
            <p className="content-collapsed-note">ویرایشگر توضیحات بسته است.</p>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="سئو"
          title="metadata و preview"
          actions={
            <button className={`content-accordion-trigger${openSections.seo ? ' is-open' : ''}`} onClick={() => toggleSection('seo')} type="button">
              {openSections.seo ? 'بستن تنظیمات سئو' : 'باز کردن تنظیمات سئو'}
            </button>
          }
        >
          {openSections.seo ? (
            <>
              <div className="content-editor-grid">
                <label className="content-select-field">
                  <span>عنوان متا</span>
                  <input className="fm-input" onChange={(event) => updateForm('metaTitle', event.target.value)} value={form.metaTitle} />
                </label>
                <label className="content-select-field content-editor-field--wide">
                  <span>توضیح متا</span>
                  <textarea className="fm-input" onChange={(event) => updateForm('metaDescription', event.target.value)} rows={4} value={form.metaDescription} />
                </label>
              </div>

              <div className="content-workspace-checklist-grid">
                {seoChecklist.map((item) => (
                  <article className={`content-workspace-check-item${item.ok ? ' is-ok' : ''}`} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>

              <div className="content-preview-grid">
                <article className="content-preview-card">
                  <span>پیش‌نمایش جستجو</span>
                  <strong>{previewTitle}</strong>
                  <p>{previewDescription}</p>
                </article>
                <article className="content-preview-card">
                  <span>وضعیت ایندکس</span>
                  <strong>{form.isIndexed ? 'قابل ایندکس' : 'غیرقابل ایندکس (NoIndex)'}</strong>
                  <p>{form.isIndexed ? 'این دسته‌بندی در نتایج جستجو نمایش داده می‌شود.' : 'این دسته‌بندی از نتایج جستجو حذف شده است.'}</p>
                </article>
              </div>

              <label className="fm-field page-builder-checkbox">
                <span>ایندکس در SEO</span>
                <input checked={form.isIndexed} onChange={(event) => updateForm('isIndexed', event.target.checked)} type="checkbox" />
              </label>
            </>
          ) : (
            <p className="content-collapsed-note">تنظیمات سئو بسته هستند.</p>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="سوالات متداول"
          title="FAQ دسته‌بندی"
          actions={
            <button className={`content-accordion-trigger${openSections.faq ? ' is-open' : ''}`} onClick={() => toggleSection('faq')} type="button">
              {openSections.faq ? 'بستن' : 'باز کردن'}
            </button>
          }
        >
          {openSections.faq ? (
            <div className="category-faq-section">
              {selectedCategoryId === 'new' ? (
                <p className="content-collapsed-note">ابتدا دسته‌بندی را ذخیره کنید تا بتوانید سوالات متداول اضافه کنید.</p>
              ) : (
                <>
                  <div className="category-faq-form content-editor-grid">
                    <label className="content-select-field page-builder-field--wide">
                      <span>سوال</span>
                      <input
                        className="fm-input"
                        onChange={(event) => setFaqForm((current) => ({ ...current, question: event.target.value }))}
                        placeholder="مثلاً: آیا امکان بازگشت کالا وجود دارد؟"
                        value={faqForm.question}
                      />
                    </label>
                    <label className="content-select-field page-builder-field--wide">
                      <span>پاسخ</span>
                      <textarea
                        className="fm-input"
                        onChange={(event) => setFaqForm((current) => ({ ...current, answer: event.target.value }))}
                        placeholder="پاسخ سوال را اینجا بنویسید..."
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
                      <input checked={faqForm.isActive} onChange={(event) => setFaqForm((current) => ({ ...current, isActive: event.target.checked }))} type="checkbox" />
                    </label>
                    <div className="products-header-actions">
                      <button className="content-primary-action" disabled={faqSubmitting} onClick={() => void handleFaqSubmit()} type="button">
                        {faqSubmitting ? 'در حال ذخیره...' : editingFaqId ? 'به‌روزرسانی' : 'افزودن سوال'}
                      </button>
                      {editingFaqId ? (
                        <button className="content-secondary-action" disabled={faqSubmitting} onClick={handleFaqCancelEdit} type="button">
                          لغو
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="category-faq-list">
                    {faqs.length ? (
                      faqs.map((faq) => {
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
                </>
              )}
            </div>
          ) : (
            <p className="content-collapsed-note">بخش سوالات متداول بسته است.</p>
          )}
        </SectionCard>
      </LoadableState>
    </div>
  )
}

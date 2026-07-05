import { FormatTextarea, Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { formatPersianNumber, normalizeSlug } from '../lib/content'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type SeoLandingWorkspacePageProps = {
  session: AuthSession
  mode: 'create' | 'edit'
  landingId: number | null
  onBack: () => void
}

type FilterEntry = { type: string; valueId: number; label: string }

type LandingFormState = {
  internalName: string
  slug: string
  categoryId: string
  filterConfig: FilterEntry[]
  isActive: boolean
  metaTitle: string
  metaDescription: string
  h1Tag: string
  seoContent: string
}

type FlatItem = { id: string; name: string; depth: number; slug?: string }

function createEmptyForm(): LandingFormState {
  return {
    internalName: '',
    slug: '',
    categoryId: '',
    filterConfig: [],
    isActive: true,
    metaTitle: '',
    metaDescription: '',
    h1Tag: '',
    seoContent: '',
  }
}

function mapLandingToForm(landing: Record<string, unknown>): LandingFormState {
  const filterConfig = Array.isArray(landing.filterConfig) ? landing.filterConfig : []
  return {
    internalName: readText(landing, ['internalName'], ''),
    slug: readText(landing, ['slug'], ''),
    categoryId: readText(landing, ['categoryId'], ''),
    filterConfig: filterConfig.map((f: Record<string, unknown>) => ({
      type: readText(f, ['type'], ''),
      valueId: Number(readText(f, ['valueId'], '0')),
      label: readText(f, ['label'], ''),
    })),
    isActive: typeof landing.isActive === 'boolean' ? landing.isActive : true,
    metaTitle: readText(landing, ['metaTitle'], ''),
    metaDescription: readText(landing, ['metaDescription'], ''),
    h1Tag: readText(landing, ['h1Tag'], ''),
    seoContent: readText(landing, ['seoContent'], ''),
  }
}

function toOptionalText(value: string) {
  const normalized = value.trim()
  return normalized === '' ? undefined : normalized
}

function stripHtml(html: string) {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, ' ')
  const temp = document.createElement('div')
  temp.innerHTML = html
  return temp.textContent || temp.innerText || ''
}

function countMatches(text: string, pattern: RegExp) {
  return (text.match(pattern) || []).length
}

function flattenTree(
  items: Record<string, unknown>[],
  nameKey: string,
  childrenKey: string,
  depth = 0,
): FlatItem[] {
  return items.flatMap((item) => {
    const children = Array.isArray(item[childrenKey]) ? (item[childrenKey] as Record<string, unknown>[]) : []
    return [
      { id: String(item.id), name: readText(item, [nameKey], '—'), depth, slug: readText(item, ['slug'], '') },
      ...flattenTree(children, nameKey, childrenKey, depth + 1),
    ]
  })
}

const FILTER_TYPES = [
  { value: 'productType', label: 'نوع محصول' },
  { value: 'element', label: 'عنصر / ماده اولیه' },
] as const

export function SeoLandingWorkspacePage({ session, mode, landingId, onBack }: SeoLandingWorkspacePageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  useNoticeEffect(submitMessage, 'success')
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>(mode)
  const [currentLandingId, setCurrentLandingId] = useState<number | null>(landingId)
  const [categories, setCategories] = useState<FlatItem[]>([])
  const [productTypes, setProductTypes] = useState<FlatItem[]>([])
  const [elements, setElements] = useState<FlatItem[]>([])
  const [form, setForm] = useState<LandingFormState>(() => createEmptyForm())
  const [seoOpen, setSeoOpen] = useState(false)
  const [referenceVersion, setReferenceVersion] = useState(0)

  useEffect(() => {
    setEditorMode(mode)
    setCurrentLandingId(landingId)
    setSubmitMessage(null)
  }, [landingId, mode])

  useEffect(() => {
    let active = true

    async function loadWorkspace() {
      setLoading(true)
      setError(null)

      try {
        const [categoriesPayload, productTypesPayload, elementsPayload, landingPayload] = await Promise.all([
          adminApi.getCategories(session),
          adminApi.getProductTypes(session),
          adminApi.getProductElements(session),
          currentLandingId ? adminApi.getSeoLanding(session, currentLandingId) : Promise.resolve(null),
        ])

        if (!active) return

        setCategories(flattenTree(toArray(categoriesPayload), 'name', 'children'))
        setProductTypes(flattenTree(toArray(productTypesPayload), 'name', 'children'))
        setElements(toArray(elementsPayload).map((item) => ({
          id: String(item.id),
          name: readText(item, ['name'], '—'),
          depth: 0,
        })))

        if (currentLandingId && landingPayload) {
          setForm(mapLandingToForm(landingPayload as Record<string, unknown>))
        } else {
          setForm(createEmptyForm())
        }
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری میزکار')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadWorkspace()
    return () => {
      active = false
    }
  }, [currentLandingId, referenceVersion, session])

  const contentPlainText = stripHtml(form.seoContent).replace(/\s+/g, ' ').trim()
  const wordCount = contentPlainText ? contentPlainText.split(' ').filter(Boolean).length : 0
  const h2Count = countMatches(form.seoContent, /<h2\b/gi)
  const internalLinkCount = countMatches(form.seoContent, /href="(\/|https?:\/\/[^\"]*?(products|categories))/gi)

  const selectedCategory = categories.find((c) => c.id === form.categoryId)

  function update<Key extends keyof LandingFormState>(key: Key, value: LandingFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function addFilterEntry() {
    setForm((current) => ({
      ...current,
      filterConfig: [...current.filterConfig, { type: 'productType', valueId: 0, label: '' }],
    }))
  }

  function updateFilterType(index: number, type: string) {
    setForm((current) => ({
      ...current,
      filterConfig: current.filterConfig.map((entry, i) =>
        i === index ? { ...entry, type, valueId: 0, label: '' } : entry,
      ),
    }))
  }

  function updateFilterValue(index: number, valueId: number) {
    const options = getFilterOptions(form.filterConfig[index].type)
    const selected = options.find((o) => o.id === String(valueId))
    setForm((current) => ({
      ...current,
      filterConfig: current.filterConfig.map((entry, i) =>
        i === index ? { ...entry, valueId, label: selected?.name || '' } : entry,
      ),
    }))
  }

  function removeFilterEntry(index: number) {
    setForm((current) => ({
      ...current,
      filterConfig: current.filterConfig.filter((_, i) => i !== index),
    }))
  }

  function getFilterOptions(type: string): FlatItem[] {
    if (type === 'productType') return productTypes
    if (type === 'element') return elements
    return []
  }

  function getFilterLabel(type: string): string {
    return FILTER_TYPES.find((t) => t.value === type)?.label || type
  }

  async function handleSubmit() {
    if (!form.internalName.trim()) {
      setError('نام داخلی لندینگ الزامی است.')
      return
    }

    if (!form.slug.trim()) {
      setError('اسلاگ لندینگ الزامی است.')
      return
    }

    if (!form.categoryId) {
      setError('انتخاب دسته‌بندی الزامی است.')
      return
    }

    const validFilters = form.filterConfig.filter((f) => f.type.trim() && f.valueId > 0)
    if (validFilters.length === 0) {
      setError('حداقل یک فیلتر معتبر تعریف کنید.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSubmitMessage(null)

    const payload = {
      internalName: form.internalName.trim(),
      slug: form.slug.trim(),
      categoryId: Number(form.categoryId),
      filterConfig: validFilters,
      isActive: form.isActive,
      metaTitle: toOptionalText(form.metaTitle),
      metaDescription: toOptionalText(form.metaDescription),
      h1Tag: toOptionalText(form.h1Tag),
      seoContent: toOptionalText(form.seoContent),
    }

    try {
      const result =
        editorMode === 'edit' && currentLandingId
          ? await adminApi.updateSeoLanding(session, currentLandingId, payload)
          : await adminApi.createSeoLanding(session, payload)

      const record = result as Record<string, unknown>
      const nextId = Number(readText(record, ['id'], String(currentLandingId ?? '')))

      setForm(mapLandingToForm(record))
      setEditorMode('edit')
      setCurrentLandingId(nextId || currentLandingId)
      setSubmitMessage('لندینگ با موفقیت ذخیره شد.')
      setReferenceVersion((current) => current + 1)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ذخیره لندینگ ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  const categoryPath = selectedCategory ? `/categories/${selectedCategory.slug}` : '/categories/...'

  return (
    <div className="fm-stack">
      <LoadableState error={error} loading={loading}>
        <SectionCard
          eyebrow="میزکار لندینگ سئو"
          title={editorMode === 'edit' ? `لندینگ #${currentLandingId ?? '—'}` : 'لندینگ جدید'}
          actions={
            <div className="content-workspace-topbar-actions">
              <Pill tone={editorMode === 'edit' ? 'success' : 'warning'}>
                {editorMode === 'edit' ? 'در حال ویرایش' : 'لندینگ جدید'}
              </Pill>
              <button className="content-secondary-action" onClick={onBack} type="button">
                بازگشت به لیست
              </button>
              <button className="content-primary-action" disabled={submitting} onClick={handleSubmit} type="button">
                {submitting ? 'در حال ذخیره...' : editorMode === 'edit' ? 'به‌روزرسانی' : 'ذخیره لندینگ'}
              </button>
            </div>
          }
        >
          <div className="content-workspace-stack">
            <div className="content-workspace-form-grid">
              <SectionCard
                eyebrow="هسته لندینگ"
                title="هویت لندینگ"
              >
                <div className="content-editor-grid">
                  <label className="fm-field content-editor-field--wide">
                    <span>نام داخلی لندینگ</span>
                    <input
                      onChange={(event) => update('internalName', event.target.value)}
                      placeholder="مثال: سبد گل خواستگاری"
                      value={form.internalName}
                    />
                  </label>

                  <label className="fm-field">
                    <span>اسلاگ URL</span>
                    <div className="content-inline-input">
                      <input
                        onChange={(event) => update('slug', event.target.value)}
                        placeholder="flower-basket-proposal"
                        value={form.slug}
                      />
                      <button onClick={() => update('slug', normalizeSlug(form.internalName || form.slug))} type="button">
                        ساخت خودکار
                      </button>
                    </div>
                  </label>

                  <label className="fm-field">
                    <span>دسته‌بندی اصلی</span>
                    <select onChange={(event) => update('categoryId', event.target.value)} value={form.categoryId}>
                      <option value="">انتخاب دسته‌بندی</option>
                      {categories.map((item) => (
                        <option key={item.id} value={item.id}>
                          {'\u00A0\u00A0'.repeat(item.depth)}{item.depth > 0 ? '└ ' : ''}{item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="fm-field">
                    <span>وضعیت</span>
                    <select onChange={(event) => update('isActive', event.target.value === 'true')} value={String(form.isActive)}>
                      <option value="true">فعال (در لیست سفید)</option>
                      <option value="false">غیرفعال</option>
                    </select>
                  </label>

                  <div className="content-editor-field--wide">
                    <div className="content-filter-section">
                      <div className="content-filter-header">
                        <strong>فیلترهای ترکیبی</strong>
                        <button className="content-secondary-action" onClick={addFilterEntry} type="button">
                          + افزودن فیلتر
                        </button>
                      </div>
                      {form.filterConfig.length === 0 ? (
                        <div className="fm-message">هنوز فیلتری تعریف نشده.</div>
                      ) : (
                        <div className="content-filter-list">
                          {form.filterConfig.map((entry, index) => {
                            const options = getFilterOptions(entry.type)
                            return (
                              <div className="content-filter-row" key={index}>
                                <label className="fm-field">
                                  <span>نوع فیلتر</span>
                                  <select
                                    onChange={(event) => updateFilterType(index, event.target.value)}
                                    value={entry.type}
                                  >
                                    <option value="">انتخاب نوع</option>
                                    {FILTER_TYPES.map((ft) => (
                                      <option key={ft.value} value={ft.value}>{ft.label}</option>
                                    ))}
                                  </select>
                                </label>
                                <label className="fm-field">
                                  <span>مقدار فیلتر</span>
                                  <select
                                    disabled={!entry.type}
                                    onChange={(event) => updateFilterValue(index, Number(event.target.value))}
                                    value={entry.valueId || ''}
                                  >
                                    <option value="">{entry.type ? 'انتخاب کنید' : 'ابتدا نوع را انتخاب کنید'}</option>
                                    {options.map((opt) => (
                                      <option key={opt.id} value={opt.id}>
                                        {'\u00A0\u00A0'.repeat(opt.depth)}{opt.depth > 0 ? '└ ' : ''}{opt.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <div className="content-filter-label-display">
                                  <span>برچسب</span>
                                  <strong>{entry.label || '—'}</strong>
                                </div>
                                <button className="content-secondary-action content-filter-remove" onClick={() => removeFilterEntry(index)} type="button">
                                  حذف
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="کنترل سئو"
                title="متادیتا"
                actions={
                  <div className="content-accordion-actions">
                    <button
                      className={`content-accordion-trigger${seoOpen ? ' is-open' : ''}`}
                      onClick={() => setSeoOpen(!seoOpen)}
                      type="button"
                    >
                      {seoOpen ? 'بستن' : 'باز کردن'}
                    </button>
                  </div>
                }
              >
                {seoOpen ? (
                  <div className="content-editor-grid">
                    <label className="fm-field content-editor-field--wide">
                      <span>عنوان متا (Meta Title) - حداکثر ۶۰ کاراکتر</span>
                      <input
                        onChange={(event) => update('metaTitle', event.target.value)}
                        value={form.metaTitle}
                      />
                      {form.metaTitle.trim() ? (
                        <small className={form.metaTitle.length > 60 ? 'fm-field-error' : ''}>
                          {formatPersianNumber(form.metaTitle.length)} / ۶۰ کاراکتر
                        </small>
                      ) : null}
                    </label>

                    <label className="fm-field content-editor-field--wide">
                      <span>توضیحات متا (Meta Description) - حداکثر ۱۶۰ کاراکتر</span>
                      <textarea
                        onChange={(event) => update('metaDescription', event.target.value)}
                        rows={3}
                        value={form.metaDescription}
                      />
                      {form.metaDescription.trim() ? (
                        <small className={form.metaDescription.length > 160 ? 'fm-field-error' : ''}>
                          {formatPersianNumber(form.metaDescription.length)} / ۱۶۰ کاراکتر
                        </small>
                      ) : null}
                    </label>

                    <label className="fm-field content-editor-field--wide">
                      <span>تگ H1 صفحه</span>
                      <input
                        onChange={(event) => update('h1Tag', event.target.value)}
                        placeholder="عنوان اصلی صفحه که در بالای لیست محصولات نمایش داده می‌شود"
                        value={form.h1Tag}
                      />
                    </label>

                    <div className="content-editor-field--wide">
                      <span>محتوای سئو (SEO Rich Text)</span>
                      <small>محتوای متنی شامل H2، H3 و لینک داخلی که در انتهای صفحه لیست محصولات رندر می‌شود.</small>
                      <FormatTextarea
                        id="seo-landing-content"
                        onChange={(value) => update('seoContent', value)}
                        placeholder="محتوای سئوی صفحه را اینجا بنویسید..."
                        value={form.seoContent}
                      />
                    </div>

                    <div className="content-signal-grid content-editor-field--wide">
                      <article className="content-signal-item">
                        <span>تعداد کلمات</span>
                        <strong>{formatPersianNumber(wordCount)}</strong>
                      </article>
                      <article className="content-signal-item">
                        <span>H2</span>
                        <strong>{formatPersianNumber(h2Count)}</strong>
                      </article>
                      <article className="content-signal-item">
                        <span>لینک داخلی</span>
                        <strong>{formatPersianNumber(internalLinkCount)}</strong>
                      </article>
                    </div>
                  </div>
                ) : (
                  <div className="content-collapsed-note">بخش سئو بسته است.</div>
                )}
              </SectionCard>

              <SectionCard
                eyebrow="پیش‌نمایش"
                title="آدرس و preview"
              >
                <div className="content-snippet-card">
                  <small>{categoryPath}/{form.slug || 'landing-slug'}</small>
                  <strong>{form.metaTitle || form.internalName || 'عنوان متا هنوز تعریف نشده'}</strong>
                  <p>{form.metaDescription || 'توضیحات متا هنوز تعریف نشده.'}</p>
                </div>
                {form.h1Tag ? (
                  <div className="content-detail-grid">
                    <article className="content-detail-item content-detail-item--wide">
                      <span>H1 صفحه</span>
                      <strong>{form.h1Tag}</strong>
                    </article>
                  </div>
                ) : null}
                {form.filterConfig.length > 0 ? (
                  <div className="content-detail-grid">
                    {form.filterConfig.map((f, i) => (
                      <article className="content-detail-item" key={i}>
                        <span>{getFilterLabel(f.type)}</span>
                        <strong>{f.label || '—'}</strong>
                      </article>
                    ))}
                  </div>
                ) : null}
              </SectionCard>
            </div>
          </div>
        </SectionCard>
      </LoadableState>
    </div>
  )
}

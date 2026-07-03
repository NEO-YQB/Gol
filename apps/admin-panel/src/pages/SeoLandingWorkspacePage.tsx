import { FormatTextarea, Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useRef, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { formatPersianNumber, normalizeSlug, readText, toArray } from '../lib/normalize'
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

export function SeoLandingWorkspacePage({ session, mode, landingId, onBack }: SeoLandingWorkspacePageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  useNoticeEffect(submitMessage, 'success')
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>(mode)
  const [currentLandingId, setCurrentLandingId] = useState<number | null>(landingId)
  const [landingDetail, setLandingDetail] = useState<Record<string, unknown> | null>(null)
  const [categories, setCategories] = useState<Record<string, unknown>[]>([])
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
        const [categoriesPayload, landingPayload] = await Promise.all([
          adminApi.getCategories(session),
          currentLandingId ? adminApi.getSeoLanding(session, currentLandingId) : Promise.resolve(null),
        ])

        if (!active) return
        setCategories(toArray(categoriesPayload))

        if (currentLandingId && landingPayload) {
          setLandingDetail(landingPayload as Record<string, unknown>)
          setForm(mapLandingToForm(landingPayload as Record<string, unknown>))
        } else {
          setLandingDetail(null)
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

  const selectedCategory = categories.find((c) => String(c.id) === form.categoryId)

  function update<Key extends keyof LandingFormState>(key: Key, value: LandingFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function addFilterEntry() {
    setForm((current) => ({
      ...current,
      filterConfig: [...current.filterConfig, { type: '', valueId: 0, label: '' }],
    }))
  }

  function updateFilterEntry(index: number, field: keyof FilterEntry, value: string | number) {
    setForm((current) => ({
      ...current,
      filterConfig: current.filterConfig.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry,
      ),
    }))
  }

  function removeFilterEntry(index: number) {
    setForm((current) => ({
      ...current,
      filterConfig: current.filterConfig.filter((_, i) => i !== index),
    }))
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

      setLandingDetail(record)
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

  const categoryPath = selectedCategory ? `/categories/${readText(selectedCategory, ['slug'], '')}` : '/categories/...'

  return (
    <div className="fm-stack">
      <LoadableState error={error} loading={loading}>
        <SectionCard
          eyebrow="میزکار لندینگ سئو"
          title={editorMode === 'edit' ? `ویرایش لندینگ #${currentLandingId ?? '—'}` : 'ساخت لندینگ سئو جدید'}
          description="ترکیب دسته‌بندی و فیلترها را تعریف کن و متادیتای سئوی صفحه را تنظیم کن."
          hint="از بالا به پایین حرکت کن: اول هویت لندینگ، بعد فیلترها و در پایان سئو را تکمیل کن."
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
                title="هویت و ترکیب لندینگ"
                description="نام داخلی، اسلاگ، دسته‌بندی و فیلترهای ترکیبی را تعریف کن."
                hint="دسته‌بندی اصلی و فیلترها مشخص می‌کنند این لندینگ روی کدام صفحه آرشیو فعال می‌شود."
                actions={<Pill tone="primary">هسته لندینگ</Pill>}
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
                      {categories.map((item) => {
                        const id = String(item.id)
                        const parent = item.parent as Record<string, unknown> | undefined
                        const parentLabel = parent ? readText(parent, ['name'], '') : ''
                        return (
                          <option key={id} value={id}>
                            {parentLabel ? `${parentLabel} / ` : ''}
                            {readText(item, ['name'], '—')}
                          </option>
                        )
                      })}
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
                        <div className="fm-message">هنوز فیلتری تعریف نشده. فیلترها مشخص می‌کنند این لندینگ روی کدام ترکیب از صفحه آرشیو فعال شود.</div>
                      ) : (
                        <div className="content-filter-list">
                          {form.filterConfig.map((entry, index) => (
                            <div className="content-filter-row" key={index}>
                              <label className="fm-field">
                                <span>نوع فیلتر</span>
                                <input
                                  onChange={(event) => updateFilterEntry(index, 'type', event.target.value)}
                                  placeholder="مثلاً: occasion, productType, element"
                                  value={entry.type}
                                />
                              </label>
                              <label className="fm-field">
                                <span>شناسه مقدار</span>
                                <input
                                  onChange={(event) => updateFilterEntry(index, 'valueId', Number(event.target.value) || 0)}
                                  placeholder="شناسه عددی"
                                  type="number"
                                  value={entry.valueId || ''}
                                />
                              </label>
                              <label className="fm-field">
                                <span>برچسب نمایشی</span>
                                <input
                                  onChange={(event) => updateFilterEntry(index, 'label', event.target.value)}
                                  placeholder="مثلاً: خواستگاری"
                                  value={entry.label}
                                />
                              </label>
                              <button className="content-secondary-action content-filter-remove" onClick={() => removeFilterEntry(index)} type="button">
                                حذف
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="کنترل سئو"
                title="متادیتا و محتوای سئو"
                description="عنوان متا، توضیحات، H1 و محتوای غنی صفحه را تکمیل کن."
                hint="اگر این فیلدها خالی باشند، مقادیر پیش‌فرض دسته‌بندی اصلی استفاده می‌شوند."
                actions={
                  <div className="content-accordion-actions">
                    <Pill tone="danger">سئو محور</Pill>
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
                  <div className="content-collapsed-note">برای تکمیل سئو و محتوای صفحه این بخش را باز کن.</div>
                )}
              </SectionCard>

              <SectionCard
                eyebrow="پیش‌نمایش"
                title="آدرس صفحه و پیش‌نمایش"
                description="مسیر URL لندینگ و پیش‌نمایش ساختار صفحه را بررسی کن."
                hint="این لندینگ در مسیر زیر در استورفرانت قابل دسترسی خواهد بود."
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
              </SectionCard>
            </div>
          </div>
        </SectionCard>
      </LoadableState>
    </div>
  )
}

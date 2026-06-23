import { Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { adminApi, type StorefrontInfoPagesSettingsResponse } from '../lib/api'
import type { AuthSession } from '../lib/session'

type Props = {
  session: AuthSession
  onBack: () => void
}

type PageKey = keyof StorefrontInfoPagesSettingsResponse

const DEFAULT_FORM: StorefrontInfoPagesSettingsResponse = {
  about: {
    enabled: true,
    heroTitle: 'درباره گلینو',
    heroSubtitle: '',
    desktopHeroImageUrl: '',
    mobileHeroImageUrl: '',
    introTitle: '',
    introHtml: '',
    storyTitle: '',
    storyHtml: '',
    valuesTitle: '',
    valuesHtml: '',
  },
  contact: {
    enabled: true,
    heroTitle: 'تماس با گلینو',
    heroSubtitle: '',
    desktopHeroImageUrl: '',
    mobileHeroImageUrl: '',
    phone: '',
    email: '',
    address: '',
    workingHours: '',
    mapEmbedHtml: '',
    contactIntroHtml: '',
  },
  terms: {
    enabled: true,
    heroTitle: 'قوانین و مقررات',
    heroSubtitle: '',
    desktopHeroImageUrl: '',
    mobileHeroImageUrl: '',
    bodyHtml: '',
    updatedAtLabel: '',
  },
}

const pageLabels: Record<PageKey, string> = {
  about: 'درباره ما',
  contact: 'تماس با ما',
  terms: 'قوانین',
}

function setNestedValue(
  current: StorefrontInfoPagesSettingsResponse,
  path: string,
  value: string | boolean,
): StorefrontInfoPagesSettingsResponse {
  const [page, field] = path.split('.') as [PageKey, string]
  return {
    ...current,
    [page]: {
      ...current[page],
      [field]: value,
    },
  } as StorefrontInfoPagesSettingsResponse
}

function RichTextEditor({
  label,
  value,
  onChange,
  helper,
  rows = 9,
}: {
  label: string
  value: string
  onChange: (nextValue: string) => void
  helper?: string
  rows?: number
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [preview, setPreview] = useState(false)

  function wrap(before: string, after = before) {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = value.slice(start, end) || 'متن'
    const nextValue = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`
    onChange(nextValue)
    window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  function insertBlock(block: string) {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const nextValue = `${value.slice(0, start)}${block}${value.slice(start)}`
    onChange(nextValue)
    window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + block.length, start + block.length)
    })
  }

  return (
    <div className="site-settings-editor">
      <div className="site-settings-editor__header">
        <div>
          <strong>{label}</strong>
          {helper ? <span>{helper}</span> : null}
        </div>
        <button className="content-secondary-action" onClick={() => setPreview((current) => !current)} type="button">
          {preview ? 'ویرایش' : 'پیش‌نمایش'}
        </button>
      </div>
      <div className="site-settings-editor__toolbar">
        <button onClick={() => wrap('<h2>', '</h2>')} type="button">H2</button>
        <button onClick={() => wrap('<h3>', '</h3>')} type="button">H3</button>
        <button onClick={() => wrap('<strong>', '</strong>')} type="button">B</button>
        <button onClick={() => wrap('<em>', '</em>')} type="button">I</button>
        <button onClick={() => wrap('<blockquote>', '</blockquote>')} type="button">Quote</button>
        <button onClick={() => insertBlock('<ul><li>مورد اول</li><li>مورد دوم</li></ul>')} type="button">List</button>
        <button onClick={() => wrap('<a href="https://" title="">', '</a>')} type="button">Link</button>
        <button onClick={() => insertBlock('<hr />')} type="button">Line</button>
      </div>
      {preview ? (
        <div className="site-settings-editor__preview" dangerouslySetInnerHTML={{ __html: value || '<p>هنوز متنی وارد نشده است.</p>' }} />
      ) : (
        <textarea
          ref={textareaRef}
          dir="rtl"
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          spellCheck={false}
          value={value}
        />
      )}
    </div>
  )
}

export function StorefrontInfoPagesWorkspacePage({ session, onBack }: Props) {
  const [form, setForm] = useState<StorefrontInfoPagesSettingsResponse>(DEFAULT_FORM)
  const [activePage, setActivePage] = useState<PageKey>('about')
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    adminApi.getStorefrontInfoPagesSettings(session)
      .then((payload) => setForm(payload))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'دریافت تنظیمات صفحات سایت ناموفق بود'))
      .finally(() => setLoading(false))
  }, [session])

  function updateField(path: string, value: string | boolean) {
    setForm((current) => setNestedValue(current, path, value))
  }

  function openImagePicker(path: string) {
    setUploadingTarget(path)
    fileInputRef.current?.click()
  }

  async function handleImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    const target = uploadingTarget
    event.target.value = ''
    if (!file || !target) return

    try {
      setError('')
      const uploaded = await adminApi.uploadSiteImage(session, file)
      updateField(target, uploaded.url)
      setMessage('تصویر آپلود شد')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'آپلود تصویر ناموفق بود')
    } finally {
      setUploadingTarget(null)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      setMessage('')
      setError('')
      const payload = await adminApi.updateStorefrontInfoPagesSettings(session, form)
      setForm(payload)
      setMessage('تنظیمات صفحات سایت ذخیره شد')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ذخیره تنظیمات صفحات سایت ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  const active = form[activePage]

  return (
    <div className="space-y-6">
      <input accept="image/png,image/jpeg,image/jpg,image/webp" hidden onChange={handleImageSelected} ref={fileInputRef} type="file" />
      <SectionCard
        eyebrow="site pages"
        title="تنظیمات صفحات اطلاعاتی سایت"
        description="متن، تصویر هدر و اطلاعات تماس صفحه‌های درباره ما، تماس با ما و قوانین را از این workspace مدیریت کن."
        actions={<button className="fm-button fm-button--secondary" onClick={onBack} type="button">بازگشت</button>}
      >
        <div className="flex flex-wrap gap-2">
          {(Object.keys(pageLabels) as PageKey[]).map((key) => (
            <button className={`site-settings-tab ${activePage === key ? 'site-settings-tab--active' : ''}`} key={key} onClick={() => setActivePage(key)} type="button">
              {pageLabels[key]}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill>{active.enabled ? 'نمایش فعال' : 'نمایش غیرفعال'}</Pill>
          <Pill>دسکتاپ 1920x720</Pill>
          <Pill>موبایل 900x1200</Pill>
        </div>
      </SectionCard>

      <SectionCard eyebrow="content" title={`محتوای ${pageLabels[activePage]}`} description="هر فیلد خالی بماند، خودش و عنوان همان بخش در storefront نمایش داده نمی‌شود.">
        {loading ? <p>در حال بارگذاری تنظیمات...</p> : null}
        <div className="fm-grid page-builder-form-grid">
          <label className="fm-field page-builder-checkbox">
            <input checked={active.enabled} onChange={(event) => updateField(`${activePage}.enabled`, event.target.checked)} type="checkbox" />
            <span>نمایش این صفحه فعال باشد</span>
          </label>
          <label className="fm-field">
            <span>عنوان هدر</span>
            <input onChange={(event) => updateField(`${activePage}.heroTitle`, event.target.value)} value={active.heroTitle} />
          </label>
          <label className="fm-field">
            <span>زیرعنوان هدر</span>
            <input onChange={(event) => updateField(`${activePage}.heroSubtitle`, event.target.value)} value={active.heroSubtitle} />
          </label>
          <ImageUploadField
            label="تصویر دسکتاپ هدر"
            path={`${activePage}.desktopHeroImageUrl`}
            uploadingTarget={uploadingTarget}
            value={active.desktopHeroImageUrl}
            onOpen={openImagePicker}
          />
          <ImageUploadField
            label="تصویر موبایل هدر"
            path={`${activePage}.mobileHeroImageUrl`}
            uploadingTarget={uploadingTarget}
            value={active.mobileHeroImageUrl}
            onOpen={openImagePicker}
          />
        </div>

        {activePage === 'about' ? (
          <div className="site-settings-stack">
            <label className="fm-field">
              <span>عنوان بخش معرفی</span>
              <input onChange={(event) => updateField('about.introTitle', event.target.value)} value={form.about.introTitle} />
            </label>
            <RichTextEditor helper="برای بخش اول درباره ما" label="متن معرفی" onChange={(value) => updateField('about.introHtml', value)} value={form.about.introHtml} />
            <label className="fm-field">
              <span>عنوان بخش داستان</span>
              <input onChange={(event) => updateField('about.storyTitle', event.target.value)} value={form.about.storyTitle} />
            </label>
            <RichTextEditor helper="برای روایت برند، سابقه یا مدل کار" label="متن داستان" onChange={(value) => updateField('about.storyHtml', value)} value={form.about.storyHtml} />
            <label className="fm-field">
              <span>عنوان بخش ارزش‌ها</span>
              <input onChange={(event) => updateField('about.valuesTitle', event.target.value)} value={form.about.valuesTitle} />
            </label>
            <RichTextEditor helper="برای تعهدها، مزیت‌ها و ارزش‌های برند" label="متن ارزش‌ها" onChange={(value) => updateField('about.valuesHtml', value)} value={form.about.valuesHtml} />
          </div>
        ) : null}

        {activePage === 'contact' ? (
          <div className="site-settings-stack">
            <div className="fm-grid page-builder-form-grid">
              <label className="fm-field"><span>تلفن</span><input onChange={(event) => updateField('contact.phone', event.target.value)} value={form.contact.phone} /></label>
              <label className="fm-field"><span>ایمیل</span><input onChange={(event) => updateField('contact.email', event.target.value)} value={form.contact.email} /></label>
              <label className="fm-field"><span>ساعت کاری</span><input onChange={(event) => updateField('contact.workingHours', event.target.value)} value={form.contact.workingHours} /></label>
              <label className="fm-field page-builder-field--wide"><span>آدرس</span><input onChange={(event) => updateField('contact.address', event.target.value)} value={form.contact.address} /></label>
            </div>
            <RichTextEditor helper="متن بالای کارت‌های تماس" label="متن معرفی تماس" onChange={(value) => updateField('contact.contactIntroHtml', value)} value={form.contact.contactIntroHtml} />
            <RichTextEditor helper="کد iframe نقشه. فقط iframe امن نمایش داده می‌شود." label="iframe نقشه" onChange={(value) => updateField('contact.mapEmbedHtml', value)} rows={5} value={form.contact.mapEmbedHtml} />
          </div>
        ) : null}

        {activePage === 'terms' ? (
          <div className="site-settings-stack">
            <label className="fm-field">
              <span>برچسب آخرین به‌روزرسانی</span>
              <input onChange={(event) => updateField('terms.updatedAtLabel', event.target.value)} placeholder="مثلاً: آخرین به‌روزرسانی: خرداد ۱۴۰۵" value={form.terms.updatedAtLabel} />
            </label>
            <RichTextEditor helper="متن کامل قوانین و مقررات" label="متن قوانین" onChange={(value) => updateField('terms.bodyHtml', value)} rows={14} value={form.terms.bodyHtml} />
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="fm-button" disabled={saving} onClick={handleSave} type="button">
            {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات صفحات'}
          </button>
        </div>
        {message ? <p className="mt-4 rounded-2xl bg-[#edf8f2] px-4 py-3 text-sm font-medium text-[#1f6a52]">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl bg-[#fff1ee] px-4 py-3 text-sm font-medium text-[#b64b36]">{error}</p> : null}
      </SectionCard>
    </div>
  )
}

function ImageUploadField({
  label,
  path,
  value,
  uploadingTarget,
  onOpen,
}: {
  label: string
  path: string
  value: string
  uploadingTarget: string | null
  onOpen: (path: string) => void
}) {
  return (
    <div className="admin-products-upload-card">
      <div className="admin-products-upload-actions">
        <button className="content-secondary-action" disabled={uploadingTarget === path} onClick={() => onOpen(path)} type="button">
          {uploadingTarget === path ? 'در حال آپلود...' : label}
        </button>
        <span className="admin-products-upload-hint">دسکتاپ 1920x720 و موبایل 900x1200 پیکسل آپلود شود.</span>
      </div>
      {value ? <img alt={label} className="site-settings-image-preview" src={value} /> : null}
    </div>
  )
}

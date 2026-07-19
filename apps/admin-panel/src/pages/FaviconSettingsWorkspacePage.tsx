import { Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useRef, useState } from 'react'
import { adminApi } from '../lib/api'
import type { AuthSession } from '../lib/session'

type Props = {
  session: AuthSession
  onBack: () => void
}

type FaviconFormState = {
  storefront: { faviconIco: string; faviconPng: string; appleTouchIcon: string }
  adminPanel: { faviconIco: string; faviconPng: string }
  vendorPanel: { faviconIco: string; faviconPng: string }
}

const EMPTY_FORM: FaviconFormState = {
  storefront: { faviconIco: '', faviconPng: '', appleTouchIcon: '' },
  adminPanel: { faviconIco: '', faviconPng: '' },
  vendorPanel: { faviconIco: '', faviconPng: '' },
}

function FaviconPreview({ url, label }: { url: string; label: string }) {
  if (!url) return <span className="text-xs text-[#8a7e72]">تعریف نشده</span>
  return (
    <span className="flex items-center gap-2 text-xs">
      <img alt={label} className="h-5 w-5 rounded" src={url} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      <span className="truncate max-w-[180px] text-[#5f6f66]" dir="ltr">{url}</span>
    </span>
  )
}

function UploadButton({ session, accept, label, onUploaded, disabled }: {
  session: AuthSession
  accept: string
  label: string
  onUploaded: (url: string) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      const result = await adminApi.uploadFavicon(session, file)
      onUploaded(result.url)
    } catch {
      // error handled by parent
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input ref={inputRef} accept={accept} className="hidden" onChange={handleChange} type="file" />
      <button
        className="fm-button fm-button--secondary text-xs"
        disabled={uploading || disabled}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        {uploading ? 'در حال آپلود...' : label}
      </button>
    </>
  )
}

function FaviconField({ session, url, label, accept, onUrlChange }: {
  session: AuthSession
  url: string
  label: string
  accept: string
  onUrlChange: (url: string) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e7dccb] bg-white/80 px-4 py-3">
      <div className="min-w-0 flex-1">
        <span className="mb-1 block text-xs font-medium text-[#5f6f66]">{label}</span>
        {url ? <FaviconPreview label={label} url={url} /> : <span className="text-xs text-[#8a7e72]">فایلی بارگذاری نشده</span>}
      </div>
      <div className="flex shrink-0 gap-2">
        <UploadButton accept={accept} label={url ? 'جایگزینی' : 'بارگذاری'} onUploaded={onUrlChange} session={session} />
        {url && <button className="fm-button fm-button--secondary text-xs text-[#b44949]" onClick={() => onUrlChange('')} type="button">حذف</button>}
      </div>
    </div>
  )
}

export function FaviconSettingsWorkspacePage({ session, onBack }: Props) {
  const [form, setForm] = useState<FaviconFormState>(EMPTY_FORM)
  const [savedSnapshot, setSavedSnapshot] = useState<FaviconFormState | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminApi.getFaviconSettings(session)
      .then((payload) => {
        const nextState: FaviconFormState = {
          storefront: {
            faviconIco: String(payload.storefront?.faviconIco ?? ''),
            faviconPng: String(payload.storefront?.faviconPng ?? ''),
            appleTouchIcon: String(payload.storefront?.appleTouchIcon ?? ''),
          },
          adminPanel: {
            faviconIco: String(payload.adminPanel?.faviconIco ?? ''),
            faviconPng: String(payload.adminPanel?.faviconPng ?? ''),
          },
          vendorPanel: {
            faviconIco: String(payload.vendorPanel?.faviconIco ?? ''),
            faviconPng: String(payload.vendorPanel?.faviconPng ?? ''),
          },
        }
        setForm(nextState)
        setSavedSnapshot(nextState)
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'دریافت تنظیمات با خطا مواجه شد'))
      .finally(() => setLoading(false))
  }, [session])

  async function handleSave() {
    try {
      setSaving(true)
      setError('')
      setMessage('')
      await adminApi.updateFaviconSettings(session, form)
      const payload = await adminApi.getFaviconSettings(session)
      const nextState: FaviconFormState = {
        storefront: {
          faviconIco: String(payload.storefront?.faviconIco ?? ''),
          faviconPng: String(payload.storefront?.faviconPng ?? ''),
          appleTouchIcon: String(payload.storefront?.appleTouchIcon ?? ''),
        },
        adminPanel: {
          faviconIco: String(payload.adminPanel?.faviconIco ?? ''),
          faviconPng: String(payload.adminPanel?.faviconPng ?? ''),
        },
        vendorPanel: {
          faviconIco: String(payload.vendorPanel?.faviconIco ?? ''),
          faviconPng: String(payload.vendorPanel?.faviconPng ?? ''),
        },
      }
      setForm(nextState)
      setSavedSnapshot(nextState)
      setMessage('تنظیمات فاوایکون ذخیره شد')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ذخیره تنظیمات با خطا مواجه شد')
    } finally {
      setSaving(false)
    }
  }

  function updateField(section: 'storefront' | 'adminPanel' | 'vendorPanel', field: string, value: string) {
    setForm((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
    }))
  }

  const hasChanges = JSON.stringify(form) !== JSON.stringify(savedSnapshot)

  return (
    <div className="space-y-6">
      <SectionCard
        eyebrow="workspace"
        title="میزکار تنظیمات فاوایکون"
        description="فاوایکون استورفرونت، پنل ادمین و پنل فروشنده را اینجا مدیریت کن."
        actions={<button className="fm-button fm-button--secondary" onClick={onBack} type="button">بازگشت</button>}
      >
        <div className="flex flex-wrap gap-2">
          <Pill>{savedSnapshot?.storefront.faviconIco || savedSnapshot?.storefront.faviconPng ? 'استورفرونت: ثبت شده' : 'استورفرونت: ثبت نشده'}</Pill>
          <Pill>{savedSnapshot?.adminPanel.faviconIco || savedSnapshot?.adminPanel.faviconPng ? 'ادمین: ثبت شده' : 'ادمین: ثبت نشده'}</Pill>
          <Pill>{savedSnapshot?.vendorPanel.faviconIco || savedSnapshot?.vendorPanel.faviconPng ? 'فروشنده: ثبت شده' : 'فروشنده: ثبت نشده'}</Pill>
        </div>
      </SectionCard>

      {loading ? <p>در حال بارگذاری تنظیمات...</p> : null}

      {/* Storefront */}
      <SectionCard eyebrow="storefront" title="استورفرونت" description="فاوایکون صفحه اصلی فروشگاه و صفحات عمومی">
        <div className="space-y-3">
          <FaviconField accept=".ico" label="favicon (.ico)" onUrlChange={(url) => updateField('storefront', 'faviconIco', url)} session={session} url={form.storefront.faviconIco} />
          <FaviconField accept=".png" label="favicon (.png)" onUrlChange={(url) => updateField('storefront', 'faviconPng', url)} session={session} url={form.storefront.faviconPng} />
          <FaviconField accept=".png" label="Apple Touch Icon (.png)" onUrlChange={(url) => updateField('storefront', 'appleTouchIcon', url)} session={session} url={form.storefront.appleTouchIcon} />
        </div>
      </SectionCard>

      {/* Admin Panel */}
      <SectionCard eyebrow="admin panel" title="پنل ادمین" description="فاوایکون پنل مدیریت">
        <div className="space-y-3">
          <FaviconField accept=".ico" label="favicon (.ico)" onUrlChange={(url) => updateField('adminPanel', 'faviconIco', url)} session={session} url={form.adminPanel.faviconIco} />
          <FaviconField accept=".png" label="favicon (.png)" onUrlChange={(url) => updateField('adminPanel', 'faviconPng', url)} session={session} url={form.adminPanel.faviconPng} />
        </div>
      </SectionCard>

      {/* Vendor Panel */}
      <SectionCard eyebrow="vendor panel" title="پنل فروشنده" description="فاوایکون پنل فروشنده">
        <div className="space-y-3">
          <FaviconField accept=".ico" label="favicon (.ico)" onUrlChange={(url) => updateField('vendorPanel', 'faviconIco', url)} session={session} url={form.vendorPanel.faviconIco} />
          <FaviconField accept=".png" label="favicon (.png)" onUrlChange={(url) => updateField('vendorPanel', 'faviconPng', url)} session={session} url={form.vendorPanel.faviconPng} />
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-3">
        <button className="fm-button" disabled={saving || !hasChanges} onClick={handleSave} type="button">
          {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </button>
        {hasChanges && <Pill tone="warning">تغییر ذخیره نشده</Pill>}
      </div>

      {message ? <p className="rounded-2xl bg-[#edf8f2] px-4 py-3 text-sm font-medium text-[#1f6a52]">{message}</p> : null}
      {error ? <p className="rounded-2xl bg-[#fff1ee] px-4 py-3 text-sm font-medium text-[#b64b36]">{error}</p> : null}
    </div>
  )
}

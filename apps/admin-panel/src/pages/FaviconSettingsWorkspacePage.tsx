import { Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
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
        <div className="fm-grid">
          <label className="fm-field">
            <span>آدرس favicon (.ico)</span>
            <input dir="ltr" onChange={(e) => updateField('storefront', 'faviconIco', e.target.value)} placeholder="/favicon.ico" type="text" value={form.storefront.faviconIco} />
          </label>
          <label className="fm-field">
            <span>آدرس favicon (.png)</span>
            <input dir="ltr" onChange={(e) => updateField('storefront', 'faviconPng', e.target.value)} placeholder="/favicon.png" type="text" value={form.storefront.faviconPng} />
          </label>
          <label className="fm-field">
            <span>آدرس Apple Touch Icon</span>
            <input dir="ltr" onChange={(e) => updateField('storefront', 'appleTouchIcon', e.target.value)} placeholder="/apple-touch-icon.png" type="text" value={form.storefront.appleTouchIcon || ''} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <div className="flex items-center gap-2"><span className="text-xs text-[#8a7e72]">ico:</span><FaviconPreview label="ico" url={form.storefront.faviconIco} /></div>
          <div className="flex items-center gap-2"><span className="text-xs text-[#8a7e72]">png:</span><FaviconPreview label="png" url={form.storefront.faviconPng} /></div>
          <div className="flex items-center gap-2"><span className="text-xs text-[#8a7e72]">apple:</span><FaviconPreview label="apple" url={form.storefront.appleTouchIcon || ''} /></div>
        </div>
      </SectionCard>

      {/* Admin Panel */}
      <SectionCard eyebrow="admin panel" title="پنل ادمین" description="فاوایکون پنل مدیریت">
        <div className="fm-grid">
          <label className="fm-field">
            <span>آدرس favicon (.ico)</span>
            <input dir="ltr" onChange={(e) => updateField('adminPanel', 'faviconIco', e.target.value)} placeholder="/favicon.ico" type="text" value={form.adminPanel.faviconIco} />
          </label>
          <label className="fm-field">
            <span>آدرس favicon (.png)</span>
            <input dir="ltr" onChange={(e) => updateField('adminPanel', 'faviconPng', e.target.value)} placeholder="/favicon.png" type="text" value={form.adminPanel.faviconPng} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <div className="flex items-center gap-2"><span className="text-xs text-[#8a7e72]">ico:</span><FaviconPreview label="ico" url={form.adminPanel.faviconIco} /></div>
          <div className="flex items-center gap-2"><span className="text-xs text-[#8a7e72]">png:</span><FaviconPreview label="png" url={form.adminPanel.faviconPng} /></div>
        </div>
      </SectionCard>

      {/* Vendor Panel */}
      <SectionCard eyebrow="vendor panel" title="پنل فروشنده" description="فاوایکون پنل فروشنده">
        <div className="fm-grid">
          <label className="fm-field">
            <span>آدرس favicon (.ico)</span>
            <input dir="ltr" onChange={(e) => updateField('vendorPanel', 'faviconIco', e.target.value)} placeholder="/favicon.ico" type="text" value={form.vendorPanel.faviconIco} />
          </label>
          <label className="fm-field">
            <span>آدرس favicon (.png)</span>
            <input dir="ltr" onChange={(e) => updateField('vendorPanel', 'faviconPng', e.target.value)} placeholder="/favicon.png" type="text" value={form.vendorPanel.faviconPng} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <div className="flex items-center gap-2"><span className="text-xs text-[#8a7e72]">ico:</span><FaviconPreview label="ico" url={form.vendorPanel.faviconIco} /></div>
          <div className="flex items-center gap-2"><span className="text-xs text-[#8a7e72]">png:</span><FaviconPreview label="png" url={form.vendorPanel.faviconPng} /></div>
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

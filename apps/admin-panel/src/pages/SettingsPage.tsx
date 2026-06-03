import { Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'
import type { AuthSession } from '../lib/session'

type SettingsPageProps = {
  session: AuthSession
}

type SmsSettingsState = {
  apiKey: string
  templateId: string
  lineNumber: string
  hasApiKey?: boolean
}

function maskSecret(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return 'خالی'
  if (trimmed.length <= 6) return '••••••'
  return `${trimmed.slice(0, 3)}••••••${trimmed.slice(-3)}`
}

function displayCell(value: string) {
  return value.trim().length > 0 ? value : '—'
}

export function SettingsPage({ session }: SettingsPageProps) {
  const [form, setForm] = useState<SmsSettingsState>({ apiKey: '', templateId: '', lineNumber: '' })
  const [savedSnapshot, setSavedSnapshot] = useState<SmsSettingsState | null>(null)
  const [testPhoneNumber, setTestPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    adminApi.getSmsSettings(session)
      .then((payload) => {
        const nextState = {
          apiKey: String(payload.apiKey ?? ''),
          templateId: String(payload.templateId ?? ''),
          lineNumber: String(payload.lineNumber ?? ''),
          hasApiKey: Boolean(payload.hasApiKey),
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
      await adminApi.updateSmsSettings(session, form)
      const payload = await adminApi.getSmsSettings(session)
      const nextState = {
        apiKey: String(payload.apiKey ?? ''),
        templateId: String(payload.templateId ?? ''),
        lineNumber: String(payload.lineNumber ?? ''),
        hasApiKey: Boolean(payload.hasApiKey),
      }
      setForm(nextState)
      setSavedSnapshot(nextState)
      setMessage('تنظیمات پیامک ذخیره شد و دوباره از سرور خوانده شد')
    } catch (requestError) {
      setError(requestError instanceof Error ? `ذخیره تنظیمات با خطا مواجه شد: ${requestError.message}` : 'ذخیره تنظیمات با خطا مواجه شد')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    try {
      setTesting(true)
      setError('')
      setMessage('')
      await adminApi.testSmsSettings(session, testPhoneNumber)
      setMessage('پیامک تستی با موفقیت ارسال شد')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ارسال پیامک تستی با خطا مواجه شد')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard eyebrow="integrations" title="تنظیمات پیامک و OTP" description="پیکربندی سرویس SMS.IR برای ورود و ثبت نام کاربران storefront از اینجا انجام می‌شود.">
        <div className="flex flex-wrap gap-2">
          <Pill>{form.hasApiKey ? 'API Key ثبت شده' : 'API Key ثبت نشده'}</Pill>
          <Pill>{savedSnapshot?.templateId ? `Template: ${savedSnapshot.templateId}` : 'Template ثبت نشده'}</Pill>
          <Pill>{savedSnapshot?.lineNumber ? 'خط ارسال ثبت شده' : 'خط ارسال ثبت نشده'}</Pill>
        </div>
      </SectionCard>

      <SectionCard eyebrow="sms.ir" title="پیکربندی SMS.IR" description="کلید API، شناسه template و شماره اختصاصی ارسال را اینجا وارد و ذخیره کن.">
        {loading ? <p>در حال بارگذاری تنظیمات...</p> : null}
        <div className="fm-grid">
          <label className="fm-field">
            <span>API Key</span>
            <input onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))} type="text" value={form.apiKey} />
          </label>
          <label className="fm-field">
            <span>Template ID</span>
            <input onChange={(event) => setForm((current) => ({ ...current, templateId: event.target.value }))} type="text" value={form.templateId} />
          </label>
          <label className="fm-field">
            <span>شماره اختصاصی / Line Number</span>
            <input onChange={(event) => setForm((current) => ({ ...current, lineNumber: event.target.value }))} type="text" value={form.lineNumber} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="fm-button" disabled={saving} onClick={handleSave} type="button">
            {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
          </button>
        </div>
        <div className="mt-5 overflow-hidden rounded-[24px] border border-[#e7dccb] bg-white/80 shadow-[0_10px_26px_rgba(52,36,17,0.05)]">
          <div className="border-b border-[#efe3d3] px-4 py-3">
            <strong className="block text-sm">مقادیر ذخیره‌شده فعلی</strong>
            <p className="mt-1 text-xs text-[#7b6b58]">این مقادیر بعد از ذخیره، دوباره از سرور خوانده می‌شوند.</p>
          </div>
          <div className="grid text-sm">
            <div className="grid grid-cols-[160px_minmax(0,1fr)] border-b border-[#f3eadf] px-4 py-3">
              <span className="font-bold text-[#6f604e]">API Key</span>
              <span className="text-left font-medium" dir="ltr">{maskSecret(savedSnapshot?.apiKey || '')}</span>
            </div>
            <div className="grid grid-cols-[160px_minmax(0,1fr)] border-b border-[#f3eadf] px-4 py-3">
              <span className="font-bold text-[#6f604e]">Template ID</span>
              <span dir="ltr">{displayCell(savedSnapshot?.templateId || '')}</span>
            </div>
            <div className="grid grid-cols-[160px_minmax(0,1fr)] px-4 py-3">
              <span className="font-bold text-[#6f604e]">Line Number</span>
              <span dir="ltr">{displayCell(savedSnapshot?.lineNumber || '')}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="test delivery" title="تست ارسال پیامک" description="برای اطمینان از صحت تنظیمات، یک OTP واقعی به شماره دلخواه ارسال کن.">
        <div className="fm-grid">
          <label className="fm-field">
            <span>شماره تست</span>
            <input onChange={(event) => setTestPhoneNumber(event.target.value)} placeholder="مثلاً 09121234567" type="text" value={testPhoneNumber} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="fm-button fm-button--secondary" disabled={testing || testPhoneNumber.trim().length < 10} onClick={handleTest} type="button">
            {testing ? 'در حال ارسال...' : 'ارسال پیامک تستی'}
          </button>
        </div>
        {message ? <p className="mt-4 rounded-2xl bg-[#edf8f2] px-4 py-3 text-sm font-medium text-[#1f6a52]">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl bg-[#fff1ee] px-4 py-3 text-sm font-medium text-[#b64b36]">{error}</p> : null}
      </SectionCard>
    </div>
  )
}

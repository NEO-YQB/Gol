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
      setMessage('تنظیمات پیامک ذخیره شد')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ذخیره تنظیمات با خطا مواجه شد')
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
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm">
          <strong className="block">مقادیر ذخیره‌شده فعلی</strong>
          <div className="mt-3 grid gap-2">
            <span>{`API Key: ${savedSnapshot?.apiKey ? 'ثبت شده' : 'خالی'}`}</span>
            <span>{`Template ID: ${savedSnapshot?.templateId || 'خالی'}`}</span>
            <span>{`Line Number: ${savedSnapshot?.lineNumber || 'خالی'}`}</span>
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
        {message ? <p className="mt-4">{message}</p> : null}
        {error ? <p className="mt-4">{error}</p> : null}
      </SectionCard>
    </div>
  )
}

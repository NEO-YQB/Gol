import { Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
import { adminApi } from '../lib/api'
import type { AuthSession } from '../lib/session'

type Props = {
  session: AuthSession
  onBack: () => void
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

export function SmsSettingsWorkspacePage({ session, onBack }: Props) {
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
      await adminApi.updateSmsSettings(session, {
        apiKey: form.apiKey,
        templateId: form.templateId,
        lineNumber: form.lineNumber,
      })
      const payload = await adminApi.getSmsSettings(session)
      const nextState = {
        apiKey: String(payload.apiKey ?? ''),
        templateId: String(payload.templateId ?? ''),
        lineNumber: String(payload.lineNumber ?? ''),
        hasApiKey: Boolean(payload.hasApiKey),
      }
      setForm(nextState)
      setSavedSnapshot(nextState)
      setMessage('تنظیمات پیامکی ذخیره شد')
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
      <SectionCard eyebrow="workspace" title="میزکار تنظیمات پیامکی" description="کلید API، template و تست OTP را اینجا مدیریت کن." actions={<button className="fm-button fm-button--secondary" onClick={onBack} type="button">بازگشت</button>}>
        <div className="flex flex-wrap gap-2">
          <Pill>{form.hasApiKey ? 'API Key ثبت شده' : 'API Key ثبت نشده'}</Pill>
          <Pill>{savedSnapshot?.templateId ? `Template: ${savedSnapshot.templateId}` : 'Template ثبت نشده'}</Pill>
          <Pill>{savedSnapshot?.lineNumber ? 'خط ارسال ثبت شده' : 'خط ارسال ثبت نشده'}</Pill>
        </div>
      </SectionCard>
      <SectionCard eyebrow="sms.ir" title="پیکربندی SMS.IR" description="مقادیر سرویس پیامک را اینجا وارد و ذخیره کن.">
        {loading ? <p>در حال بارگذاری تنظیمات...</p> : null}
        <div className="fm-grid">
          <label className="fm-field"><span>API Key</span><input onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))} type="text" value={form.apiKey} /></label>
          <label className="fm-field"><span>Template ID</span><input onChange={(event) => setForm((current) => ({ ...current, templateId: event.target.value }))} type="text" value={form.templateId} /></label>
          <label className="fm-field"><span>Line Number</span><input onChange={(event) => setForm((current) => ({ ...current, lineNumber: event.target.value }))} type="text" value={form.lineNumber} /></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="fm-button" disabled={saving} onClick={handleSave} type="button">{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</button>
        </div>
        <div className="mt-5 rounded-[24px] border border-[#e7dccb] bg-white/80 px-4 py-4 text-sm">
          <strong className="block">API Key</strong>
          <span dir="ltr">{maskSecret(savedSnapshot?.apiKey || '')}</span>
        </div>
      </SectionCard>
      <SectionCard eyebrow="test" title="تست ارسال پیامک" description="برای بررسی صحت تنظیمات، OTP تستی بفرست.">
        <div className="fm-grid">
          <label className="fm-field"><span>شماره تست</span><input onChange={(event) => setTestPhoneNumber(event.target.value)} placeholder="09121234567" type="text" value={testPhoneNumber} /></label>
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

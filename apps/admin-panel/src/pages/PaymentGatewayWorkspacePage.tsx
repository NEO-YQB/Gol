import { SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { adminApi, type PaymentGatewayConfigResponse } from '../lib/api'
import type { AuthSession } from '../lib/session'

type Props = {
  session: AuthSession
  onBack: () => void
}

type GatewayFormState = {
  id?: number
  key: string
  displayName: string
  driver: string
  sandboxMode: boolean
  isActive: boolean
  isDefault: boolean
  priority: string
  merchantId: string
  callbackUrl: string
  returnUrl: string
  notes: string
}

const DEFAULT_FORM: GatewayFormState = {
  key: 'zarinpal-sandbox',
  displayName: 'زرین پال سندباکس',
  driver: 'zarinpal',
  sandboxMode: true,
  isActive: true,
  isDefault: true,
  priority: '1',
  merchantId: '',
  callbackUrl: '',
  returnUrl: '',
  notes: '',
}

export function PaymentGatewayWorkspacePage({ session, onBack }: Props) {
  const [gateways, setGateways] = useState<PaymentGatewayConfigResponse[]>([])
  const [form, setForm] = useState<GatewayFormState>(DEFAULT_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.getPaymentGateways(session)
      .then((payload) => {
        setGateways(payload)
        const existing = payload.find((item) => item.key === 'zarinpal-sandbox') || payload.find((item) => item.driver === 'zarinpal')
        if (existing) {
          setForm({
            id: existing.id,
            key: existing.key,
            displayName: existing.displayName,
            driver: existing.driver,
            sandboxMode: Boolean(existing.sandboxMode),
            isActive: Boolean(existing.isActive),
            isDefault: Boolean(existing.isDefault),
            priority: String(existing.priority ?? 1),
            merchantId: String((existing.merchantConfig as Record<string, unknown> | null)?.merchantId ?? ''),
            callbackUrl: String(existing.callbackUrl ?? ''),
            returnUrl: String(existing.returnUrl ?? ''),
            notes: String(existing.notes ?? ''),
          })
        }
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'دریافت تنظیمات درگاه با خطا مواجه شد'))
      .finally(() => setLoading(false))
  }, [session])

  const activeGatewayLabel = useMemo(() => {
    const active = gateways.find((item) => item.isDefault) || gateways[0]
    return active ? `${active.displayName} (${active.key})` : 'ثبت نشده'
  }, [gateways])

  async function handleSave() {
    try {
      setSaving(true)
      setError('')
      setMessage('')
      const body = {
        key: form.key,
        displayName: form.displayName,
        driver: form.driver,
        sandboxMode: form.sandboxMode,
        isActive: form.isActive,
        isDefault: form.isDefault,
        priority: Number(form.priority || 1),
        merchantConfig: { merchantId: form.merchantId },
        callbackUrl: form.callbackUrl,
        returnUrl: form.returnUrl,
        notes: form.notes,
      }

      if (form.id) await adminApi.updatePaymentGateway(session, form.id, body)
      else await adminApi.createPaymentGateway(session, body)

      const payload = await adminApi.getPaymentGateways(session)
      setGateways(payload)
      setMessage('تنظیمات درگاه پرداخت ذخیره شد')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ذخیره تنظیمات درگاه با خطا مواجه شد')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard eyebrow="workspace" title="میزکار درگاه پرداخت" description="تنظیمات زرین‌پال sandbox را از اینجا مدیریت کن." actions={<button className="fm-button fm-button--secondary" onClick={onBack} type="button">بازگشت</button>}>
        <p className="text-sm text-[#6f604e]">{`درگاه فعال فعلی: ${activeGatewayLabel}`}</p>
      </SectionCard>
      <SectionCard eyebrow="gateway" title="پیکربندی زرین‌پال sandbox" description="همان key مورد نیاز فرانت یعنی zarinpal-sandbox را از اینجا تنظیم کن.">
        {loading ? <p>در حال بارگذاری درگاه‌ها...</p> : null}
        <div className="fm-grid">
          <label className="fm-field"><span>Key</span><input onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))} type="text" value={form.key} /></label>
          <label className="fm-field"><span>نام نمایشی</span><input onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} type="text" value={form.displayName} /></label>
          <label className="fm-field"><span>Driver</span><input onChange={(event) => setForm((current) => ({ ...current, driver: event.target.value }))} type="text" value={form.driver} /></label>
          <label className="fm-field"><span>Merchant ID</span><input onChange={(event) => setForm((current) => ({ ...current, merchantId: event.target.value }))} type="text" value={form.merchantId} /></label>
          <label className="fm-field"><span>Callback URL</span><input onChange={(event) => setForm((current) => ({ ...current, callbackUrl: event.target.value }))} type="text" value={form.callbackUrl} /></label>
          <label className="fm-field"><span>Return URL</span><input onChange={(event) => setForm((current) => ({ ...current, returnUrl: event.target.value }))} type="text" value={form.returnUrl} /></label>
          <label className="fm-field"><span>Priority</span><input onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} type="number" value={form.priority} /></label>
          <label className="fm-field"><span>Notes</span><input onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} type="text" value={form.notes} /></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <label><input checked={form.sandboxMode} onChange={(event) => setForm((current) => ({ ...current, sandboxMode: event.target.checked }))} type="checkbox" /> sandbox mode</label>
          <label><input checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} type="checkbox" /> active</label>
          <label><input checked={form.isDefault} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} type="checkbox" /> default</label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="fm-button" disabled={saving || !form.merchantId.trim() || !form.callbackUrl.trim() || !form.returnUrl.trim()} onClick={handleSave} type="button">
            {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات درگاه'}
          </button>
        </div>
        {message ? <p className="mt-4 rounded-2xl bg-[#edf8f2] px-4 py-3 text-sm font-medium text-[#1f6a52]">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl bg-[#fff1ee] px-4 py-3 text-sm font-medium text-[#b64b36]">{error}</p> : null}
      </SectionCard>
    </div>
  )
}

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
  apiBaseUrl: string
  callbackUrl: string
  returnUrl: string
  notes: string
}

const DEFAULT_FORM: GatewayFormState = {
  key: 'zarinpal-main',
  displayName: 'زرین‌پال',
  driver: 'zarinpal',
  sandboxMode: false,
  isActive: true,
  isDefault: true,
  priority: '1',
  merchantId: '',
  apiBaseUrl: '',
  callbackUrl: '',
  returnUrl: '',
  notes: '',
}

function toGatewayForm(gateway: PaymentGatewayConfigResponse): GatewayFormState {
  return {
    id: gateway.id,
    key: gateway.key,
    displayName: gateway.displayName,
    driver: gateway.driver,
    sandboxMode: gateway.sandboxMode,
    isActive: gateway.isActive,
    isDefault: gateway.isDefault,
    priority: String(gateway.priority),
    merchantId: String(gateway.merchantConfig?.merchantId ?? gateway.merchantConfig?.merchant_id ?? ''),
    apiBaseUrl: String(gateway.technicalConfig?.baseUrl ?? ''),
    callbackUrl: gateway.callbackUrl ?? '',
    returnUrl: gateway.returnUrl ?? '',
    notes: gateway.notes ?? '',
  }
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
        const zarinpalGateways = payload.filter((item) => item.driver === 'zarinpal')
        const existing = zarinpalGateways.find((item) => item.isActive && item.isDefault)
          || zarinpalGateways.find((item) => item.isActive && !item.sandboxMode)
          || zarinpalGateways[0]
        if (existing) {
          setForm(toGatewayForm(existing))
        }
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'دریافت تنظیمات درگاه با خطا مواجه شد'))
      .finally(() => setLoading(false))
  }, [session])

  const activeGatewayLabel = useMemo(() => {
    const active = gateways.find((item) => item.isActive && item.isDefault) || gateways.find((item) => item.isActive)
    return active ? `${active.displayName} (${active.key}) — ${active.sandboxMode ? 'آزمایشی' : 'واقعی'}` : 'ثبت نشده'
  }, [gateways])

  async function handleSave() {
    const apiBaseUrl = form.apiBaseUrl.trim().replace(/\/+$/, '')
    const expectedBaseUrl = form.sandboxMode ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com'
    if (apiBaseUrl && apiBaseUrl !== expectedBaseUrl) {
      setError('آدرس API با حالت واقعی/آزمایشی انتخاب‌شده سازگار نیست؛ برای انتخاب خودکار آن را خالی کنید.')
      return
    }
    try {
      setSaving(true)
      setError('')
      setMessage('')
      const body = {
        key: form.key.trim(),
        displayName: form.displayName.trim(),
        driver: form.driver,
        sandboxMode: form.sandboxMode,
        isActive: form.isActive,
        isDefault: form.isDefault,
        priority: Number(form.priority || 1),
        merchantConfig: { ...gateways.find((item) => item.id === form.id)?.merchantConfig, merchantId: form.merchantId.trim() },
        technicalConfig: { ...gateways.find((item) => item.id === form.id)?.technicalConfig, baseUrl: apiBaseUrl },
        callbackUrl: form.callbackUrl.trim(),
        returnUrl: form.returnUrl.trim(),
        notes: form.notes,
      }

      const saved = form.id
        ? await adminApi.updatePaymentGateway(session, form.id, body)
        : await adminApi.createPaymentGateway(session, body)
      setForm(toGatewayForm(saved))

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
      <SectionCard eyebrow="workspace" title="میزکار درگاه پرداخت" description="درگاه واقعی و آزمایشی زرین‌پال را از اینجا مدیریت کن؛ فروشگاه از درگاه فعال پیش‌فرض استفاده می‌کند." actions={<button className="fm-button fm-button--secondary" onClick={onBack} type="button">بازگشت</button>}>
        <p className="text-sm text-[#6f604e]">{`درگاه فعال فعلی: ${activeGatewayLabel}`}</p>
      </SectionCard>
      <SectionCard eyebrow="gateway" title="پیکربندی زرین‌پال" description="برای مرچنت واقعی، حالت آزمایشی را خاموش و گزینه فعال و پیش‌فرض را روشن کن. کلید درگاه موجود را هنگام داشتن پرداخت در انتظار تغییر نده.">
        {loading ? <p>در حال بارگذاری درگاه‌ها...</p> : null}
        <label className="fm-field">
          <span>انتخاب درگاه برای ویرایش</span>
          <select disabled={loading || saving} value={form.id ?? ''} onChange={(event) => {
            const selected = gateways.find((item) => item.id === Number(event.target.value))
            setForm(selected ? toGatewayForm(selected) : { ...DEFAULT_FORM })
            setError('')
            setMessage('')
          }}>
            <option value="">درگاه جدید</option>
            {gateways.filter((item) => item.driver === 'zarinpal').map((item) => <option key={item.id} value={item.id}>{item.displayName} ({item.key}) — {item.sandboxMode ? 'آزمایشی' : 'واقعی'}</option>)}
          </select>
        </label>
        <div className="fm-grid">
          <label className="fm-field"><span>Key</span><input onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))} type="text" value={form.key} /></label>
          <label className="fm-field"><span>نام نمایشی</span><input onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} type="text" value={form.displayName} /></label>
          <label className="fm-field"><span>Driver</span><input onChange={(event) => setForm((current) => ({ ...current, driver: event.target.value }))} type="text" value={form.driver} /></label>
          <label className="fm-field"><span>Merchant ID</span><input autoComplete="off" onChange={(event) => setForm((current) => ({ ...current, merchantId: event.target.value }))} type="password" value={form.merchantId} /></label>
          <label className="fm-field"><span>آدرس API (اختیاری)</span><input placeholder="خالی: انتخاب خودکار براساس حالت واقعی/آزمایشی" onChange={(event) => setForm((current) => ({ ...current, apiBaseUrl: event.target.value }))} type="url" value={form.apiBaseUrl} /></label>
          <label className="fm-field"><span>Callback URL</span><input onChange={(event) => setForm((current) => ({ ...current, callbackUrl: event.target.value }))} type="text" value={form.callbackUrl} /></label>
          <label className="fm-field"><span>Return URL</span><input onChange={(event) => setForm((current) => ({ ...current, returnUrl: event.target.value }))} type="text" value={form.returnUrl} /></label>
          <label className="fm-field"><span>Priority</span><input onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} type="number" value={form.priority} /></label>
          <label className="fm-field"><span>Notes</span><input onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} type="text" value={form.notes} /></label>
        </div>
        <p className="mt-4 text-sm leading-7">Callback URL باید آدرس کامل backend با مسیر <code dir="ltr">/v1/payments/callback/{form.key || '{key}'}</code> باشد. Return URL آدرس صفحه نتیجه در فروشگاه با مسیر <code dir="ltr">/payment/thank-you</code> است.</p>
        {form.sandboxMode ? <p className="mt-3 text-sm font-bold text-[#b64b36]">حالت آزمایشی روشن است؛ برای استفاده از مرچنت واقعی آن را خاموش کنید.</p> : null}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <label><input checked={form.sandboxMode} onChange={(event) => setForm((current) => ({ ...current, sandboxMode: event.target.checked }))} type="checkbox" /> حالت آزمایشی (بدون پرداخت واقعی)</label>
          <label><input checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} type="checkbox" /> active</label>
          <label><input checked={form.isDefault} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} type="checkbox" /> default</label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="fm-button" disabled={loading || saving || !form.key.trim() || !form.merchantId.trim() || !form.callbackUrl.trim() || !form.returnUrl.trim()} onClick={handleSave} type="button">
            {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات درگاه'}
          </button>
        </div>
        {message ? <p className="mt-4 rounded-2xl bg-[#edf8f2] px-4 py-3 text-sm font-medium text-[#1f6a52]">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl bg-[#fff1ee] px-4 py-3 text-sm font-medium text-[#b64b36]">{error}</p> : null}
      </SectionCard>
    </div>
  )
}

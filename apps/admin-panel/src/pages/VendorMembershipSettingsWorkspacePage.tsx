import { Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
import { adminApi, type VendorMembershipSettingsResponse } from '../lib/api'
import type { AuthSession } from '../lib/session'

const DEFAULT_FORM: VendorMembershipSettingsResponse = {
  isEnabled: false,
  feeAmount: 0,
  freeUntil: null,
  title: 'حق عضویت فروشندگی',
  description: 'پس از تایید مدارک، برای فعال‌سازی پنل فروشنده پرداخت کنید.',
}

type Props = { session: AuthSession; onBack: () => void }

export function VendorMembershipSettingsWorkspacePage({ session, onBack }: Props) {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.getVendorMembershipSettings(session)
      .then(setForm)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'دریافت تنظیمات حق عضویت ناموفق بود'))
      .finally(() => setLoading(false))
  }, [session])

  async function handleSave() {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const saved = await adminApi.updateVendorMembershipSettings(session, form)
      setForm(saved)
      setMessage('تنظیمات حق عضویت ذخیره شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ذخیره تنظیمات حق عضویت ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard
        eyebrow="vendor membership"
        title="حق عضویت فروشندگان"
        description="تعیین کن ورود نهایی فروشنده بعد از تایید مدارک رایگان باشد یا نیاز به پرداخت حق عضویت داشته باشد."
        actions={<button className="fm-button fm-button--secondary" onClick={onBack} type="button">بازگشت</button>}
      >
        {loading ? <p>در حال بارگذاری تنظیمات...</p> : null}
        <div className="mb-5 flex flex-wrap gap-2">
          <Pill tone={form.isEnabled ? 'warning' : 'success'}>{form.isEnabled ? 'پرداخت فعال' : 'عضویت رایگان'}</Pill>
          {form.freeUntil ? <Pill>{`رایگان تا ${new Intl.DateTimeFormat('fa-IR').format(new Date(form.freeUntil))}`}</Pill> : null}
        </div>
        <div className="fm-grid page-builder-form-grid">
          <label className="fm-field page-builder-checkbox">
            <input checked={form.isEnabled} onChange={(event) => setForm((current) => ({ ...current, isEnabled: event.target.checked }))} type="checkbox" />
            <span>دریافت حق عضویت فعال باشد</span>
          </label>
          <label className="fm-field">
            <span>مبلغ حق عضویت (تومان)</span>
            <input min="0" onChange={(event) => setForm((current) => ({ ...current, feeAmount: Number(event.target.value) }))} type="number" value={form.feeAmount} />
          </label>
          <label className="fm-field">
            <span>رایگان تا تاریخ و ساعت</span>
            <input onChange={(event) => setForm((current) => ({ ...current, freeUntil: event.target.value ? new Date(event.target.value).toISOString() : null }))} type="datetime-local" value={form.freeUntil ? new Date(form.freeUntil).toISOString().slice(0, 16) : ''} />
          </label>
          <label className="fm-field">
            <span>عنوان</span>
            <input onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} value={form.title} />
          </label>
          <label className="fm-field page-builder-field--wide">
            <span>توضیح برای فروشنده</span>
            <textarea onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} value={form.description} />
          </label>
        </div>
        <button className="fm-button mt-6" disabled={saving} onClick={() => void handleSave()} type="button">
          {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </button>
        {message ? <p className="mt-4 rounded-2xl bg-[#edf8f2] px-4 py-3 text-sm text-[#1f6a52]">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl bg-[#fff1ee] px-4 py-3 text-sm text-[#b64b36]">{error}</p> : null}
      </SectionCard>
    </div>
  )
}

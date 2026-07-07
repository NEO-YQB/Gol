import { Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useState } from 'react'
import { adminApi } from '../lib/api'
import type { AuthSession } from '../lib/session'

type Props = {
  session: AuthSession
  onBack: () => void
}

type PushFormState = {
  userId: string
  storeId: string
  orderId: string
  supportTicketId: string
  topic: string
  title: string
  body: string
}

const DEFAULT_FORM: PushFormState = {
  userId: '',
  storeId: '',
  orderId: '',
  supportTicketId: '',
  topic: 'order.updated',
  title: '',
  body: '',
}

export function PushNotificationWorkspacePage({ session, onBack }: Props) {
  const [form, setForm] = useState<PushFormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit() {
    try {
      setSaving(true)
      setError('')
      setMessage('')

      await adminApi.createPushNotification(session, {
        userId: Number(form.userId),
        ...(form.storeId.trim() ? { storeId: Number(form.storeId) } : {}),
        ...(form.orderId.trim() ? { orderId: Number(form.orderId) } : {}),
        ...(form.supportTicketId.trim()
          ? { supportTicketId: Number(form.supportTicketId) }
          : {}),
        topic: form.topic.trim(),
        title: form.title.trim(),
        body: form.body.trim(),
        payload: {
          topic: form.topic.trim(),
          ...(form.orderId.trim() ? { orderId: Number(form.orderId) } : {}),
          ...(form.supportTicketId.trim()
            ? { supportTicketId: Number(form.supportTicketId) }
            : {}),
        },
      })

      setMessage('پوش نوتیفیکیشن با موفقیت ارسال شد.')
      setForm((current) => ({
        ...DEFAULT_FORM,
        userId: current.userId,
      }))
    } catch (requestError) {
      if (requestError instanceof Error && 'status' in requestError) {
        const payload = requestError as Error & { message: string }
        setError(payload.message)
      } else {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'ارسال پوش نوتیفیکیشن ناموفق بود.',
        )
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard
        eyebrow="اعلان جدید"
        title="ارسال پوش"
        actions={
          <button className="fm-button fm-button--secondary" onClick={onBack} type="button">
            بازگشت
          </button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Pill>پوش</Pill>
          <Pill>کاربر</Pill>
          <Pill>سفارش / تیکت</Pill>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="فرم ارسال"
        title="ثبت اعلان"
      >
        <div className="fm-grid fm-grid--2">
          <label className="fm-field">
            <span>شناسه کاربر</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))}
              type="number"
              value={form.userId}
            />
          </label>
          <label className="fm-field">
            <span>شناسه فروشگاه</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, storeId: event.target.value }))}
              type="number"
              value={form.storeId}
            />
          </label>
          <label className="fm-field">
            <span>شناسه سفارش</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, orderId: event.target.value }))}
              type="number"
              value={form.orderId}
            />
          </label>
          <label className="fm-field">
            <span>شناسه تیکت</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, supportTicketId: event.target.value }))}
              type="number"
              value={form.supportTicketId}
            />
          </label>
          <label className="fm-field">
            <span>موضوع</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))}
              type="text"
              value={form.topic}
            />
          </label>
          <label className="fm-field">
            <span>عنوان اعلان</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              type="text"
              value={form.title}
            />
          </label>
        </div>

        <label className="fm-field">
          <span>متن اعلان</span>
          <textarea
            onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            rows={5}
            value={form.body}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="fm-button fm-button--primary"
            disabled={saving || !form.userId.trim() || !form.title.trim() || !form.body.trim()}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {saving ? 'در حال ارسال...' : 'ارسال اعلان'}
          </button>
        </div>

        {message ? <p className="mt-4 rounded-2xl bg-[#edf8f2] px-4 py-3 text-sm font-medium text-[#1f6a52]">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl bg-[#fff1ee] px-4 py-3 text-sm font-medium text-[#b64b36]">{error}</p> : null}
      </SectionCard>
    </div>
  )
}

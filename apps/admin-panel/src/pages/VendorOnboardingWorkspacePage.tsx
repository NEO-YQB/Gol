import { Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type RequestRecord = Record<string, unknown>

function formatJalaliDate(value: unknown) {
  if (typeof value !== 'string' || !value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function translateStatus(status: string) {
  switch (status) {
    case 'DRAFT': return 'پیش‌نویس'
    case 'SUBMITTED': return 'ارسال شده'
    case 'UNDER_REVIEW': return 'در بررسی'
    case 'APPROVED': return 'تایید شده'
    case 'REJECTED': return 'رد شده'
    default: return status || 'نامشخص'
  }
}

function statusTone(status: string) {
  if (status === 'APPROVED') return 'success' as const
  if (status === 'REJECTED') return 'danger' as const
  if (status === 'UNDER_REVIEW' || status === 'SUBMITTED') return 'warning' as const
  return 'primary' as const
}

export function VendorOnboardingWorkspacePage({
  session,
  request,
  onBack,
}: {
  session: AuthSession
  request: Record<string, unknown> | null
  onBack: () => void
}) {
  const [loading, setLoading] = useState(Boolean(request))
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<RequestRecord | null>(null)
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  useNoticeEffect(message, 'success')
  useNoticeEffect(error, 'error')

  const requestId = readText(request ?? {}, ['id'], '')

  useEffect(() => {
    if (!requestId) {
      setDetail(null)
      setLoading(false)
      return
    }

    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const payload = await adminApi.getVendorOnboardingRequestDetail(session, requestId)
        if (!active) return
        setDetail(payload as Record<string, unknown>)
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری جزئیات درخواست')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [requestId, session])

  const documents = useMemo(() => toArray(detail?.documents), [detail])

  const stats = useMemo(() => [
    { label: 'وضعیت درخواست', value: translateStatus(readText(detail ?? {}, ['applicationStatus'], '')), delta: 'بررسی مدارک و هویت', detail: 'تصمیم اصلی ورود به جمع فروشنده‌ها', tone: statusTone(readText(detail ?? {}, ['applicationStatus'], '')) },
    { label: 'وضعیت محصول', value: translateStatus(readText(detail ?? {}, ['productStatus'], '')), delta: 'گیت محتوا و SEO', detail: 'محصول اولیه بعد از تایید فروشنده', tone: statusTone(readText(detail ?? {}, ['productStatus'], '')) },
    { label: 'مدارک', value: new Intl.NumberFormat('fa-IR').format(documents.length), delta: 'فایل و مدرک پیوست‌شده', detail: 'جواز و فایل‌های ارسالی متقاضی', tone: 'primary' as const },
    { label: 'آخرین بروزرسانی', value: formatJalaliDate(detail?.updatedAt), delta: readText(detail ?? {}, ['user', 'phoneNumber'], '—'), detail: 'زمان آخرین تغییر روی درخواست', tone: 'warning' as const },
  ], [detail, documents.length])

  async function handleApplicationDecision(approved: boolean) {
    if (!requestId) return
    setDecisionBusy(approved ? 'approve-application' : 'reject-application')
    setError(null)

    try {
      const payload = await adminApi.reviewVendorOnboardingApplication(session, requestId, {
        approved,
        reviewNote: reviewNote.trim() || undefined,
      })
      setDetail(payload as Record<string, unknown>)
      setMessage(approved ? 'درخواست فروشندگی تایید شد.' : 'درخواست فروشندگی رد شد.')
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'ثبت تصمیم ناموفق بود')
    } finally {
      setDecisionBusy(null)
    }
  }

  async function handleProductDecision(approved: boolean) {
    if (!requestId) return
    setDecisionBusy(approved ? 'approve-product' : 'reject-product')
    setError(null)

    try {
      const payload = await adminApi.reviewVendorOnboardingProduct(session, requestId, {
        approved,
        reviewNote: reviewNote.trim() || undefined,
      })
      setDetail(payload as Record<string, unknown>)
      setMessage(approved ? 'محصول اولیه تایید شد.' : 'محصول اولیه رد شد.')
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'ثبت تصمیم محصول ناموفق بود')
    } finally {
      setDecisionBusy(null)
    }
  }

  return (
    <div className="fm-stack">
      <LoadableState loading={loading} error={error}>
        <div className="fm-grid">
          {stats.map((item) => <StatCard key={item.label} {...item} />)}
        </div>
      </LoadableState>

      <SectionCard
        eyebrow="جزئیات متقاضی"
        title="مدارک، اطلاعات کسب‌وکار و تصمیم نهایی"
        description="در این workspace می‌توانی مدارک را ببینی، یادداشت ثبت کنی و درباره درخواست یا محصول اولیه تصمیم بگیری."
        actions={<button className="fm-button fm-button--ghost" onClick={onBack} type="button">بازگشت به فهرست</button>}
      >
        <div className="vendor-onboarding-workspace-grid">
          <div className="vendor-onboarding-workspace-panel">
            <div className="vendor-onboarding-admin-summary">
              <div><strong>متقاضی</strong><span>{readText(detail ?? {}, ['user', 'fullName'], readText(detail ?? {}, ['user', 'phoneNumber'], '—'))}</span></div>
              <div><strong>نام کسب‌وکار</strong><span>{readText(detail ?? {}, ['businessName'], '—')}</span></div>
              <div><strong>اسلاگ</strong><span>{readText(detail ?? {}, ['businessSlug'], '—')}</span></div>
              <div><strong>آدرس</strong><span>{readText(detail ?? {}, ['businessAddress'], '—')}</span></div>
              <div><strong>لوکیشن</strong><span>{readText(detail ?? {}, ['businessLat'], '—')} / {readText(detail ?? {}, ['businessLng'], '—')}</span></div>
              <div><strong>شماره جواز</strong><span>{readText(detail ?? {}, ['licenseNumber'], '—')}</span></div>
              <div><strong>ثبت درخواست</strong><span>{formatJalaliDate(detail?.submittedAt)}</span></div>
            </div>
          </div>

          <div className="vendor-onboarding-workspace-panel">
            <SectionCard title="مدارک ارسالی" description="فایل‌هایی که متقاضی برای بررسی پیوست کرده است.">
              {documents.length ? (
                <div className="vendor-onboarding-doc-list">
                  {documents.map((item, index) => {
                    const record = item as Record<string, unknown>
                    return (
                      <div className="vendor-onboarding-doc-item" key={`${readText(record, ['title'], 'doc')}-${index}`}>
                        <strong>{readText(record, ['title'], 'مدرک')}</strong>
                        <span>{readText(record, ['url'], '—')}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="vendor-note-card">مدرکی هنوز ثبت نشده است.</div>
              )}
            </SectionCard>

            <SectionCard title="محصول اولیه" description="بعد از تایید فروشنده، همین محصول باید بررسی شود.">
              <div className="vendor-onboarding-admin-summary">
                <div><strong>نام محصول</strong><span>{readText(detail ?? {}, ['productName'], '—')}</span></div>
                <div><strong>دسته</strong><span>{readText(detail ?? {}, ['productCategoryId'], '—')}</span></div>
                <div><strong>نوع</strong><span>{readText(detail ?? {}, ['productTypeId'], '—')}</span></div>
                <div><strong>قیمت</strong><span>{readText(detail ?? {}, ['productPrice'], '—')}</span></div>
                <div><strong>موجودی</strong><span>{readText(detail ?? {}, ['productQuantity'], '—')}</span></div>
                <div><strong>توضیح</strong><span>{readText(detail ?? {}, ['productDescription'], '—')}</span></div>
              </div>
            </SectionCard>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="ثبت تصمیم"
        title="تایید یا رد درخواست و محصول"
        description="این تصمیم‌ها باید قابل‌ردیابی و روشن باشند تا فروشنده بعدا وضعیتش را ببیند."
      >
        <div className="fm-field">
          <label htmlFor="vendorOnboardingReviewNote">یادداشت بررسی</label>
          <textarea
            id="vendorOnboardingReviewNote"
            rows={4}
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            placeholder="مثلا: جواز معتبر است اما آدرس نیاز به اصلاح دارد"
          />
        </div>

        <div className="vendor-onboarding-decision-row">
          <button className="fm-button fm-button--primary" disabled={Boolean(decisionBusy)} onClick={() => handleApplicationDecision(true)} type="button">تایید درخواست فروشندگی</button>
          <button className="fm-button fm-button--ghost" disabled={Boolean(decisionBusy)} onClick={() => handleApplicationDecision(false)} type="button">رد درخواست فروشندگی</button>
          <button className="fm-button fm-button--secondary" disabled={Boolean(decisionBusy)} onClick={() => handleProductDecision(true)} type="button">تایید محصول اولیه</button>
          <button className="fm-button fm-button--ghost" disabled={Boolean(decisionBusy)} onClick={() => handleProductDecision(false)} type="button">رد محصول اولیه</button>
        </div>

        <div className="vendor-onboarding-status-pills">
          <Pill tone={statusTone(readText(detail ?? {}, ['applicationStatus'], ''))}>{translateStatus(readText(detail ?? {}, ['applicationStatus'], ''))}</Pill>
          <Pill tone={statusTone(readText(detail ?? {}, ['productStatus'], ''))}>{translateStatus(readText(detail ?? {}, ['productStatus'], ''))}</Pill>
        </div>
      </SectionCard>
    </div>
  )
}

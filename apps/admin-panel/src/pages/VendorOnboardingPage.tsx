import { Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type RequestRecord = Record<string, unknown>

const statusFilters = ['ALL', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] as const

function formatJalaliDate(value: unknown) {
  if (typeof value !== 'string' || !value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed)
}

function translateStatus(status: string) {
  switch (status) {
    case 'ALL': return 'همه'
    case 'DRAFT': return 'پیش‌نویس'
    case 'SUBMITTED': return 'ارسال شده'
    case 'UNDER_REVIEW': return 'در بررسی'
    case 'APPROVED': return 'تایید شده'
    case 'REJECTED': return 'رد شده'
    default: return status && status !== 'UNKNOWN' ? status : 'نامشخص'
  }
}

function statusTone(status: string) {
  if (status === 'APPROVED') return 'success' as const
  if (status === 'REJECTED') return 'danger' as const
  if (status === 'UNDER_REVIEW' || status === 'SUBMITTED') return 'warning' as const
  return 'primary' as const
}

function resolveApplicantName(item: RequestRecord) {
  return (
    readText(item, ['personalFullName'], '') ||
    readText(item, ['user', 'fullName'], readText(item, ['user', 'phoneNumber'], '—'))
  )
}

function resolveBusinessName(item: RequestRecord) {
  return readText(item, ['businessName'], readText(item, ['businessSlug'], 'فروشگاه بدون نام'))
}

export function VendorOnboardingPage({
  session,
  onOpenWorkspace,
}: {
  session: AuthSession
  onOpenWorkspace: (request: Record<string, unknown>) => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<RequestRecord[]>([])
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>('ALL')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const payload = await adminApi.getVendorOnboardingRequests(session, {
          page,
          limit: 10,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        })
        if (!active) return

        const record = payload as Record<string, unknown>
        const rows = toArray(record.data)
        const meta = (record.meta as Record<string, unknown>) ?? {}
        setItems(rows)
        setLastPage(Math.max(1, Number(meta.lastPage ?? 1)))
        if (rows.length > 0) {
          setSelectedRequestId((current) => current ?? readText(rows[0], ['id'], ''))
        } else {
          setSelectedRequestId(null)
        }
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری درخواست‌های فروشندگی')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [page, session, statusFilter])

  const stats = useMemo(() => {
    const submitted = items.filter((item) => readText(item, ['applicationStatus'], '') === 'SUBMITTED').length
    const underReview = items.filter((item) => readText(item, ['applicationStatus'], '') === 'UNDER_REVIEW').length
    const approved = items.filter((item) => readText(item, ['applicationStatus'], '') === 'APPROVED').length
    const rejected = items.filter((item) => readText(item, ['applicationStatus'], '') === 'REJECTED').length
    return [
      { label: 'کل', value: new Intl.NumberFormat('fa-IR').format(items.length), delta: translateStatus(statusFilter), detail: '', tone: 'primary' as const },
      { label: 'ارسالی', value: new Intl.NumberFormat('fa-IR').format(submitted), delta: 'منتظر بررسی', detail: '', tone: 'warning' as const },
      { label: 'در بررسی', value: new Intl.NumberFormat('fa-IR').format(underReview), delta: 'روی میز', detail: '', tone: 'warning' as const },
      { label: 'نهایی', value: new Intl.NumberFormat('fa-IR').format(approved + rejected), delta: `${new Intl.NumberFormat('fa-IR').format(approved)} تایید / ${new Intl.NumberFormat('fa-IR').format(rejected)} رد`, detail: '', tone: 'success' as const },
    ]
  }, [items, statusFilter])

  const selected = useMemo(
    () => items.find((item) => readText(item, ['id'], '') === selectedRequestId) ?? null,
    [items, selectedRequestId],
  )

  return (
    <div className="fm-stack">
      <LoadableState loading={loading} error={error}>
        <div className="fm-grid">
          {stats.map((item) => <StatCard key={item.label} {...item} />)}
        </div>
      </LoadableState>

      <SectionCard
        eyebrow="درخواست‌ها"
        title="فروشندگی"
      >
        <div className="vendor-orders-filters vendor-orders-filters--styled">
          {statusFilters.map((status) => (
            <button
              key={status}
              className={`vendor-orders-filter-chip${statusFilter === status ? ' is-active' : ''}`}
              onClick={() => {
                setStatusFilter(status)
                setPage(1)
              }}
              type="button"
            >
              {translateStatus(status)}
            </button>
          ))}
        </div>

        <div className="vendor-orders-layout">
          <SectionCard
            title="فهرست درخواست‌ها"
          >
            <div className="vendors-selection-list">
              {items.length ? (
                items.map((item) => {
                  const itemId = readText(item, ['id'], '')
                  const isActive = selectedRequestId === itemId
                  return (
                    <button
                      className={`vendors-selection-item${isActive ? ' is-active' : ''}`}
                      key={itemId}
                      onClick={() => setSelectedRequestId(itemId)}
                      type="button"
                    >
                      <strong>{resolveBusinessName(item)}</strong>
                      <span>{resolveApplicantName(item)}</span>
                      <small>{formatJalaliDate(item.updatedAt)}</small>
                      <div className="vendor-onboarding-mini-pills">
                        <Pill tone={statusTone(readText(item, ['applicationStatus'], ''))}>{translateStatus(readText(item, ['applicationStatus'], ''))}</Pill>
                        <Pill tone={statusTone(readText(item, ['productStatus'], ''))}>{translateStatus(readText(item, ['productStatus'], ''))}</Pill>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="vendor-note-card">درخواستی برای این فیلتر پیدا نشد.</div>
              )}
            </div>
            <div className="vendor-onboarding-admin-pagination">
              <button className="fm-button fm-button--ghost" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button">صفحه قبل</button>
              <span>صفحه {new Intl.NumberFormat('fa-IR').format(page)} از {new Intl.NumberFormat('fa-IR').format(lastPage)}</span>
              <button className="fm-button fm-button--ghost" disabled={page >= lastPage} onClick={() => setPage((current) => current + 1)} type="button">صفحه بعد</button>
            </div>
          </SectionCard>

          <SectionCard
            title="خلاصه"
          >
            {selected ? (
              <div className="vendor-onboarding-admin-summary">
                <div><strong>متقاضی</strong><span>{resolveApplicantName(selected)}</span></div>
                <div><strong>کسب‌وکار</strong><span>{resolveBusinessName(selected)}</span></div>
                <div><strong>درخواست</strong><span><Pill tone={statusTone(readText(selected, ['applicationStatus'], ''))}>{translateStatus(readText(selected, ['applicationStatus'], ''))}</Pill></span></div>
                <div><strong>محصول</strong><span><Pill tone={statusTone(readText(selected, ['productStatus'], ''))}>{translateStatus(readText(selected, ['productStatus'], ''))}</Pill></span></div>
                <div><strong>بروزرسانی</strong><span>{formatJalaliDate(selected.updatedAt)}</span></div>
                <div className="vendors-inline-actions">
                  <button className="fm-button fm-button--primary" onClick={() => onOpenWorkspace(selected)} type="button">باز کردن میزکار</button>
                </div>
              </div>
            ) : (
              <div className="vendor-note-card">هنوز درخواستی برای این فیلتر پیدا نشده است.</div>
            )}
          </SectionCard>
        </div>
      </SectionCard>
    </div>
  )
}

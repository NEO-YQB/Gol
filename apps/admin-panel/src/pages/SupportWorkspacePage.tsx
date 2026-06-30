import { ActivityFeed, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import { hasPermission } from '../lib/permissions'
import type { AuthSession } from '../lib/session'

type TicketRecord = Record<string, unknown>
type WorkspaceLane = 'status' | 'finance' | 'notes'

const notePageSize = 6
const auditPageSize = 6

const supportStatuses = [
  'OPEN',
  'IN_REVIEW',
  'WAITING_CUSTOMER',
  'WAITING_VENDOR',
  'ESCALATED_TO_FINANCE',
  'RESOLVED',
  'REJECTED',
  'CANCELLED',
] as const

const financeOutcomes = [
  'NO_ACTION_RELEASE',
  'FULL_REFUND',
  'PARTIAL_REFUND',
  'FULL_REVERSAL',
  'PARTIAL_REVERSAL',
  'EXTEND_HOLD',
] as const

function getSupportStatusLabel(status: string) {
  switch (status) {
    case 'OPEN':
      return 'باز'
    case 'IN_REVIEW':
      return 'در حال بررسی'
    case 'WAITING_CUSTOMER':
      return 'در انتظار مشتری'
    case 'WAITING_VENDOR':
      return 'در انتظار فروشنده'
    case 'ESCALATED_TO_FINANCE':
      return 'ارجاع‌شده به مالی'
    case 'RESOLVED':
      return 'حل‌شده'
    case 'REJECTED':
      return 'ردشده'
    case 'CANCELLED':
      return 'لغوشده'
    default:
      return status && status !== 'UNKNOWN' ? status : 'نامشخص'
  }
}

function getSupportReasonLabel(reason: string) {
  switch (reason) {
    case 'DAMAGED_FLOWERS':
      return 'آسیب‌دیدگی گل‌ها'
    case 'MISMATCHED_PRODUCT':
      return 'مغایرت محصول'
    case 'LATE_DELIVERY':
      return 'تاخیر در تحویل'
    case 'INCOMPLETE_OR_WRONG_ORDER':
      return 'سفارش ناقص یا اشتباه'
    case 'DELIVERY_EXPERIENCE':
      return 'مشکل تجربه تحویل'
    case 'OTHER':
      return 'سایر موارد'
    default:
      return reason && reason !== 'UNKNOWN' ? reason : 'نامشخص'
  }
}

function getFinanceOutcomeLabel(outcome: string) {
  switch (outcome) {
    case 'NO_ACTION_RELEASE':
      return 'بدون اقدام و آزادسازی'
    case 'FULL_REFUND':
      return 'بازگشت کامل وجه'
    case 'PARTIAL_REFUND':
      return 'بازگشت بخشی از وجه'
    case 'FULL_REVERSAL':
      return 'برگشت کامل تراکنش'
    case 'PARTIAL_REVERSAL':
      return 'برگشت بخشی از تراکنش'
    case 'EXTEND_HOLD':
      return 'تمدید نگه‌داری'
    default:
      return outcome && outcome !== 'UNKNOWN' && outcome !== '—' ? outcome : 'ثبت نشده'
  }
}

function getOrderStatusLabel(status: string) {
  switch (status) {
    case 'PENDING':
      return 'در انتظار تایید'
    case 'PAID':
      return 'پرداخت شده'
    case 'ACCEPTED':
      return 'تایید شده'
    case 'PROCESSING':
      return 'در حال آماده‌سازی'
    case 'SHIPPED':
      return 'ارسال شده'
    case 'DELIVERED':
      return 'تحویل شده'
    case 'REJECTED_BY_VENDOR':
      return 'رد شده توسط فروشنده'
    case 'CANCELLED':
      return 'لغو شده'
    case 'CANCELLED_BY_ADMIN':
      return 'لغو شده توسط ادمین'
    case 'CANCELLED_BY_CUSTOMER':
      return 'لغو شده توسط مشتری'
    default:
      return status && status !== 'UNKNOWN' ? status : 'نامشخص'
  }
}

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case 'PENDING':
      return 'در انتظار پرداخت'
    case 'PAID':
      return 'پرداخت شده'
    case 'FAILED':
      return 'ناموفق'
    case 'EXPIRED':
      return 'منقضی شده'
    case 'REFUNDED':
      return 'بازگشت کامل وجه'
    case 'PARTIALLY_REFUNDED':
      return 'بازگشت بخشی از وجه'
    default:
      return status && status !== 'UNKNOWN' ? status : 'نامشخص'
  }
}

function getSettlementStatusLabel(status: string) {
  switch (status) {
    case 'PENDING':
      return 'در انتظار نگه‌داری'
    case 'ON_HOLD':
      return 'در نگه‌داری'
    case 'RELEASED':
      return 'آزاد شده'
    case 'REVERSED':
      return 'برگشت خورده'
    default:
      return status && status !== 'UNKNOWN' ? status : 'نامشخص'
  }
}

function getFlagLabel(flag: string) {
  switch (flag) {
    case 'FOLLOW_UP_REQUIRED':
      return 'نیازمند پیگیری'
    case 'FINANCE_REVIEW_PENDING':
      return 'در انتظار بررسی مالی'
    default:
      return flag || 'نامشخص'
  }
}

function getEventTypeLabel(eventType: string) {
  switch (eventType) {
    case 'SUPPORT_TICKET_CREATED':
      return 'ایجاد تیکت'
    case 'SUPPORT_TICKET_STATUS_CHANGED':
      return 'تغییر وضعیت'
    case 'SUPPORT_FINANCE_DECISION_APPLIED':
      return 'تصمیم مالی'
    default:
      return eventType || 'رخداد'
  }
}

function getActorLabel(value: string) {
  switch (value) {
    case 'ADMIN':
      return 'مدیر'
    case 'SYSTEM':
      return 'سامانه'
    case 'CUSTOMER':
      return 'مشتری'
    case 'VENDOR':
      return 'فروشنده'
    case 'FINANCE':
      return 'مالی'
    default:
      return value || 'نامشخص'
  }
}

function toObject(value: unknown): TicketRecord {
  return typeof value === 'object' && value !== null ? (value as TicketRecord) : {}
}

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

function formatPersianNumber(value: unknown) {
  if (typeof value === 'number') return new Intl.NumberFormat('fa-IR').format(value)
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return new Intl.NumberFormat('fa-IR').format(parsed)
    return value
  }
  return '—'
}

function getStatusTone(status: string) {
  if (status === 'ESCALATED_TO_FINANCE') return 'danger' as const
  if (status === 'OPEN' || status === 'IN_REVIEW') return 'warning' as const
  if (status === 'RESOLVED') return 'success' as const
  return 'primary' as const
}


function getRecommendedSupportAction(options: {
  status: string
  flagsCount: number
  notesCount: number
  canChangeStatus: boolean
  canWriteNote: boolean
  canSubmitFinance: boolean
}) {
  if (options.flagsCount > 0) {
    return 'نیازمند پیگیری'
  }

  if (options.status === 'ESCALATED_TO_FINANCE' && options.canSubmitFinance) {
    return 'تصمیم مالی لازم است'
  }

  if ((options.status === 'OPEN' || options.status === 'IN_REVIEW') && options.canChangeStatus) {
    return 'وضعیت را تعیین کن'
  }

  if (options.notesCount === 0 && options.canWriteNote) {
    return 'یادداشت ثبت کن'
  }

  return 'آماده پیگیری'
}

function getFinanceTone(outcome: string) {
  if (outcome.includes('REFUND') || outcome.includes('REVERSAL')) return 'danger' as const
  if (outcome === 'EXTEND_HOLD') return 'warning' as const
  if (outcome === 'NO_ACTION_RELEASE') return 'success' as const
  return 'primary' as const
}

export function SupportWorkspacePage({
  session,
  ticket,
  onBack,
}: {
  session: AuthSession
  ticket: Record<string, unknown> | null
  onBack: () => void
}) {
  const [loading, setLoading] = useState(Boolean(ticket))
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<TicketRecord | null>(null)
  const [activeLane, setActiveLane] = useState<WorkspaceLane>('status')
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  useNoticeEffect(actionMessage, 'success')
  useNoticeEffect(actionError, 'error')
  const [notesPage, setNotesPage] = useState(1)
  const [auditPage, setAuditPage] = useState(1)
  const [statusForm, setStatusForm] = useState({ status: 'IN_REVIEW', note: '', internalNote: '' })
  const [noteForm, setNoteForm] = useState({ message: '', isInternal: true })
  const [financeForm, setFinanceForm] = useState({
    outcome: 'NO_ACTION_RELEASE',
    amount: '',
    extendHoldDays: '',
    note: '',
    refundReason: '',
    refundNote: '',
  })

  const ticketId = readText(ticket ?? {}, ['id'], '')

  const loadTicket = useCallback(async () => {
    if (!ticketId) {
      setLoading(false)
      setDetail(null)
      setError('برای ورود به میزکار پشتیبانی، ابتدا یک تیکت را از کارتابل انتخاب کن.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const payload = await adminApi.getSupportTicketDetail(session, ticketId)
      const next = toObject(payload)
      setDetail(next)
      setStatusForm((current) => ({
        ...current,
        status: readText(next, ['status'], current.status),
        internalNote: readText(next, ['internalNote'], current.internalNote),
      }))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری میزکار پشتیبانی')
    } finally {
      setLoading(false)
    }
  }, [session, ticketId])

  useEffect(() => {
    void loadTicket()
  }, [loadTicket])

  const canChangeStatus = hasPermission(session, 'update', 'SupportTicket') || hasPermission(session, 'manage', 'all')
  const canWriteNote = hasPermission(session, 'create', 'SupportTicketNote') || hasPermission(session, 'manage', 'all')
  const canSubmitFinance = hasPermission(session, 'read', 'StoreWallet') || hasPermission(session, 'manage', 'all')

  const notes = useMemo(() => toArray(detail?.notes), [detail])
  const auditTrail = useMemo(() => toArray(detail?.auditTrail), [detail])
  const flags = useMemo(
    () =>
      Array.isArray(detail?.latestOperationalFlags)
        ? detail.latestOperationalFlags.map((item) => String(item))
        : [],
    [detail],
  )
  const order = useMemo(() => toObject(detail?.order), [detail])
  const customer = useMemo(() => toObject(detail?.customer), [detail])
  const store = useMemo(() => toObject(detail?.store), [detail])
  const status = readText(detail ?? ticket ?? {}, ['status'], 'UNKNOWN')
  const financeOutcome = readText(detail ?? ticket ?? {}, ['financeOutcome'], '—')
  const notesPageCount = Math.max(1, Math.ceil(notes.length / notePageSize))
  const auditPageCount = Math.max(1, Math.ceil(auditTrail.length / auditPageSize))

  useEffect(() => {
    setNotesPage(1)
    setAuditPage(1)
  }, [ticketId])

  const recommendedAction = getRecommendedSupportAction({
    status,
    flagsCount: flags.length,
    notesCount: notes.length,
    canChangeStatus,
    canWriteNote,
    canSubmitFinance,
  })

  const stats = [
    {
      label: 'وضعیت تیکت',
      value: getSupportStatusLabel(status),
      delta: getSupportReasonLabel(readText(detail ?? ticket ?? {}, ['reason'], 'UNKNOWN')),
      detail: '',
      tone: getStatusTone(status),
    },
    {
      label: 'سفارش',
      value: readText(order, ['id'], '—'),
      delta: getPaymentStatusLabel(readText(order, ['paymentStatus'], 'UNKNOWN')),
      detail: '',
      tone: 'primary' as const,
    },
    {
      label: 'خروجی مالی',
      value: getFinanceOutcomeLabel(financeOutcome),
      delta: formatPersianNumber(readText(detail ?? {}, ['financeAmount'], '—')),
      detail: '',
      tone: getFinanceTone(financeOutcome),
    },
    {
      label: 'یادداشت‌ها',
      value: formatPersianNumber(notes.length),
      delta: `${formatPersianNumber(auditTrail.length)} رخداد ثبت‌شده`,
      detail: '',
      tone: 'warning' as const,
    },
  ]

  const laneCards = [
    {
      key: 'status' as const,
      title: 'وضعیت',
      detail: getSupportStatusLabel(status),
    },
    {
      key: 'finance' as const,
      title: 'مالی',
      detail: getFinanceOutcomeLabel(financeOutcome),
    },
    {
      key: 'notes' as const,
      title: 'یادداشت',
      detail: `${formatPersianNumber(notes.length)} یادداشت`,
    },
  ]

  const timelineFeed = notes
    .slice((notesPage - 1) * notePageSize, notesPage * notePageSize)
    .map((item, index) => ({
    id: readText(item, ['id'], String(index + 1)),
    title: readText(item, ['message'], 'یادداشت پشتیبانی'),
    meta: `${getActorLabel(readText(item, ['actorType'], '—'))} / ${formatJalaliDate(item.createdAt)}`,
    description: readText(item, ['isInternal'], '') === 'true' ? 'داخلی' : 'قابل نمایش',
    tone: readText(item, ['isInternal'], '') === 'true' ? ('warning' as const) : ('success' as const),
  }))

  async function runAction(key: string, action: () => Promise<unknown>, successMessage: string) {
    setActionBusy(key)
    setActionError(null)
    setActionMessage(null)
    try {
      await action()
      await loadTicket()
      setActionMessage(successMessage)
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'اجرای action با خطا مواجه شد')
    } finally {
      setActionBusy(null)
    }
  }

  async function handleStatusSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runAction(
      'status-submit',
      () =>
        adminApi.updateSupportTicketStatus(session, ticketId, {
          status: statusForm.status,
          note: statusForm.note.trim() || undefined,
          internalNote: statusForm.internalNote.trim() || undefined,
        }),
      'وضعیت تیکت با موفقیت به‌روزرسانی شد.',
    )
  }

  async function handleNoteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runAction(
      'note-submit',
      () =>
        adminApi.addSupportTicketNote(session, ticketId, {
          message: noteForm.message.trim(),
          isInternal: noteForm.isInternal,
        }),
      'یادداشت تیکت با موفقیت ثبت شد.',
    )
    setNoteForm((current) => ({ ...current, message: '' }))
  }

  async function handleFinanceSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runAction(
      'finance-submit',
      () =>
        adminApi.applySupportFinanceDecision(session, ticketId, {
          outcome: financeForm.outcome,
          amount: financeForm.amount.trim() ? Number(financeForm.amount) : undefined,
          extendHoldDays: financeForm.extendHoldDays.trim() ? Number(financeForm.extendHoldDays) : undefined,
          note: financeForm.note.trim() || undefined,
          refundReason: financeForm.refundReason.trim() || undefined,
          refundNote: financeForm.refundNote.trim() || undefined,
        }),
      'تصمیم مالی تیکت با موفقیت ثبت شد.',
    )
  }

  return (
    <div className="fm-stack">
      <div className="support-workspace-topbar">
        <button className="support-open-workspace" onClick={onBack} type="button">
          بازگشت به کارتابل پشتیبانی
        </button>
        <Pill tone={getStatusTone(status)}>{getSupportStatusLabel(status)}</Pill>
      </div>

      <LoadableState error={error} loading={loading}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="میزکار پشتیبانی"
          title={`تیکت #${ticketId || '—'}`}
          actions={<Pill tone="primary">رسیدگی زنده</Pill>}
        >
          <div className="support-workspace-lanes">
            {laneCards.map((item) => (
              <button
                className={`support-workspace-lane-card${activeLane === item.key ? ' is-active' : ''}`}
                key={item.key}
                onClick={() => setActiveLane(item.key)}
                type="button"
              >
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="خلاصه"
          title="اطلاعات تیکت"
          actions={<Pill tone="primary">مرور سریع</Pill>}
        >
          <div className="support-brief-grid">
            {[
              { label: 'مشتری', value: readText(customer, ['fullName', 'phoneNumber'], '—'), detail: readText(customer, ['phoneNumber'], '—') },
              { label: 'فروشگاه', value: readText(store, ['name'], '—'), detail: readText(store, ['slug'], '—') },
              { label: 'سفارش', value: readText(order, ['id'], '—'), detail: getOrderStatusLabel(readText(order, ['status'], 'UNKNOWN')) },
              { label: 'پرداخت', value: getPaymentStatusLabel(readText(order, ['paymentStatus'], 'UNKNOWN')), detail: getSettlementStatusLabel(readText(order, ['settlementStatus'], 'UNKNOWN')) },
              { label: 'علت', value: getSupportReasonLabel(readText(detail ?? {}, ['reason'], 'UNKNOWN')), detail: flags.length ? flags.map(getFlagLabel).join(' / ') : 'بدون هشدار' },
            ].map((item) => (
              <article className="support-brief-item" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="اقدام"
          title="وضعیت اقدام"
          actions={<Pill tone={flags.length || status === 'ESCALATED_TO_FINANCE' ? 'warning' : 'primary'}>{flags.length || status === 'ESCALATED_TO_FINANCE' ? 'نیازمند توجه' : 'عادی'}</Pill>}
        >
          <div className="support-decision-strip">
            <strong>{recommendedAction}</strong>
          </div>
        </SectionCard>

        {activeLane === 'status' ? (
        <SectionCard
          eyebrow="کنترل وضعیت"
          title="تغییر وضعیت"
          actions={<Pill tone="warning">ثبت وضعیت</Pill>}
        >
          <form className="fm-form-grid support-workspace-form-grid" onSubmit={handleStatusSubmit}>
            <div className="fm-field">
              <label htmlFor="support-status">وضعیت</label>
              <select
                id="support-status"
                onChange={(event) => setStatusForm((current) => ({ ...current, status: event.target.value }))}
                value={statusForm.status}
              >
                {supportStatuses.map((item) => (
                  <option key={item} value={item}>
                    {getSupportStatusLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <div className="fm-field">
              <label htmlFor="support-status-note">توضیح برای روند رسیدگی</label>
              <textarea
                id="support-status-note"
                onChange={(event) => setStatusForm((current) => ({ ...current, note: event.target.value }))}
                rows={3}
                value={statusForm.note}
              />
            </div>
            <div className="fm-field">
              <label htmlFor="support-internal-note">یادداشت داخلی</label>
              <textarea
                id="support-internal-note"
                onChange={(event) => setStatusForm((current) => ({ ...current, internalNote: event.target.value }))}
                rows={3}
                value={statusForm.internalNote}
              />
            </div>
            <button className="fm-button fm-button--primary" disabled={!canChangeStatus || actionBusy === 'status-submit'} type="submit">
              {actionBusy === 'status-submit' ? 'در حال ثبت...' : 'ثبت تغییر وضعیت'}
            </button>
          </form>
        </SectionCard>
        ) : null}

        {activeLane === 'finance' ? (
        <SectionCard
          eyebrow="کنترل مالی"
          title="تصمیم مالی"
          actions={<Pill tone="danger">ثبت مالی</Pill>}
        >
          <form className="fm-form-grid support-workspace-form-grid" onSubmit={handleFinanceSubmit}>
            <div className="fm-field">
              <label htmlFor="finance-outcome">نتیجه مالی</label>
              <select
                id="finance-outcome"
                onChange={(event) => setFinanceForm((current) => ({ ...current, outcome: event.target.value }))}
                value={financeForm.outcome}
              >
                {financeOutcomes.map((item) => (
                  <option key={item} value={item}>
                    {getFinanceOutcomeLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <div className="fm-field">
              <label htmlFor="finance-amount">مبلغ</label>
              <input
                id="finance-amount"
                onChange={(event) => setFinanceForm((current) => ({ ...current, amount: event.target.value }))}
                step="0.01"
                type="number"
                value={financeForm.amount}
              />
            </div>
            <div className="fm-field">
              <label htmlFor="finance-hold-days">تعداد روزهای نگه‌داری بیشتر</label>
              <input
                id="finance-hold-days"
                onChange={(event) => setFinanceForm((current) => ({ ...current, extendHoldDays: event.target.value }))}
                type="number"
                value={financeForm.extendHoldDays}
              />
            </div>
            <div className="fm-field">
              <label htmlFor="finance-note">توضیح تصمیم مالی</label>
              <textarea
                id="finance-note"
                onChange={(event) => setFinanceForm((current) => ({ ...current, note: event.target.value }))}
                rows={3}
                value={financeForm.note}
              />
            </div>
            <div className="fm-field">
              <label htmlFor="finance-refund-reason">دلیل بازگشت وجه</label>
              <input
                id="finance-refund-reason"
                onChange={(event) => setFinanceForm((current) => ({ ...current, refundReason: event.target.value }))}
                value={financeForm.refundReason}
              />
            </div>
            <div className="fm-field">
              <label htmlFor="finance-refund-note">توضیح تکمیلی بازگشت وجه</label>
              <textarea
                id="finance-refund-note"
                onChange={(event) => setFinanceForm((current) => ({ ...current, refundNote: event.target.value }))}
                rows={3}
                value={financeForm.refundNote}
              />
            </div>
            <button className="fm-button fm-button--primary" disabled={!canSubmitFinance || actionBusy === 'finance-submit'} type="submit">
              {actionBusy === 'finance-submit' ? 'در حال ثبت...' : 'ثبت تصمیم مالی'}
            </button>
          </form>
        </SectionCard>
        ) : null}

        {activeLane === 'notes' ? (
        <SectionCard
          eyebrow="ثبت یادداشت"
          title="یادداشت"
          actions={<Pill tone="success">ثبت یادداشت</Pill>}
        >
          <form className="fm-form-grid support-workspace-form-grid" onSubmit={handleNoteSubmit}>
            <div className="fm-field">
              <label htmlFor="support-note-message">متن یادداشت</label>
              <textarea
                id="support-note-message"
                onChange={(event) => setNoteForm((current) => ({ ...current, message: event.target.value }))}
                rows={4}
                value={noteForm.message}
              />
            </div>
            <label className="support-workspace-toggle">
              <input
                checked={noteForm.isInternal}
                onChange={(event) => setNoteForm((current) => ({ ...current, isInternal: event.target.checked }))}
                type="checkbox"
              />
              <span>یادداشت فقط برای همکاران باشد</span>
            </label>
            <button className="fm-button fm-button--primary" disabled={!canWriteNote || actionBusy === 'note-submit'} type="submit">
              {actionBusy === 'note-submit' ? 'در حال ثبت...' : 'ثبت یادداشت'}
            </button>
          </form>
        </SectionCard>
        ) : null}

        <SectionCard
          eyebrow="یادداشت‌های اخیر"
          title="یادداشت‌ها"
          actions={<Pill tone="warning">{`${formatPersianNumber(notes.length)} یادداشت`}</Pill>}
        >
          {timelineFeed.length ? <ActivityFeed items={timelineFeed} /> : <div className="fm-message">هنوز یادداشتی ثبت نشده است.</div>}
          {notes.length > notePageSize ? (
            <div className="vendors-pagination">
              <button
                className="vendors-page-button"
                disabled={notesPage <= 1}
                onClick={() => setNotesPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                موردهای قبل
              </button>
              <span>{`صفحه ${notesPage} از ${notesPageCount}`}</span>
              <button
                className="vendors-page-button"
                disabled={notesPage >= notesPageCount}
                onClick={() => setNotesPage((current) => Math.min(notesPageCount, current + 1))}
                type="button"
              >
                موردهای بعد
              </button>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard
          eyebrow="ردپای رخدادها"
          title="رخدادها"
          actions={<Pill tone="neutral">{`${formatPersianNumber(auditTrail.length)} رخداد`}</Pill>}
        >
          <div className="support-audit-list">
            {auditTrail
              .slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize)
              .map((item, index) => (
              <article className="support-audit-item" key={readText(item, ['id'], String(index + 1))}>
                <strong>{readText(item, ['summary', 'aggregateType'], 'رخداد پشتیبانی')}</strong>
                <span>{formatJalaliDate(item.createdAt)}</span>
                <small>{getEventTypeLabel(readText(item, ['eventType'], ''))}</small>
              </article>
            ))}
          </div>
          {auditTrail.length > auditPageSize ? (
            <div className="vendors-pagination">
              <button
                className="vendors-page-button"
                disabled={auditPage <= 1}
                onClick={() => setAuditPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                موردهای قبل
              </button>
              <span>{`صفحه ${auditPage} از ${auditPageCount}`}</span>
              <button
                className="vendors-page-button"
                disabled={auditPage >= auditPageCount}
                onClick={() => setAuditPage((current) => Math.min(auditPageCount, current + 1))}
                type="button"
              >
                موردهای بعد
              </button>
            </div>
          ) : null}
        </SectionCard>
      </LoadableState>
    </div>
  )
}

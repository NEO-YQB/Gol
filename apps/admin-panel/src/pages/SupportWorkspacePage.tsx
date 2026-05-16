import { ActivityFeed, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type TicketRecord = Record<string, unknown>
type WorkspaceLane = 'status' | 'finance' | 'notes'

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
      setError('برای ورود به workspace پشتیبانی، ابتدا یک تیکت را از کارتابل انتخاب کن.')
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
      setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری workspace پشتیبانی')
    } finally {
      setLoading(false)
    }
  }, [session, ticketId])

  useEffect(() => {
    void loadTicket()
  }, [loadTicket])

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

  const stats = [
    {
      label: 'وضعیت تیکت',
      value: status,
      delta: readText(detail ?? ticket ?? {}, ['reason'], '—'),
      detail: 'state فعلی این تیکت',
      tone: getStatusTone(status),
    },
    {
      label: 'سفارش',
      value: readText(order, ['id'], '—'),
      delta: readText(order, ['paymentStatus'], '—'),
      detail: 'context سفارش و payment',
      tone: 'primary' as const,
    },
    {
      label: 'خروجی مالی',
      value: financeOutcome,
      delta: formatPersianNumber(readText(detail ?? {}, ['financeAmount'], '—')),
      detail: 'آخرین تصمیم مالی ثبت‌شده',
      tone: getFinanceTone(financeOutcome),
    },
    {
      label: 'noteها',
      value: formatPersianNumber(notes.length),
      delta: `${formatPersianNumber(auditTrail.length)} رخداد audit`,
      detail: 'context این تیکت در workspace',
      tone: 'warning' as const,
    },
  ]

  const laneCards = [
    {
      key: 'status' as const,
      title: 'lane وضعیت',
      description: 'برای تغییر status، waiting state و resolve/reject.',
      detail: status,
    },
    {
      key: 'finance' as const,
      title: 'lane مالی',
      description: 'برای finance decision و outcomeهای refund/reversal/release.',
      detail: financeOutcome,
    },
    {
      key: 'notes' as const,
      title: 'lane notes',
      description: 'برای ثبت note داخلی/عمومی و نگه داشتن handoff context.',
      detail: `${formatPersianNumber(notes.length)} note`,
    },
  ]

  const timelineFeed = notes.slice(0, 10).map((item, index) => ({
    id: readText(item, ['id'], String(index + 1)),
    title: readText(item, ['message'], 'support note'),
    meta: `${readText(item, ['actorType'], '—')} / ${formatJalaliDate(item.createdAt)}`,
    description: readText(item, ['isInternal'], '') === 'true' ? 'note داخلی' : 'note قابل‌نمایش',
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
      'note تیکت با موفقیت ثبت شد.',
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
        <Pill tone={getStatusTone(status)}>{status}</Pill>
      </div>

      {actionMessage ? <div className="fm-message">{actionMessage}</div> : null}
      {actionError ? <div className="fm-message">{actionError}</div> : null}

      <LoadableState error={error} loading={loading}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="workspace متمرکز"
          title={`رسیدگی به تیکت #${ticketId || '—'}`}
          description="این route تمام actionهای اصلی تیکت را در یک surface متمرکز جمع می‌کند تا list page خلوت بماند."
          actions={<Pill tone="primary">support live</Pill>}
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
                <p>{item.description}</p>
                <small>{item.detail}</small>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="decision brief"
          title="جمع‌بندی سریع این تیکت"
          description="قبل از اجرای action، وضعیت سفارش، مشتری، فروشگاه و flagهای عملیاتی همین‌جا جمع شده‌اند."
          actions={<Pill tone="neutral">brief</Pill>}
        >
          <div className="support-brief-grid">
            {[
              { label: 'مشتری', value: readText(customer, ['fullName', 'phoneNumber'], '—'), detail: readText(customer, ['phoneNumber'], '—') },
              { label: 'فروشگاه', value: readText(store, ['name'], '—'), detail: readText(store, ['slug'], '—') },
              { label: 'سفارش', value: readText(order, ['id'], '—'), detail: readText(order, ['status'], '—') },
              { label: 'flagها', value: flags.length ? flags.join(' / ') : '—', detail: readText(detail ?? {}, ['reason'], '—') },
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
          eyebrow="status control"
          title="تغییر وضعیت تیکت"
          description="تمام transitionهای واقعی status از همین فرم اجرا می‌شوند."
          actions={<Pill tone="warning">status mutation</Pill>}
        >
          <form className="fm-form-grid support-workspace-form-grid" onSubmit={handleStatusSubmit}>
            <div className="fm-field">
              <label htmlFor="support-status">status</label>
              <select
                id="support-status"
                onChange={(event) => setStatusForm((current) => ({ ...current, status: event.target.value }))}
                value={statusForm.status}
              >
                {supportStatuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="fm-field">
              <label htmlFor="support-status-note">note</label>
              <textarea
                id="support-status-note"
                onChange={(event) => setStatusForm((current) => ({ ...current, note: event.target.value }))}
                rows={3}
                value={statusForm.note}
              />
            </div>
            <div className="fm-field">
              <label htmlFor="support-internal-note">internal note</label>
              <textarea
                id="support-internal-note"
                onChange={(event) => setStatusForm((current) => ({ ...current, internalNote: event.target.value }))}
                rows={3}
                value={statusForm.internalNote}
              />
            </div>
            <button className="fm-button fm-button--primary" disabled={actionBusy === 'status-submit'} type="submit">
              {actionBusy === 'status-submit' ? 'در حال ثبت...' : 'ثبت تغییر وضعیت'}
            </button>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="finance control"
          title="ثبت تصمیم مالی واقعی"
          description="finance decision این تیکت مستقیما به backend واقعی متصل است و outcomeهای refund/reversal/extend-hold را ثبت می‌کند."
          actions={<Pill tone="danger">finance mutation</Pill>}
        >
          <form className="fm-form-grid support-workspace-form-grid" onSubmit={handleFinanceSubmit}>
            <div className="fm-field">
              <label htmlFor="finance-outcome">outcome</label>
              <select
                id="finance-outcome"
                onChange={(event) => setFinanceForm((current) => ({ ...current, outcome: event.target.value }))}
                value={financeForm.outcome}
              >
                {financeOutcomes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="fm-field">
              <label htmlFor="finance-amount">amount</label>
              <input
                id="finance-amount"
                onChange={(event) => setFinanceForm((current) => ({ ...current, amount: event.target.value }))}
                step="0.01"
                type="number"
                value={financeForm.amount}
              />
            </div>
            <div className="fm-field">
              <label htmlFor="finance-hold-days">extendHoldDays</label>
              <input
                id="finance-hold-days"
                onChange={(event) => setFinanceForm((current) => ({ ...current, extendHoldDays: event.target.value }))}
                type="number"
                value={financeForm.extendHoldDays}
              />
            </div>
            <div className="fm-field">
              <label htmlFor="finance-note">note</label>
              <textarea
                id="finance-note"
                onChange={(event) => setFinanceForm((current) => ({ ...current, note: event.target.value }))}
                rows={3}
                value={financeForm.note}
              />
            </div>
            <div className="fm-field">
              <label htmlFor="finance-refund-reason">refundReason</label>
              <input
                id="finance-refund-reason"
                onChange={(event) => setFinanceForm((current) => ({ ...current, refundReason: event.target.value }))}
                value={financeForm.refundReason}
              />
            </div>
            <div className="fm-field">
              <label htmlFor="finance-refund-note">refundNote</label>
              <textarea
                id="finance-refund-note"
                onChange={(event) => setFinanceForm((current) => ({ ...current, refundNote: event.target.value }))}
                rows={3}
                value={financeForm.refundNote}
              />
            </div>
            <button className="fm-button fm-button--primary" disabled={actionBusy === 'finance-submit'} type="submit">
              {actionBusy === 'finance-submit' ? 'در حال ثبت...' : 'ثبت تصمیم مالی'}
            </button>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="note control"
          title="ثبت note و handoff context"
          description="noteهای داخلی یا عمومی از همین بخش ثبت می‌شوند تا timeline تیکت کامل بماند."
          actions={<Pill tone="success">note mutation</Pill>}
        >
          <form className="fm-form-grid support-workspace-form-grid" onSubmit={handleNoteSubmit}>
            <div className="fm-field">
              <label htmlFor="support-note-message">message</label>
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
              <span>note داخلی</span>
            </label>
            <button className="fm-button fm-button--primary" disabled={actionBusy === 'note-submit'} type="submit">
              {actionBusy === 'note-submit' ? 'در حال ثبت...' : 'ثبت note'}
            </button>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="latest notes"
          title="فید noteها و timeline پشتیبانی"
          description="noteها و پیگیری‌های ثبت‌شده در همین route برای اپراتور مرجع اصلی هستند."
          actions={<Pill tone="warning">{`${formatPersianNumber(notes.length)} note`}</Pill>}
        >
          {timelineFeed.length ? <ActivityFeed items={timelineFeed} /> : <div className="fm-message">هنوز noteای ثبت نشده است.</div>}
        </SectionCard>

        <SectionCard
          eyebrow="audit trail"
          title="رخدادهای audit و history"
          description="رخدادهای اصلی support ticket اینجا نگه داشته می‌شوند تا تصمیم‌ها قابل‌ردیابی بمانند."
          actions={<Pill tone="neutral">{`${formatPersianNumber(auditTrail.length)} event`}</Pill>}
        >
          <div className="support-audit-list">
            {auditTrail.slice(0, 8).map((item, index) => (
              <article className="support-audit-item" key={readText(item, ['id'], String(index + 1))}>
                <strong>{readText(item, ['summary', 'aggregateType'], 'support event')}</strong>
                <span>{formatJalaliDate(item.createdAt)}</span>
                <small>{readText(item, ['eventType'], '—')}</small>
              </article>
            ))}
          </div>
        </SectionCard>
      </LoadableState>
    </div>
  )
}

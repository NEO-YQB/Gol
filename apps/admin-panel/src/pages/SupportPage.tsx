import { ActivityFeed, DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { makeFeed, makeRows, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type TicketRecord = Record<string, unknown>

const ticketColumns = [
  { key: 'id', label: 'تیکت' },
  { key: 'order', label: 'سفارش' },
  { key: 'status', label: 'وضعیت' },
  { key: 'reason', label: 'علت' },
]

function getTicketStatus(record: TicketRecord) {
  return readText(record, ['status'], 'UNKNOWN')
}

function getTicketReason(record: TicketRecord) {
  return readText(record, ['reason', 'title'], '—')
}

function getTicketOrder(record: TicketRecord) {
  return readText(record, ['orderId'], '—')
}

function statusOptions(items: TicketRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getTicketStatus(item))))
  return ['ALL', ...unique]
}

export function SupportPage({
  session,
  onOpenSupportWorkspace,
}: {
  session: AuthSession
  onOpenSupportWorkspace: (ticket: Record<string, unknown>) => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tickets, setTickets] = useState<TicketRecord[]>([])
  const [followUps, setFollowUps] = useState<TicketRecord[]>([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [ticketsPayload, followUpsPayload] = await Promise.all([
          adminApi.getSupportTickets(session),
          adminApi.getSupportFollowUps(session),
        ])

        if (!active) return

        const ticketList = toArray(ticketsPayload)
        const followUpList = toArray(followUpsPayload)
        setTickets(ticketList)
        setFollowUps(followUpList)
        if (ticketList.length > 0) {
          setSelectedTicketId(readText(ticketList[0], ['id'], ''))
        }
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری پشتیبانی')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [session])

  useEffect(() => {
    if (!selectedTicketId) {
      setSelectedTicket(null)
      setDetailError(null)
      return
    }

    const ticketId = selectedTicketId
    let active = true

    async function loadDetail() {
      setDetailLoading(true)
      setDetailError(null)

      try {
        const payload = await adminApi.getSupportTicketDetail(session, ticketId)
        if (!active) return
        setSelectedTicket((payload as Record<string, unknown>) ?? null)
      } catch (loadError) {
        if (!active) return
        setDetailError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری جزئیات تیکت')
      } finally {
        if (active) setDetailLoading(false)
      }
    }

    void loadDetail()

    return () => {
      active = false
    }
  }, [selectedTicketId, session])

  const filteredTickets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return tickets.filter((item) => {
      const matchesStatus = statusFilter === 'ALL' || getTicketStatus(item) === statusFilter
      if (!matchesStatus) return false
      if (!normalizedSearch) return true

      const haystack = [
        readText(item, ['id'], ''),
        getTicketOrder(item),
        getTicketStatus(item),
        getTicketReason(item),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [tickets, search, statusFilter])

  const ticketRows = useMemo(
    () =>
      makeRows(filteredTickets.slice(0, 20), [
        { key: 'id', source: ['id'] },
        { key: 'order', source: ['orderId'] },
        { key: 'status', source: ['status'] },
        { key: 'reason', source: ['reason', 'title'] },
      ]),
    [filteredTickets],
  )

  const feed = useMemo(() => makeFeed(followUps, 'support follow-up'), [followUps])

  const stats = useMemo(
    () => [
      {
        label: 'کل تیکت‌ها',
        value: String(tickets.length),
        delta: `${filteredTickets.length} در view فعلی`,
        detail: 'پایه اصلی support workspace',
        tone: 'primary' as const,
      },
      {
        label: 'تیکت‌های باز',
        value: String(tickets.filter((item) => getTicketStatus(item) === 'OPEN').length),
        delta: 'نیازمند پاسخ اولیه',
        detail: 'ورودی اصلی برای تیم پشتیبانی',
        tone: 'warning' as const,
      },
      {
        label: 'ارجاع‌های مالی',
        value: String(tickets.filter((item) => getTicketStatus(item) === 'ESCALATED_TO_FINANCE').length),
        delta: 'finance decision flow',
        detail: 'تیکت‌هایی که به تصمیم مالی می‌رسند',
        tone: 'danger' as const,
      },
      {
        label: 'follow-upها',
        value: String(followUps.length),
        delta: 'ops feed',
        detail: 'فید eventهای قابل پیگیری برای ادمین',
        tone: 'success' as const,
      },
    ],
    [tickets, filteredTickets.length, followUps.length],
  )

  const selectedSummary = selectedTicket
    ? [
        { label: 'سفارش', value: getTicketOrder(selectedTicket) },
        { label: 'وضعیت', value: getTicketStatus(selectedTicket) },
        { label: 'علت', value: getTicketReason(selectedTicket) },
        { label: 'خروجی مالی', value: readText(selectedTicket, ['financeOutcome'], '—') },
      ]
    : []

  return (
    <div className="fm-stack">
      <LoadableState error={error} loading={loading}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="Support workspace"
          title="workspace تیکت‌های پشتیبانی"
          description="این صفحه حالا لیست، filter، selection، detail summary و feed رخدادهای پشتیبانی را در یک surface واحد جمع می‌کند."
          actions={<Pill tone="primary">support workspace v1</Pill>}
        >
          <div className="support-toolbar">
            <div className="fm-field support-search">
              <label htmlFor="support-search">جستجو</label>
              <input
                id="support-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="شناسه تیکت، سفارش، علت یا وضعیت"
                value={search}
              />
            </div>

            <div className="support-filters">
              {statusOptions(tickets).map((status) => (
                <button
                  className={`support-filter-chip${status === statusFilter ? ' is-active' : ''}`}
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  type="button"
                >
                  {status === 'ALL' ? 'همه' : status}
                </button>
              ))}
            </div>
          </div>

          <div className="support-table-card">
            <DataTable columns={ticketColumns} rows={ticketRows} />
            <div className="support-selection-list">
              {filteredTickets.slice(0, 8).map((item) => {
                const ticketId = readText(item, ['id'], '')
                return (
                  <button
                    className={`support-selection-item${selectedTicketId === ticketId ? ' is-active' : ''}`}
                    key={ticketId}
                    onClick={() => setSelectedTicketId(ticketId)}
                    type="button"
                  >
                    <strong>تیکت #{ticketId}</strong>
                    <span>سفارش #{getTicketOrder(item)}</span>
                    <small>
                      {getTicketStatus(item)} / {getTicketReason(item)}
                    </small>
                  </button>
                )
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="selected ticket"
          title={selectedTicketId ? `جزئیات تیکت #${selectedTicketId}` : 'هیچ تیکتی انتخاب نشده'}
          description="این صفحه list-first باقی می‌ماند و actionهای واقعی تیکت در workspace جدا انجام می‌شوند."
          actions={
            selectedTicket ? (
              <button className="support-open-workspace" onClick={() => onOpenSupportWorkspace(selectedTicket)} type="button">
                ورود به workspace پشتیبانی
              </button>
            ) : (
              <Pill tone="neutral">بدون انتخاب</Pill>
            )
          }
        >
          {detailLoading ? <div className="fm-message">در حال بارگذاری جزئیات تیکت...</div> : null}
          {detailError ? <div className="fm-message fm-message--danger">{detailError}</div> : null}
          {!detailLoading && !detailError && selectedSummary.length > 0 ? (
            <div className="support-detail-grid">
              {selectedSummary.map((item) => (
                <article className="support-detail-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          ) : null}
        </SectionCard>

        <SectionCard
          eyebrow="follow-up feed"
          title="فید پیگیری‌های عملیاتی"
          description="event feed این بخش باید برای escalationها، waiting states و follow-upهای پشتیبانی مرجع اصلی اپراتور باشد."
          actions={<Pill tone="warning">timeline</Pill>}
        >
          <ActivityFeed items={feed} />
        </SectionCard>
      </LoadableState>
    </div>
  )
}

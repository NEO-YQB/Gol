import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi } from '../lib/api'
import { formatFaNumber, makeRows, makeStats, readNestedCount, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type TicketRecord = Record<string, unknown>

const ticketColumns = [
  { key: 'id', label: 'تیکت' },
  { key: 'customer', label: 'مشتری' },
  { key: 'orderId', label: 'سفارش' },
  { key: 'status', label: 'وضعیت' },
  { key: 'reason', label: 'علت' },
]

function getTicketStatus(record: TicketRecord) {
  return readText(record, ['status'], 'UNKNOWN')
}

function getTicketReason(record: TicketRecord) {
  return readText(record, ['reason', 'title', 'topic'], '—')
}

function getTicketOrder(record: TicketRecord) {
  return readText(record, ['orderId'], '—')
}

function getCustomerText(record: TicketRecord) {
  return readText(record, ['customerName', 'customer', 'recipientName', 'userId'], '—')
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

function statusOptions(items: TicketRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getTicketStatus(item))))
  return ['ALL', ...unique]
}

export function SupportPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tickets, setTickets] = useState<TicketRecord[]>([])
  const [totals, setTotals] = useState<Record<string, unknown>>({})
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const payload = await vendorApi.getTicketsSummary(session)
        if (!active) return

        const payloadRecord = (payload as Record<string, unknown>) ?? {}
        const ticketList = toArray(payload)
        setTickets(ticketList)
        setTotals(((payloadRecord.totals as Record<string, unknown>) ?? {}))
        if (ticketList.length > 0) {
          setSelectedTicketId(readText(ticketList[0], ['id'], ''))
        }
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری تیکت‌های فروشنده')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [session])

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
        getCustomerText(item),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [tickets, search, statusFilter])

  useEffect(() => {
    if (filteredTickets.length === 0) {
      setSelectedTicketId(null)
      return
    }

    const hasSelected = filteredTickets.some((item) => readText(item, ['id'], '') === selectedTicketId)
    if (!hasSelected) {
      setSelectedTicketId(readText(filteredTickets[0], ['id'], ''))
    }
  }, [filteredTickets, selectedTicketId])

  const rows = useMemo(
    () =>
      makeRows(filteredTickets.slice(0, 20), [
        { key: 'id', source: ['id'] },
        { key: 'customer', source: ['customerName', 'customer', 'recipientName', 'userId'] },
        { key: 'orderId', source: ['orderId'] },
        { key: 'status', source: ['status'] },
        { key: 'reason', source: ['reason', 'title', 'topic'] },
      ]),
    [filteredTickets],
  )

  const stats = useMemo(
    () =>
      makeStats([
        {
          label: 'کل تیکت‌ها',
          value: formatFaNumber(tickets.length),
          delta: `${formatFaNumber(filteredTickets.length)} در view فعلی`,
          detail: 'نمای سریع از queue پشتیبانی فروشگاه',
          tone: 'primary',
        },
        {
          label: 'تیکت‌های باز',
          value: formatFaNumber(readNestedCount(totals, ['open'])),
          delta: 'نیازمند پاسخ',
          detail: 'درخواست‌هایی که هنوز بسته نشده‌اند',
          tone: 'warning',
        },
        {
          label: 'در حال بررسی',
          value: formatFaNumber(readNestedCount(totals, ['inReview'])),
          delta: `${formatFaNumber(readNestedCount(totals, ['escalatedToFinance']))} ارجاع مالی`,
          detail: 'تیکت‌هایی که در لایه بعدی بررسی هستند',
          tone: 'danger',
        },
        {
          label: 'وضعیت‌های فعال',
          value: formatFaNumber(statusOptions(tickets).length - 1),
          delta: statusFilter === 'ALL' ? 'همه وضعیت‌ها' : statusFilter,
          detail: 'پایه viewهای بعدی و filter chips',
          tone: 'success',
        },
      ]),
    [filteredTickets.length, statusFilter, tickets, totals],
  )

  const selectedTicket = useMemo(
    () => filteredTickets.find((item) => readText(item, ['id'], '') === selectedTicketId) ?? null,
    [filteredTickets, selectedTicketId],
  )

  const selectedSummary = selectedTicket
    ? [
        { label: 'شناسه تیکت', value: readText(selectedTicket, ['id'], '—') },
        { label: 'سفارش', value: getTicketOrder(selectedTicket) },
        { label: 'مشتری', value: getCustomerText(selectedTicket) },
        { label: 'وضعیت', value: getTicketStatus(selectedTicket) },
        { label: 'علت', value: getTicketReason(selectedTicket) },
        {
          label: 'تاریخ ثبت',
          value: formatJalaliDate(selectedTicket.createdAt ?? selectedTicket.updatedAt),
        },
      ]
    : []

  return (
    <div className="fm-stack">
      <LoadableState loading={loading} error={error}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="Vendor support"
          title="workspace تیکت‌های فروشگاه"
          description="این view برای فروشنده تیکت‌ها را فقط لیست نمی‌کند؛ بلکه search، filter و summary سریع برای پیگیری بهتر فراهم می‌کند."
          actions={<Pill tone="warning">support workspace v2</Pill>}
        >
          <div className="vendor-support-toolbar">
            <div className="fm-field vendor-support-search">
              <label htmlFor="vendor-support-search">جستجو</label>
              <input
                id="vendor-support-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="شناسه، سفارش، مشتری یا علت"
                value={search}
              />
            </div>

            <div className="vendor-support-filters">
              {statusOptions(tickets).map((status) => (
                <button
                  className={`vendor-support-filter-chip ${status === statusFilter ? 'is-active' : ''}`}
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  type="button"
                >
                  {status === 'ALL' ? 'همه' : status}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        <div className="vendor-support-layout">
          <SectionCard
            eyebrow="Tickets table"
            title="لیست تیکت‌های قابل پیگیری"
            description="فروشنده باید بتواند تیکت‌ها را اسکن کند و سریع روی مهم‌ترین مورد تمرکز بگیرد."
            actions={<Pill tone="success">{`${formatFaNumber(filteredTickets.length)} تیکت`}</Pill>}
          >
            <div className="vendor-support-table-card">
              <DataTable columns={ticketColumns} rows={rows} />

              <div className="vendor-support-selection-list">
                {filteredTickets.slice(0, 8).map((item) => {
                  const id = readText(item, ['id'], '—')
                  const isActive = id === selectedTicketId

                  return (
                    <button
                      className={`vendor-support-selection-item ${isActive ? 'is-active' : ''}`}
                      key={id}
                      onClick={() => setSelectedTicketId(id)}
                      type="button"
                    >
                      <strong>تیکت #{id}</strong>
                      <span>سفارش {getTicketOrder(item)}</span>
                      <small>
                        {getTicketStatus(item)} - {getTicketReason(item)}
                      </small>
                    </button>
                  )
                })}
              </div>
            </div>
          </SectionCard>

          <div className="vendor-support-detail-column">
            <SectionCard
              eyebrow="Selected ticket"
              title={selectedTicket ? `تیکت #${readText(selectedTicket, ['id'], '—')}` : 'تیکتی انتخاب نشده'}
              description="این summary پایه detail panel و پاسخ/پیگیری‌های بعدی فروشنده است."
              actions={<Pill tone="primary">{selectedTicket ? getTicketStatus(selectedTicket) : 'بدون انتخاب'}</Pill>}
            >
              {selectedSummary.length ? (
                <div className="vendor-support-detail-grid">
                  {selectedSummary.map((item) => (
                    <article className="vendor-support-detail-item" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                  <article className="vendor-support-detail-item vendor-support-detail-item--wide">
                    <span>یادداشت workspace</span>
                    <strong>
                      مرحله بعدی این صفحه می‌تواند note thread، پاسخ فروشنده و نمایش روشن‌تر outcomeهای مالی را روی همین structure سوار کند.
                    </strong>
                  </article>
                </div>
              ) : (
                <div className="vendor-note-card">در این فیلتر هنوز تیکتی برای نمایش جزئیات وجود ندارد.</div>
              )}
            </SectionCard>
          </div>
        </div>
      </LoadableState>
    </div>
  )
}

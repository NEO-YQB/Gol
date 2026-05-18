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

const ticketSelectionPageSize = 8

function getTicketStatusLabel(status: string) {
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
    case 'ALL':
      return 'همه'
    default:
      return status || 'نامشخص'
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
      return outcome || '—'
  }
}

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
  const [selectionPage, setSelectionPage] = useState(1)
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

  useEffect(() => {
    setSelectionPage(1)
  }, [search, statusFilter, tickets.length])

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

  const selectionPageCount = Math.max(1, Math.ceil(filteredTickets.length / ticketSelectionPageSize))
  const pagedSelection = filteredTickets.slice(
    (selectionPage - 1) * ticketSelectionPageSize,
    selectionPage * ticketSelectionPageSize,
  )

  const feed = useMemo(() => makeFeed(followUps, 'support follow-up'), [followUps])

  const stats = useMemo(
    () => [
      {
        label: 'کل تیکت‌ها',
        value: String(tickets.length),
        delta: `${filteredTickets.length} مورد در نمای فعلی`,
        detail: 'حجم کل صف پشتیبانی و نتیجه فیلتر فعلی',
        hint: 'این عدد نشان می‌دهد از کل تیکت‌ها، چند مورد با فیلترهای فعلی دیده می‌شوند.',
        tone: 'primary' as const,
      },
      {
        label: 'تیکت‌های باز',
        value: String(tickets.filter((item) => getTicketStatus(item) === 'OPEN').length),
        delta: 'نیازمند پاسخ اولیه',
        detail: 'صف اصلی برای شروع رسیدگی روزانه',
        hint: 'اگر این عدد بالا باشد، بهتر است اول از همین بخش شروع شود.',
        tone: 'warning' as const,
      },
      {
        label: 'ارجاع‌های مالی',
        value: String(tickets.filter((item) => getTicketStatus(item) === 'ESCALATED_TO_FINANCE').length),
        delta: 'نیازمند تصمیم مالی',
        detail: 'تیکت‌هایی که از پشتیبانی عادی عبور کرده‌اند',
        hint: 'این تیکت‌ها معمولا به بازگشت وجه، نگه‌داری مبلغ یا بررسی مالی نیاز دارند.',
        tone: 'danger' as const,
      },
      {
        label: 'پیگیری‌ها',
        value: String(followUps.length),
        delta: 'نکته‌های قابل پیگیری',
        detail: 'رخدادهایی که به پیگیری بعدی نیاز دارند',
        hint: 'برای مرور کارهای ناتمام و دنبال‌کردن نتیجه تیکت‌ها از این عدد استفاده می‌شود.',
        tone: 'success' as const,
      },
    ],
    [tickets, filteredTickets.length, followUps.length],
  )

  const selectedSummary = selectedTicket
    ? [
        { label: 'سفارش', value: getTicketOrder(selectedTicket) },
        { label: 'وضعیت', value: getTicketStatusLabel(getTicketStatus(selectedTicket)) },
        { label: 'علت', value: getTicketReason(selectedTicket) },
        { label: 'خروجی مالی', value: getFinanceOutcomeLabel(readText(selectedTicket, ['financeOutcome'], '—')) },
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
          eyebrow="کارتابل پشتیبانی"
          title="صف انتخاب و مرور تیکت‌های پشتیبانی"
          description="در این صفحه فقط تیکت را پیدا می‌کنی، خلاصه‌اش را می‌بینی و بعد برای اقدام کامل وارد میزکار جدا می‌شوی."
          hint="اول فیلتر و جستجو را تنظیم کن، بعد از فهرست کنار جدول تیکت مناسب را انتخاب کن."
          actions={<Pill tone="primary">انتخاب تیکت</Pill>}
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
                  {getTicketStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>

          <div className="support-table-card">
            <DataTable columns={ticketColumns} rows={ticketRows} />
            <div className="support-selection-list">
              {pagedSelection.map((item) => {
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
                      {getTicketStatusLabel(getTicketStatus(item))} / {getTicketReason(item)}
                    </small>
                  </button>
                )
              })}
            </div>
            {filteredTickets.length > ticketSelectionPageSize ? (
              <div className="vendors-pagination">
                <button
                  className="vendors-page-button"
                  disabled={selectionPage <= 1}
                  onClick={() => setSelectionPage((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  موردهای قبل
                </button>
                <span>{`صفحه ${selectionPage} از ${selectionPageCount}`}</span>
                <button
                  className="vendors-page-button"
                  disabled={selectionPage >= selectionPageCount}
                  onClick={() => setSelectionPage((current) => Math.min(selectionPageCount, current + 1))}
                  type="button"
                >
                  موردهای بعد
                </button>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="تیکت انتخاب‌شده"
          title={selectedTicketId ? `جزئیات تیکت #${selectedTicketId}` : 'هیچ تیکتی انتخاب نشده'}
          description="این بخش فقط برای جمع‌بندی سریع است و اقدام‌های اصلی در میزکار جدا انجام می‌شود تا این صفحه شلوغ نشود."
          hint="اگر این خلاصه برای تصمیم‌گیری کافی نبود، طبیعی است؛ دکمه ورود به میزکار برای همین مرحله بعدی است."
          actions={
            selectedTicket ? (
              <button className="support-open-workspace" onClick={() => onOpenSupportWorkspace(selectedTicket)} type="button">
                ورود به میزکار پشتیبانی
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
          eyebrow="فید پیگیری"
          title="فید پیگیری‌های عملیاتی"
          description="این فهرست کمک می‌کند پیگیری‌های مهم، انتظارها و ارجاع‌های حساس از قلم نیفتند."
          hint="اگر تیکتی نیاز به تماس دوباره، پاسخ فروشنده یا بررسی مالی داشته باشد، معمولا رد آن در این فید دیده می‌شود."
          actions={<Pill tone="warning">پیگیری روزانه</Pill>}
        >
          <ActivityFeed items={feed} />
        </SectionCard>
      </LoadableState>
    </div>
  )
}

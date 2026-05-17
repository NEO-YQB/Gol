import { DataTable, Pill, RichTextEditor, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi } from '../lib/api'
import { formatFaNumber, readNestedCount, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type TicketRecord = Record<string, unknown>

const ticketColumns = [
  { key: 'id', label: 'تیکت' },
  { key: 'customer', label: 'مشتری' },
  { key: 'orderId', label: 'سفارش' },
  { key: 'status', label: 'وضعیت' },
  { key: 'reason', label: 'علت' },
]

const statusTranslations: Record<string, string> = {
  OPEN: 'باز',
  IN_REVIEW: 'در حال بررسی',
  WAITING_CUSTOMER: 'منتظر مشتری',
  WAITING_VENDOR: 'منتظر فروشنده',
  ESCALATED_TO_FINANCE: 'ارجاع به مالی',
  RESOLVED: 'حل‌شده',
  REJECTED: 'ردشده',
  CANCELLED: 'لغوشده',
}

const reasonTranslations: Record<string, string> = {
  QUALITY_ISSUE: 'مشکل کیفیت',
  DAMAGED_FLOWERS: 'گل آسیب‌دیده',
  WRONG_ITEM: 'آیتم اشتباه',
  MISSING_ITEM: 'آیتم ناقص',
  LATE_DELIVERY: 'تاخیر در تحویل',
  NOT_DELIVERED: 'عدم تحویل',
  BILLING_ISSUE: 'مشکل مالی',
  OTHER: 'سایر',
}

const actorTranslations: Record<string, string> = {
  CUSTOMER: 'مشتری',
  VENDOR: 'فروشنده',
  ADMIN: 'ادمین',
  FINANCE: 'مالی',
  SYSTEM: 'سیستم',
}

const flagTranslations: Record<string, string> = {
  FOLLOW_UP_REQUIRED: 'نیازمند پیگیری',
  FINANCE_REVIEW_PENDING: 'در انتظار بررسی مالی',
}

function translateStatus(value: string) {
  return statusTranslations[value] ?? value
}

function translateReason(value: string) {
  return reasonTranslations[value] ?? value
}

function translateActor(value: string) {
  return actorTranslations[value] ?? value
}

function translateFlag(value: string) {
  return flagTranslations[value] ?? value
}

function getTicketStatus(record: TicketRecord) {
  return readText(record, ['status'], 'UNKNOWN')
}

function getTicketReason(record: TicketRecord) {
  return readText(record, ['reason', 'title', 'topic'], '—')
}

function getTicketOrder(record: TicketRecord) {
  return readText(record, ['orderId'], readText((record.order as TicketRecord) ?? {}, ['id'], '—'))
}

function getCustomerText(record: TicketRecord) {
  const customer = typeof record.customer === 'object' && record.customer !== null ? (record.customer as TicketRecord) : null
  if (customer) {
    return readText(customer, ['fullName', 'phoneNumber', 'id'], '—')
  }

  return readText(record, ['customerName', 'customer', 'recipientName', 'userId'], '—')
}

function formatJalaliDateTime(value: unknown) {
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

function statusOptions(items: TicketRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getTicketStatus(item))))
  return ['ALL', ...unique]
}

export function SupportPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [savingReply, setSavingReply] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [tickets, setTickets] = useState<TicketRecord[]>([])
  const [totals, setTotals] = useState<Record<string, unknown>>({})
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null)
  const [replyMessage, setReplyMessage] = useState('')

  async function loadTickets(active = { current: true }) {
    const payload = await vendorApi.getTicketsSummary(session)
    if (!active.current) return

    const payloadRecord = (payload as Record<string, unknown>) ?? {}
    const baseTickets = toArray(payload)
    const enrichedTickets = await Promise.all(
      baseTickets.map(async (ticket) => {
        const ticketId = Number(readText(ticket, ['id'], '0'))
        if (!ticketId) return ticket

        try {
          const detail = (await vendorApi.getSupportTicket(session, ticketId)) as TicketRecord
          return { ...ticket, ...detail }
        } catch {
          return ticket
        }
      }),
    )
    if (!active.current) return

    const ticketList = enrichedTickets
    setTickets(ticketList)
    setTotals(((payloadRecord.totals as Record<string, unknown>) ?? {}))
    if (ticketList.length > 0) {
      setSelectedTicketId((current) => current ?? readText(ticketList[0], ['id'], ''))
    }
  }

  useEffect(() => {
    const active = { current: true }

    async function load() {
      setLoading(true)
      setError(null)

      try {
        await loadTickets(active)
      } catch (loadError) {
        if (!active.current) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری تیکت‌های فروشنده')
      } finally {
        if (active.current) setLoading(false)
      }
    }

    void load()
    return () => {
      active.current = false
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
        translateStatus(getTicketStatus(item)),
        translateReason(getTicketReason(item)),
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

  useEffect(() => {
    if (!editorOpen || !selectedTicketId) return
    let active = true

    async function loadDetail() {
      setDetailLoading(true)
      setDetailError(null)

      try {
        const payload = await vendorApi.getSupportTicket(session, Number(selectedTicketId))
        if (!active) return
        setSelectedTicket((payload as TicketRecord) ?? null)
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
  }, [editorOpen, selectedTicketId, session])

  const rows = useMemo(
    () =>
      filteredTickets.slice(0, 20).map((item, index) => ({
        id: readText(item, ['id'], String(index + 1)),
        customer: getCustomerText(item),
        orderId: getTicketOrder(item),
        status: translateStatus(getTicketStatus(item)),
        reason: translateReason(getTicketReason(item)),
      })),
    [filteredTickets],
  )

  const stats = useMemo(
    () => [
      {
        label: 'کل تیکت‌ها',
        value: formatFaNumber(tickets.length),
        delta: `${formatFaNumber(filteredTickets.length)} در view فعلی`,
        detail: 'نمای سریع از صف پشتیبانی فروشگاه',
        tone: 'primary' as const,
      },
      {
        label: 'تیکت‌های باز',
        value: formatFaNumber(readNestedCount(totals, ['open'])),
        delta: 'نیازمند پاسخ',
        detail: 'درخواست‌هایی که هنوز بسته نشده‌اند',
        tone: 'warning' as const,
      },
      {
        label: 'در حال بررسی',
        value: formatFaNumber(readNestedCount(totals, ['inReview'])),
        delta: `${formatFaNumber(readNestedCount(totals, ['escalatedToFinance']))} ارجاع مالی`,
        detail: 'تیکت‌هایی که در لایه بعدی بررسی هستند',
        tone: 'danger' as const,
      },
      {
        label: 'وضعیت‌های فعال',
        value: formatFaNumber(statusOptions(tickets).length - 1),
        delta: statusFilter === 'ALL' ? 'همه وضعیت‌ها' : translateStatus(statusFilter),
        detail: 'برای ساخت viewهای پیگیری و پاسخ',
        tone: 'success' as const,
      },
    ],
    [filteredTickets.length, statusFilter, tickets, totals],
  )

  const selectedSummaryTicket = useMemo(
    () => filteredTickets.find((item) => readText(item, ['id'], '') === selectedTicketId) ?? null,
    [filteredTickets, selectedTicketId],
  )

  const selectedSummary = selectedSummaryTicket
    ? [
        { label: 'شناسه تیکت', value: readText(selectedSummaryTicket, ['id'], '—') },
        { label: 'سفارش', value: getTicketOrder(selectedSummaryTicket) },
        { label: 'مشتری', value: getCustomerText(selectedSummaryTicket) },
        { label: 'وضعیت', value: translateStatus(getTicketStatus(selectedSummaryTicket)) },
        { label: 'علت', value: translateReason(getTicketReason(selectedSummaryTicket)) },
        { label: 'تاریخ ثبت', value: formatJalaliDateTime(selectedSummaryTicket.createdAt ?? selectedSummaryTicket.updatedAt) },
      ]
    : []

  const detailTimeline = useMemo(() => {
    if (!selectedTicket) return []
    return toArray(selectedTicket.timeline).map((item) => {
      const actorType = readText(item, ['actorType'], 'SYSTEM')
      return {
        id: readText(item, ['id'], Math.random().toString()),
        actor: translateActor(actorType),
        actorTone: actorType,
        message: readText(item, ['message'], '—'),
        createdAt: formatJalaliDateTime(item.createdAt),
        isInternal: Boolean(item.isInternal),
      }
    })
  }, [selectedTicket])

  function openTicketWorkspace() {
    if (!selectedTicketId) return
    setEditorOpen(true)
    setReplyMessage('')
    setFormError(null)
    setFormMessage(null)
  }

  function closeTicketWorkspace() {
    setEditorOpen(false)
    setSelectedTicket(null)
    setDetailError(null)
    setReplyMessage('')
    setFormError(null)
    setFormMessage(null)
  }

  async function handleReplySubmit() {
    if (!selectedTicketId || !replyMessage.trim()) {
      setFormError('برای ارسال پاسخ، متن پیام الزامی است.')
      return
    }

    setSavingReply(true)
    setFormError(null)
    setFormMessage(null)

    try {
      await vendorApi.addSupportTicketNote(session, Number(selectedTicketId), {
        message: replyMessage.trim().replace(/<[^>]+>/g, ' ').trim(),
      })
      const payload = await vendorApi.getSupportTicket(session, Number(selectedTicketId))
      setSelectedTicket((payload as TicketRecord) ?? null)
      setReplyMessage('')
      setFormMessage('پاسخ فروشنده با موفقیت ثبت شد.')
      await loadTickets({ current: true })
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'ارسال پاسخ ناموفق بود')
    } finally {
      setSavingReply(false)
    }
  }

  return (
    <div className="fm-stack">
      <LoadableState loading={loading} error={error}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="کارتابل پشتیبانی"
          title="صف تیکت‌ها و پیگیری‌های فروشگاه"
          description="در این view فروشنده تیکت‌ها را غربال می‌کند، context سریع می‌گیرد و بعد برای پاسخ یا پیگیری کامل وارد workspace جدا می‌شود."
          actions={<Pill tone="warning">پشتیبانی v3</Pill>}
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
                  {status === 'ALL' ? 'همه' : translateStatus(status)}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {!editorOpen ? (
          <div className="vendor-products-workspace-grid">
            <SectionCard
              eyebrow="جدول تیکت‌ها"
              title="لیست تیکت‌های قابل پیگیری"
              description="فروشنده باید سریع بفهمد کدام تیکت نیاز به پاسخ، کدام‌یک نیاز به توضیح بیشتر و کدام مورد نیازمند پیگیری مالی است."
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
                          {translateStatus(getTicketStatus(item))} - {translateReason(getTicketReason(item))}
                        </small>
                      </button>
                    )
                  })}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="تیکت انتخاب‌شده"
              title={selectedSummaryTicket ? `تیکت #${readText(selectedSummaryTicket, ['id'], '—')}` : 'تیکتی انتخاب نشده'}
              description="این summary فقط quick context می‌دهد؛ پاسخ، thread و پیگیری کامل در workspace جدا انجام می‌شود."
              actions={
                <div className="vendor-products-actions">
                  <Pill tone="primary">{selectedSummaryTicket ? translateStatus(getTicketStatus(selectedSummaryTicket)) : 'بدون انتخاب'}</Pill>
                  <button className="fm-button fm-button--secondary" disabled={!selectedSummaryTicket} onClick={openTicketWorkspace} type="button">
                    باز کردن کارتابل تیکت
                  </button>
                </div>
              }
            >
              {selectedSummary.length ? (
                <div className="vendor-products-summary-grid">
                  {selectedSummary.map((item) => (
                    <article className="vendor-products-summary-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="vendor-note-card">در این فیلتر هنوز تیکتی برای نمایش جزئیات وجود ندارد.</div>
              )}
            </SectionCard>
          </div>
        ) : null}

        {editorOpen ? (
          <SectionCard
            eyebrow="workspace تیکت"
            title={selectedTicket ? `پیگیری تیکت #${readText(selectedTicket, ['id'], '—')}` : 'در حال بارگذاری تیکت'}
            description="این workspace برای دیدن timeline، context سفارش، flagهای عملیاتی و ثبت پاسخ فروشنده ساخته شده تا support domain هم مثل products و store profile منظم و focused بماند."
            actions={
              <div className="vendor-products-actions">
                <button className="fm-button fm-button--ghost" onClick={closeTicketWorkspace} type="button">
                  بازگشت به لیست
                </button>
                <Pill tone="warning">{selectedTicket ? translateStatus(readText(selectedTicket, ['status'], 'UNKNOWN')) : 'در حال بارگذاری'}</Pill>
              </div>
            }
          >
            <LoadableState loading={detailLoading} error={detailError}>
              {selectedTicket ? (
                <div className="vendor-product-editor-shell">
                  <section className="vendor-product-editor-main">
                    <div className="vendor-product-editor-grid">
                      <article className="vendor-product-editor-panel">
                        <div className="vendor-product-editor-panel-head">
                          <strong>هویت تیکت و سفارش</strong>
                          <span>شناسه‌ها، طرفین گفتگو و وضعیت جاری برای تصمیم سریع‌تر</span>
                        </div>

                        <div className="vendor-products-summary-grid">
                          <article className="vendor-products-summary-card">
                            <span>شناسه تیکت</span>
                            <strong>{readText(selectedTicket, ['id'], '—')}</strong>
                          </article>
                          <article className="vendor-products-summary-card">
                            <span>شناسه سفارش</span>
                            <strong>{getTicketOrder(selectedTicket)}</strong>
                          </article>
                          <article className="vendor-products-summary-card">
                            <span>وضعیت</span>
                            <strong>{translateStatus(readText(selectedTicket, ['status'], 'UNKNOWN'))}</strong>
                          </article>
                          <article className="vendor-products-summary-card">
                            <span>علت</span>
                            <strong>{translateReason(readText(selectedTicket, ['reason'], '—'))}</strong>
                          </article>
                          <article className="vendor-products-summary-card">
                            <span>مشتری</span>
                            <strong>{getCustomerText(selectedTicket)}</strong>
                          </article>
                          <article className="vendor-products-summary-card">
                            <span>ثبت‌شده در</span>
                            <strong>{formatJalaliDateTime(selectedTicket.createdAt)}</strong>
                          </article>
                        </div>
                      </article>

                      <article className="vendor-product-editor-panel vendor-product-editor-panel--full">
                        <div className="vendor-product-editor-panel-head">
                          <strong>شرح تیکت</strong>
                          <span>عنوان، توضیح مشتری و summary اولیه برای پاسخ دقیق‌تر</span>
                        </div>

                        <div className="vendor-support-issue-grid">
                          <article className="vendor-support-issue-card">
                            <span>عنوان</span>
                            <strong>{readText(selectedTicket, ['title'], '—')}</strong>
                          </article>
                          <article className="vendor-support-issue-card vendor-support-issue-card--wide">
                            <span>توضیح مشتری</span>
                            <strong>{readText(selectedTicket, ['description'], '—')}</strong>
                          </article>
                        </div>
                      </article>

                      <article className="vendor-product-editor-panel vendor-product-editor-panel--full">
                        <div className="vendor-product-editor-panel-head">
                          <strong>timeline گفتگو و noteها</strong>
                          <span>همه noteها با ترجمه actor و علامت‌گذاری internal/public</span>
                        </div>

                        {detailTimeline.length ? (
                          <div className="vendor-support-thread">
                            {detailTimeline.map((item) => (
                              <article className="vendor-support-thread-item" key={item.id}>
                                <div className="vendor-support-thread-head">
                                  <div className="vendor-products-actions">
                                    <Pill tone={item.isInternal ? 'danger' : 'primary'}>{item.isInternal ? 'یادداشت داخلی' : 'پیام قابل‌نمایش'}</Pill>
                                    <Pill tone="neutral">{item.actor}</Pill>
                                  </div>
                                  <span>{item.createdAt}</span>
                                </div>
                                <p>{item.message}</p>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <div className="vendor-note-card">هنوز thread یا note معناداری برای این تیکت ثبت نشده است.</div>
                        )}
                      </article>

                      <article className="vendor-product-editor-panel vendor-product-editor-panel--full">
                        <div className="vendor-product-editor-panel-head">
                          <strong>پاسخ فروشنده</strong>
                          <span>پاسخ شفاف، انسانی و قابل‌پیگیری ثبت کن تا تیم بعدی context کامل داشته باشد.</span>
                        </div>

                        <div className="fm-field">
                          <label htmlFor="vendor-ticket-reply">متن پاسخ</label>
                          <RichTextEditor
                            id="vendor-ticket-reply"
                            value={replyMessage}
                            onChange={setReplyMessage}
                            placeholder="پاسخ فروشنده، توضیح پیگیری انجام‌شده، درخواست اطلاعات بیشتر یا جمع‌بندی وضعیت را اینجا بنویس"
                            rows={8}
                          />
                        </div>
                      </article>
                    </div>

                    <div className="vendor-product-editor-footer">
                      <article className="vendor-product-editor-sidecard">
                        <strong>پرچم‌های عملیاتی</strong>
                        {Array.isArray(selectedTicket.latestOperationalFlags) && selectedTicket.latestOperationalFlags.length ? (
                          <div className="vendor-store-pill-row">
                            {selectedTicket.latestOperationalFlags.map((flag, index) => (
                              <Pill key={`${String(flag)}-${index}`} tone="warning">
                                {translateFlag(String(flag))}
                              </Pill>
                            ))}
                          </div>
                        ) : (
                          <p>در حال حاضر flag فعال خاصی روی این تیکت وجود ندارد.</p>
                        )}
                      </article>

                      <article className="vendor-product-editor-sidecard">
                        <strong>راهنمای پاسخ‌دهی</strong>
                        <p>
                          از enumهای خام استفاده نکن؛ وضعیت و علت را برای تیم خودت با ترجمه فارسی ببین و در پاسخ هم از متن دقیق، کوتاه و قابل‌پیگیری استفاده کن. اگر موضوع مالی است، صرفاً context کامل بده و outcome را promise نکن.
                        </p>
                      </article>
                    </div>

                    <div className="vendor-products-actions">
                      <button className="fm-button fm-button--primary" disabled={savingReply} onClick={handleReplySubmit} type="button">
                        {savingReply ? 'در حال ثبت پاسخ...' : 'ثبت پاسخ فروشنده'}
                      </button>
                    </div>

                    {formMessage ? <div className="fm-message fm-message--success">{formMessage}</div> : null}
                    {formError ? <div className="fm-message fm-message--danger">{formError}</div> : null}
                  </section>
                </div>
              ) : null}
            </LoadableState>
          </SectionCard>
        ) : null}
      </LoadableState>
    </div>
  )
}

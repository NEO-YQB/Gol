import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi } from '../lib/api'
import { formatFaNumber, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type WalletRecord = Record<string, unknown>

const transactionColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'type', label: 'نوع' },
  { key: 'direction', label: 'جهت' },
  { key: 'amount', label: 'مبلغ' },
  { key: 'createdAt', label: 'زمان' },
]

const settlementColumns = [
  { key: 'id', label: 'سفارش' },
  { key: 'settlementStatus', label: 'وضعیت تسویه' },
  { key: 'vendorShareAmount', label: 'سهم فروشنده' },
  { key: 'updatedAt', label: 'آخرین بروزرسانی' },
]

const directionTranslations: Record<string, string> = {
  CREDIT: 'ورودی',
  DEBIT: 'خروجی',
}

const transactionTypeTranslations: Record<string, string> = {
  ORDER_PAYMENT: 'پرداخت سفارش',
  SETTLEMENT_RELEASE: 'آزادسازی تسویه',
  SETTLEMENT_REVERSAL: 'برگشت تسویه',
  REFUND_REVERSAL: 'برگشت بازپرداخت',
  MANUAL_ADJUSTMENT: 'اصلاح دستی',
  COMMISSION_DEDUCTION: 'کسر کمیسیون',
  PENALTY: 'جریمه',
  BONUS: 'پاداش',
  UNKNOWN: 'نامشخص',
}

const settlementStatusTranslations: Record<string, string> = {
  PENDING: 'در انتظار',
  ELIGIBLE: 'آماده آزادسازی',
  PROCESSING: 'در حال پردازش',
  SETTLED: 'تسویه‌شده',
  ON_HOLD: 'روی هولد',
  REVERSED: 'برگشتی',
}

function translateDirection(value: string) {
  return directionTranslations[value] ?? value
}

function translateTransactionType(value: string) {
  return transactionTypeTranslations[value] ?? value
}

function translateSettlementStatus(value: string) {
  return settlementStatusTranslations[value] ?? value
}

function getTransactionDirection(record: WalletRecord) {
  return readText(record, ['direction'], 'UNKNOWN')
}

function getTransactionType(record: WalletRecord) {
  return readText(record, ['type'], 'UNKNOWN')
}

function getSettlementStatus(record: WalletRecord) {
  return readText(record, ['settlementStatus', 'status'], 'UNKNOWN')
}

function formatAmount(value: unknown) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return '—'
  return `${formatFaNumber(numeric)} تومان`
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

function directionOptions(items: WalletRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getTransactionDirection(item))))
  return ['ALL', ...unique]
}

function settlementStatusOptions(items: WalletRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getSettlementStatus(item))))
  return ['ALL', ...unique]
}

export function WalletPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<WalletRecord[]>([])
  const [settlements, setSettlements] = useState<WalletRecord[]>([])
  const [walletMeta, setWalletMeta] = useState<WalletRecord>({})
  const [settlementMeta, setSettlementMeta] = useState<WalletRecord>({})
  const [activityMeta, setActivityMeta] = useState<WalletRecord>({})
  const [transactionDirectionFilter, setTransactionDirectionFilter] = useState('ALL')
  const [settlementStatusFilter, setSettlementStatusFilter] = useState('ALL')
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [wallet, settlementSummary] = await Promise.all([
          vendorApi.getWalletSummary(session),
          vendorApi.getSettlementsSummary(session),
        ])
        if (!active) return

        const walletRecord = (wallet as Record<string, unknown>) ?? {}
        const settlementRecord = (settlementSummary as Record<string, unknown>) ?? {}
        const walletData = (walletRecord.wallet as Record<string, unknown>) ?? {}
        const activity = (walletRecord.activity as Record<string, unknown>) ?? {}
        const amounts = (settlementRecord.amounts as Record<string, unknown>) ?? {}
        const counts = (settlementRecord.counts as Record<string, unknown>) ?? {}
        const transactionList = toArray(walletRecord.recentTransactions)
        const settlementList = toArray(settlementRecord.recentOrders)

        setWalletMeta(walletData)
        setActivityMeta(activity)
        setSettlementMeta({ ...amounts, ...counts })
        setTransactions(transactionList)
        setSettlements(settlementList)
        if (settlementList.length > 0) {
          setSelectedSettlementId((current) => current ?? readText(settlementList[0], ['id'], ''))
        }
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری کیف پول و تسویه')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [session])

  const filteredTransactions = useMemo(
    () => transactions.filter((item) => (transactionDirectionFilter === 'ALL' ? true : getTransactionDirection(item) === transactionDirectionFilter)),
    [transactionDirectionFilter, transactions],
  )

  const filteredSettlements = useMemo(
    () => settlements.filter((item) => (settlementStatusFilter === 'ALL' ? true : getSettlementStatus(item) === settlementStatusFilter)),
    [settlementStatusFilter, settlements],
  )

  useEffect(() => {
    if (filteredSettlements.length === 0) {
      setSelectedSettlementId(null)
      return
    }

    const hasSelected = filteredSettlements.some((item) => readText(item, ['id'], '') === selectedSettlementId)
    if (!hasSelected) {
      setSelectedSettlementId(readText(filteredSettlements[0], ['id'], ''))
    }
  }, [filteredSettlements, selectedSettlementId])

  const stats = useMemo(
    () => [
      {
        label: 'موجودی فعلی',
        value: formatAmount(walletMeta.currentBalance),
        delta: `${formatAmount(walletMeta.availableBalance)} قابل برداشت`,
        detail: 'خروجی مستقیم کیف پول فروشگاه',
        tone: 'primary' as const,
      },
      {
        label: 'موجودی نگه‌داری‌شده',
        value: formatAmount(walletMeta.heldBalance),
        delta: `${formatAmount(activityMeta.debitAmount)} خروجی`,
        detail: 'بخشی از پولی که هنوز آزاد نشده است',
        tone: 'warning' as const,
      },
      {
        label: 'جمع آزادشده',
        value: formatAmount(settlementMeta.releasedTotal),
        delta: `${formatAmount(settlementMeta.reversedTotal)} برگشتی`,
        detail: 'آزادسازی‌ها و reversalهای ثبت‌شده',
        tone: 'success' as const,
      },
      {
        label: 'برآورد قابل release',
        value: formatAmount(settlementMeta.releasableEstimate),
        delta: `${formatFaNumber(Number(activityMeta.transactionCount ?? 0))} تراکنش در بازه`,
        detail: 'برآوردی برای دید مالی سریع فروشنده',
        tone: 'danger' as const,
      },
    ],
    [activityMeta, settlementMeta, walletMeta],
  )

  const transactionRows = useMemo(
    () =>
      filteredTransactions.slice(0, 12).map((item, index) => ({
        id: readText(item, ['id', 'referenceId'], String(index + 1)),
        type: translateTransactionType(getTransactionType(item)),
        direction: translateDirection(getTransactionDirection(item)),
        amount: formatAmount(item.amount),
        createdAt: formatJalaliDateTime(item.createdAt),
      })),
    [filteredTransactions],
  )

  const settlementRows = useMemo(
    () =>
      filteredSettlements.slice(0, 12).map((item, index) => ({
        id: readText(item, ['id'], String(index + 1)),
        settlementStatus: translateSettlementStatus(getSettlementStatus(item)),
        vendorShareAmount: formatAmount(item.vendorShareAmount),
        updatedAt: formatJalaliDateTime(item.updatedAt ?? item.createdAt),
      })),
    [filteredSettlements],
  )

  const selectedSettlement = useMemo(
    () => filteredSettlements.find((item) => readText(item, ['id'], '') === selectedSettlementId) ?? null,
    [filteredSettlements, selectedSettlementId],
  )

  const selectedSettlementSummary = selectedSettlement
    ? [
        { label: 'شناسه سفارش', value: readText(selectedSettlement, ['id'], '—') },
        { label: 'وضعیت تسویه', value: translateSettlementStatus(getSettlementStatus(selectedSettlement)) },
        { label: 'سهم فروشنده', value: formatAmount(selectedSettlement.vendorShareAmount) },
        { label: 'مبلغ آزادشده', value: formatAmount(selectedSettlement.settlementReleasedAmount) },
        { label: 'مبلغ برگشتی', value: formatAmount(selectedSettlement.settlementReversedAmount) },
        { label: 'زمان واجد شرایط شدن', value: formatJalaliDateTime(selectedSettlement.settlementEligibleAt) },
        { label: 'آخرین بروزرسانی', value: formatJalaliDateTime(selectedSettlement.updatedAt) },
      ]
    : []

  const financeThread = useMemo(
    () =>
      filteredTransactions.map((item) => ({
        id: readText(item, ['id'], ''),
        title: translateTransactionType(getTransactionType(item)),
        direction: translateDirection(getTransactionDirection(item)),
        amount: formatAmount(item.amount),
        createdAt: formatJalaliDateTime(item.createdAt),
        description: readText(item, ['description', 'title'], 'بدون توضیح تکمیلی'),
        orderId: readText(item, ['orderId'], ''),
      })),
    [filteredTransactions],
  )

  const settlementSummaryCards = useMemo(
    () => [
      { label: 'در انتظار', value: formatFaNumber(Number(settlementMeta.pending ?? 0)) },
      { label: 'آماده آزادسازی', value: formatFaNumber(Number(settlementMeta.eligible ?? 0)) },
      { label: 'در پردازش', value: formatFaNumber(Number(settlementMeta.processing ?? 0)) },
      { label: 'روی هولد', value: formatFaNumber(Number(settlementMeta.onHold ?? 0)) },
      { label: 'تسویه‌شده', value: formatFaNumber(Number(settlementMeta.settled ?? 0)) },
      { label: 'برگشتی', value: formatFaNumber(Number(settlementMeta.reversed ?? 0)) },
    ],
    [settlementMeta],
  )

  function openWorkspace() {
    if (!selectedSettlementId) return
    setWorkspaceOpen(true)
  }

  function closeWorkspace() {
    setWorkspaceOpen(false)
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
          eyebrow="کارتابل مالی"
          title="کیف پول، تسویه و drill-down مالی فروشگاه"
          description="این صفحه حالا لیست و snapshot مالی را از workspace detail جدا می‌کند تا فروشنده بدون شلوغی، هم وضعیت پول را اسکن کند و هم برای هر سفارش context عمیق‌تر بگیرد."
          actions={<Pill tone="success">مالی v3</Pill>}
        >
          <div className="vendor-wallet-note">
            {formatAmount(walletMeta.availableBalance)} قابل برداشت، {formatAmount(walletMeta.heldBalance)} نگه‌داری‌شده و {formatAmount(activityMeta.creditAmount)} ورودی در بازه فعلی ثبت شده است.
          </div>
        </SectionCard>

        {!workspaceOpen ? (
          <div className="vendor-products-workspace-grid">
            <SectionCard
              eyebrow="فعالیت کیف پول"
              title="تراکنش‌های اخیر کیف پول"
              description="نوع و جهت هر تراکنش باید برای فروشنده کاملاً ترجمه‌شده و قابل اسکن باشد تا سریع منشاء پول را بفهمد."
              actions={<Pill tone="primary">{`${formatFaNumber(filteredTransactions.length)} تراکنش`}</Pill>}
            >
              <div className="vendor-wallet-table-card">
                <div className="vendor-wallet-filters">
                  {directionOptions(transactions).map((direction) => (
                    <button
                      className={`vendor-wallet-filter-chip ${direction === transactionDirectionFilter ? 'is-active' : ''}`}
                      key={direction}
                      onClick={() => setTransactionDirectionFilter(direction)}
                      type="button"
                    >
                      {direction === 'ALL' ? 'همه جهت‌ها' : translateDirection(direction)}
                    </button>
                  ))}
                </div>

                <DataTable columns={transactionColumns} rows={transactionRows} />
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="صف تسویه‌ها"
              title="تسویه‌های قابل پیگیری"
              description="این view فقط صف تسویه و context کوتاه می‌دهد؛ detail-first workspace پایین‌تر برای drill-down مالی استفاده می‌شود."
              actions={
                <div className="vendor-products-actions">
                  <Pill tone="warning">{`${formatFaNumber(filteredSettlements.length)} تسویه`}</Pill>
                  <button className="fm-button fm-button--secondary" disabled={!selectedSettlement} onClick={openWorkspace} type="button">
                    باز کردن کارتابل مالی
                  </button>
                </div>
              }
            >
              <div className="vendor-wallet-filters">
                {settlementStatusOptions(settlements).map((status) => (
                  <button
                    className={`vendor-wallet-filter-chip ${status === settlementStatusFilter ? 'is-active' : ''}`}
                    key={status}
                    onClick={() => setSettlementStatusFilter(status)}
                    type="button"
                  >
                    {status === 'ALL' ? 'همه وضعیت‌ها' : translateSettlementStatus(status)}
                  </button>
                ))}
              </div>

              <DataTable columns={settlementColumns} rows={settlementRows} />

              <div className="vendor-wallet-selection-list">
                {filteredSettlements.slice(0, 8).map((item) => {
                  const id = readText(item, ['id'], '—')
                  const isActive = id === selectedSettlementId

                  return (
                    <button
                      className={`vendor-wallet-selection-item ${isActive ? 'is-active' : ''}`}
                      key={id}
                      onClick={() => setSelectedSettlementId(id)}
                      type="button"
                    >
                      <strong>سفارش #{id}</strong>
                      <span>{translateSettlementStatus(getSettlementStatus(item))}</span>
                      <small>{formatAmount(item.vendorShareAmount)} سهم فروشنده</small>
                    </button>
                  )
                })}
              </div>
            </SectionCard>
          </div>
        ) : null}

        {workspaceOpen ? (
          <SectionCard
            eyebrow="workspace مالی"
            title={selectedSettlement ? `جمع‌بندی سفارش #${readText(selectedSettlement, ['id'], '—')}` : 'کارتابل مالی'}
            description="این workspace برای توضیح وضعیت تسویه، ledger context و thread مالی سفارش انتخاب‌شده ساخته شده تا domain مالی هم detail-first و translation-first باشد."
            actions={
              <div className="vendor-products-actions">
                <button className="fm-button fm-button--ghost" onClick={closeWorkspace} type="button">
                  بازگشت به لیست
                </button>
                <Pill tone="danger">{selectedSettlement ? translateSettlementStatus(getSettlementStatus(selectedSettlement)) : 'بدون انتخاب'}</Pill>
              </div>
            }
          >
            <div className="vendor-product-editor-shell">
              <section className="vendor-product-editor-main">
                <div className="vendor-product-editor-grid">
                  <article className="vendor-product-editor-panel">
                    <div className="vendor-product-editor-panel-head">
                      <strong>خلاصه سفارش و تسویه</strong>
                      <span>وضعیت تسویه، مبلغ‌ها و eligibility برای تصمیم سریع‌تر</span>
                    </div>

                    {selectedSettlementSummary.length ? (
                      <div className="vendor-products-summary-grid">
                        {selectedSettlementSummary.map((item) => (
                          <article className="vendor-products-summary-card" key={item.label}>
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="vendor-note-card">در این فیلتر هنوز تسویه‌ای برای نمایش جزئیات وجود ندارد.</div>
                    )}
                  </article>

                  <article className="vendor-product-editor-panel vendor-product-editor-panel--full">
                    <div className="vendor-product-editor-panel-head">
                      <strong>ledger و thread مالی</strong>
                      <span>تراکنش‌ها به‌صورت ترجمه‌شده، با جهت روشن و context زمانی دیده می‌شوند.</span>
                    </div>

                    {financeThread.length ? (
                      <div className="vendor-wallet-thread">
                        {financeThread.map((item) => (
                          <article className="vendor-wallet-thread-item" key={item.id}>
                            <div className="vendor-wallet-thread-head">
                              <div className="vendor-products-actions">
                                <Pill tone={item.direction === 'ورودی' ? 'success' : 'warning'}>{item.direction}</Pill>
                                <Pill tone="neutral">{item.title}</Pill>
                                {item.orderId ? <Pill tone="primary">سفارش #{item.orderId}</Pill> : null}
                              </div>
                              <span>{item.createdAt}</span>
                            </div>
                            <strong>{item.amount}</strong>
                            <p>{item.description}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="vendor-note-card">در این بازه هنوز تراکنش معناداری برای نمایش thread مالی وجود ندارد.</div>
                    )}
                  </article>
                </div>

                <div className="vendor-product-editor-footer">
                  <article className="vendor-product-editor-sidecard">
                    <strong>وضعیت‌های صف تسویه</strong>
                    <div className="vendor-products-summary-grid">
                      {settlementSummaryCards.map((item) => (
                        <article className="vendor-products-summary-card" key={item.label}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </article>
                      ))}
                    </div>
                  </article>

                  <article className="vendor-product-editor-sidecard">
                    <strong>راهنمای فهم وضعیت‌ها</strong>
                    <p>
                      `آماده آزادسازی` یعنی سفارش از نظر زمانی به release نزدیک شده، `روی هولد` یعنی هنوز به دلیل عملیاتی یا پشتیبانی بلوکه است و `برگشتی` یعنی بخشی از سهم فروشنده reverse شده است. همه enumها در این صفحه ترجمه شده‌اند تا تصمیم‌گیری مالی واضح‌تر باشد.
                    </p>
                  </article>
                </div>
              </section>
            </div>
          </SectionCard>
        ) : null}
      </LoadableState>
    </div>
  )
}

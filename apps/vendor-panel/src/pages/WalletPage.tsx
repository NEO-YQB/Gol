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
  SETTLEMENT_PAYOUT: 'درخواست تسویه حساب (واریز)',
  ORDER_EARNING: 'درآمد سفارش (هولد)',
  ORDER_RELEASE: 'آزادسازی خودکار درآمد',
  ORDER_REVERSAL: 'برگشت مالی سفارش',
  MANUAL_CREDIT: 'شارژ / عودت مالی',
  MANUAL_DEBIT: 'برداشت دستی',
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
  const [payoutModalOpen, setPayoutModalOpen] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [bankAccountInfo, setBankAccountInfo] = useState('')
  const [payoutNotes, setPayoutNotes] = useState('')
  const [payoutSubmitting, setPayoutSubmitting] = useState(false)
  const [payoutMessage, setPayoutMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadWallet = async () => {
    setLoading(true)
    setError(null)

    try {
      const [wallet, settlementSummary] = await Promise.all([
        vendorApi.getWalletSummary(session),
        vendorApi.getSettlementsSummary(session),
      ])

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
      setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری کیف پول و تسویه')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadWallet()
  }, [session])

  async function handleSubmitPayout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = Number(payoutAmount)
    const available = Number(walletMeta.availableBalance ?? 0)

    if (Number.isNaN(amount) || amount <= 0) {
      setPayoutMessage({ type: 'error', text: 'لطفاً مبلغ معتبری برای تسویه وارد کنید.' })
      return
    }

    if (amount > available) {
      setPayoutMessage({
        type: 'error',
        text: `مبلغ درخواستی نمی‌تواند بیشتر از موجودی قابل برداشت (${formatAmount(available)}) باشد.`,
      })
      return
    }

    setPayoutSubmitting(true)
    setPayoutMessage(null)

    try {
      await vendorApi.requestSettlementPayout(session, {
        amount,
        bankAccountInfo: bankAccountInfo.trim() || undefined,
        notes: payoutNotes.trim() || undefined,
      })
      setPayoutMessage({
        type: 'success',
        text: 'درخواست تسویه حساب شما با موفقیت ثبت شد و به سیستم مالی جهت واریز ارجاع گردید.',
      })
      setPayoutAmount('')
      setPayoutNotes('')
      await loadWallet()
    } catch (err) {
      setPayoutMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'خطا در ثبت درخواست تسویه',
      })
    } finally {
      setPayoutSubmitting(false)
    }
  }

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
          title="کیف پول و تسویه حساب فروشگاه"
          description="درآمد حاصل از سفارش‌های تحویل‌شده پس از پایان بازه هولد، به صورت خودکار به موجودی قابل برداشت منتقل می‌شود و می‌توانید درخواست تسویه ثبت کنید."
          actions={
            <button
              className="fm-button fm-button--primary"
              disabled={Number(walletMeta.availableBalance ?? 0) <= 0}
              onClick={() => {
                setPayoutModalOpen((prev) => !prev)
                setPayoutAmount(String(walletMeta.availableBalance ?? ''))
                setPayoutMessage(null)
              }}
              type="button"
            >
              {payoutModalOpen ? 'بستن فرم تسویه' : 'درخواست تسویه حساب'}
            </button>
          }
        >
          <div className="vendor-wallet-note" style={{ marginBottom: payoutModalOpen ? '16px' : 0 }}>
            <strong>{formatAmount(walletMeta.availableBalance)}</strong> قابل برداشت، {formatAmount(walletMeta.heldBalance)} نگه‌داری‌شده و {formatAmount(activityMeta.creditAmount)} ورودی در بازه فعلی ثبت شده است.
          </div>

          {payoutModalOpen ? (
            <div
              style={{
                marginTop: '16px',
                padding: '20px',
                background: 'var(--fm-color-surface-sunken, #f8fafc)',
                borderRadius: '12px',
                border: '1px solid var(--fm-color-border, #e2e8f0)',
              }}
            >
              <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600 }}>
                فرم ثبت درخواست تسویه و واریز وجه
              </h4>
              <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
                پس از ثبت درخواست، مبلغ موردنظر از موجودی قابل تسویه کسر شده و جهت انجام حواله بانکی به واحد مالی ارجاع می‌شود.
              </p>

              {payoutMessage ? (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '0.875rem',
                    backgroundColor: payoutMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    color: payoutMessage.type === 'success' ? '#166534' : '#991b1b',
                    border: `1px solid ${payoutMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  {payoutMessage.text}
                </div>
              ) : null}

              <form className="fm-form-grid" onSubmit={handleSubmitPayout}>
                <div className="fm-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="payout-amount">مبلغ تسویه (تومان)</label>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--fm-color-primary, #2563eb)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      onClick={() => setPayoutAmount(String(walletMeta.availableBalance ?? ''))}
                    >
                      تسویه کل موجودی ({formatAmount(walletMeta.availableBalance)})
                    </button>
                  </div>
                  <input
                    id="payout-amount"
                    type="number"
                    min="1000"
                    max={Number(walletMeta.availableBalance ?? 0)}
                    value={payoutAmount}
                    onChange={(event) => setPayoutAmount(event.target.value)}
                    placeholder="مثلا ۵۰۰,۰۰۰"
                    required
                  />
                </div>

                <div className="fm-field">
                  <label htmlFor="payout-bank-info">اطلاعات شبا یا شماره کارت و نام صاحب حساب</label>
                  <input
                    id="payout-bank-info"
                    type="text"
                    value={bankAccountInfo}
                    onChange={(event) => setBankAccountInfo(event.target.value)}
                    placeholder="مثلا IR120120000000001234567890 - بانک سامان - علی اکبری"
                  />
                </div>

                <div className="fm-field">
                  <label htmlFor="payout-notes">توضیحات اختیاری</label>
                  <input
                    id="payout-notes"
                    type="text"
                    value={payoutNotes}
                    onChange={(event) => setPayoutNotes(event.target.value)}
                    placeholder="مثلا تسویه حساب فروش هفتگی"
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    className="fm-button fm-button--primary"
                    disabled={payoutSubmitting || !payoutAmount || Number(payoutAmount) <= 0}
                    type="submit"
                  >
                    {payoutSubmitting ? 'در حال ارسال درخواست...' : 'ارسال درخواست تسویه به سیستم مالی'}
                  </button>
                  <button
                    className="fm-button fm-button--ghost"
                    onClick={() => setPayoutModalOpen(false)}
                    type="button"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          ) : null}
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
                                {item.orderId ? <Pill tone="primary">{`سفارش #${item.orderId}`}</Pill> : null}
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

import { ActivityFeed, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type VendorRecord = Record<string, unknown>
type WorkspaceLane = 'finance' | 'policy' | 'coordination'

function toObject(value: unknown): VendorRecord {
  return typeof value === 'object' && value !== null ? (value as VendorRecord) : {}
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
  if (typeof value === 'number') {
    return new Intl.NumberFormat('fa-IR').format(value)
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      return new Intl.NumberFormat('fa-IR').format(parsed)
    }

    return value
  }

  return '—'
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'AT_RISK':
      return 'پرریسک'
    case 'WATCHLIST':
      return 'تحت نظر'
    case 'GOOD':
      return 'پایدار'
    case 'EXCELLENT':
      return 'عالی'
    default:
      return status || 'نامشخص'
  }
}

function getStatusTone(status: string) {
  if (status === 'AT_RISK') return 'danger' as const
  if (status === 'WATCHLIST') return 'warning' as const
  if (status === 'GOOD' || status === 'EXCELLENT') return 'success' as const
  return 'primary' as const
}

function formatPolicy(policy: unknown) {
  const record = toObject(policy)
  const entries = Object.entries(record)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${typeof value === 'boolean' ? (value ? 'بله' : 'خیر') : String(value)}`)

  return entries.length ? entries.join(' | ') : '—'
}

function collectActiveFlags(policy: unknown) {
  return Object.entries(toObject(policy))
    .filter(([, value]) => value === true)
    .map(([key]) => key)
}

function parseMetadataInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const parsed = JSON.parse(trimmed) as unknown
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('metadata باید یک آبجکت JSON معتبر باشد.')
  }

  return parsed as Record<string, unknown>
}

export function VendorWorkspacePage({
  session,
  store,
  onBack,
}: {
  session: AuthSession
  store: Record<string, unknown> | null
  onBack: () => void
}) {
  const [loading, setLoading] = useState(Boolean(store))
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<VendorRecord | null>(null)
  const [healthDetail, setHealthDetail] = useState<VendorRecord | null>(null)
  const [walletDetail, setWalletDetail] = useState<VendorRecord | null>(null)
  const [activeLane, setActiveLane] = useState<WorkspaceLane>('finance')
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [policyForm, setPolicyForm] = useState({
    autoSettlementHoldEnabled: false,
    settlementHoldDaysOverride: '',
    manualReviewRequired: false,
    blockNewDiscounts: false,
    note: '',
    metadata: '',
  })
  const [walletForm, setWalletForm] = useState({
    direction: 'CREDIT',
    type: '',
    amount: '',
    title: '',
    description: '',
    batchKey: '',
    metadata: '',
  })
  const [releaseOrderId, setReleaseOrderId] = useState('')

  const storeId = readText(store ?? {}, ['storeId'], '')

  const loadWorkspaceData = useCallback(async () => {
    if (!storeId) {
      setLoading(false)
      setDetail(null)
      setHealthDetail(null)
      setWalletDetail(null)
      setError('برای ورود به workspace فروشنده، ابتدا یک فروشنده را از کارتابل انتخاب کن.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [timelinePayload, healthPayload, walletPayload] = await Promise.all([
        adminApi.getVendorPolicyTimeline(session, storeId),
        adminApi.getVendorHealthDetail(session, storeId),
        adminApi.getWalletByStore(session, storeId),
      ])

      setDetail(toObject(timelinePayload))
      setHealthDetail(toObject(healthPayload))
      setWalletDetail(toObject(walletPayload))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری workspace فروشنده')
    } finally {
      setLoading(false)
    }
  }, [session, storeId])

  useEffect(() => {
    void loadWorkspaceData()
  }, [loadWorkspaceData])

  const currentPolicy = useMemo(() => toObject(detail?.currentPolicy), [detail])
  const detailStore = useMemo(() => toObject(detail?.store), [detail])
  const timeline = useMemo(() => toArray(detail?.timeline), [detail])
  const wallet = useMemo(() => toObject(walletDetail), [walletDetail])
  const walletTransactions = useMemo(() => toArray(wallet.transactions), [wallet])
  const metrics = toObject(healthDetail?.metrics)
  const status = readText(healthDetail ?? store ?? {}, ['vendorHealthStatus'], 'UNKNOWN')
  const healthScore = formatPersianNumber(readText(healthDetail ?? store ?? {}, ['vendorHealthScore'], '—'))
  const ratingCount = formatPersianNumber(readText(healthDetail ?? store ?? {}, ['customerRatingCount'], '—'))
  const ticketPressure = formatPersianNumber(metrics.totalTickets ?? readText(store ?? {}, ['periodMetrics.ticketCount'], '—'))
  const customerAverage = formatPersianNumber(readText(healthDetail ?? store ?? {}, ['customerRatingAverage'], '—'))
  const effectivePolicyFlags = collectActiveFlags(currentPolicy.effective)
  const riskPolicyView = toObject(healthDetail?.riskPolicy)

  useEffect(() => {
    const manualOverride = toObject(currentPolicy.manualOverride)
    setPolicyForm({
      autoSettlementHoldEnabled: manualOverride.autoSettlementHoldEnabled === true,
      settlementHoldDaysOverride:
        typeof manualOverride.settlementHoldDaysOverride === 'number'
          ? String(manualOverride.settlementHoldDaysOverride)
          : '',
      manualReviewRequired: manualOverride.manualReviewRequired === true,
      blockNewDiscounts: manualOverride.blockNewDiscounts === true,
      note: readText(manualOverride, ['note'], ''),
      metadata: manualOverride.metadata ? JSON.stringify(manualOverride.metadata, null, 2) : '',
    })
  }, [currentPolicy])

  const stats = [
    {
      label: 'فروشگاه',
      value: readText(store ?? {}, ['storeName'], '—'),
      delta: readText(store ?? {}, ['storeSlug'], 'بدون slug'),
      detail: 'context اصلی این workspace',
      tone: 'primary' as const,
    },
    {
      label: 'وضعیت سلامت',
      value: getStatusLabel(status),
      delta: `score ${healthScore}`,
      detail: 'پایه تصمیم‌های review و policy',
      tone: getStatusTone(status),
    },
    {
      label: 'امتیاز مشتری',
      value: customerAverage,
      delta: `${ratingCount} رأی`,
      detail: 'signal سمت مشتری',
      tone: 'success' as const,
    },
    {
      label: 'فشار تیکت',
      value: ticketPressure,
      delta: 'risk metrics',
      detail: 'نمای سریع فشار عملیاتی vendor',
      tone: 'warning' as const,
    },
  ]

  const laneCards = [
    {
      key: 'finance' as const,
      title: 'lane مالی و تسویه',
      description: 'برای hold/release/review و کنترل فشار مالی فروشنده.',
      detail: `${formatPersianNumber(metrics.refundTickets)} refund / ${formatPersianNumber(metrics.reversalTickets)} reversal`,
    },
    {
      key: 'policy' as const,
      title: 'lane policy و ریسک',
      description: 'برای override، محدودیت تخفیف و manual review.',
      detail: `${getStatusLabel(status)} / score ${healthScore}`,
    },
    {
      key: 'coordination' as const,
      title: 'lane هماهنگی بین تیمی',
      description: 'برای sync بین مالی، پشتیبانی و عملیات.',
      detail: `${formatPersianNumber(metrics.totalTickets)} ticket / ${formatPersianNumber(metrics.resolvedTickets)} resolved`,
    },
  ]

  const laneSummaryMap: Record<
    WorkspaceLane,
    {
      eyebrow: string
      title: string
      description: string
      bullets: string[]
      statusLabel: string
    }
  > = {
    finance: {
      eyebrow: 'finance lane',
      title: 'آماده اجرای actionهای مالی',
      description: 'در این lane حالا می‌توانی wallet adjustment و release settlement واقعی را اجرا کنی.',
      bullets: [
        `available wallet: ${formatPersianNumber(wallet.availableBalance)}`,
        `held wallet: ${formatPersianNumber(wallet.heldBalance)}`,
        `refund tickets: ${formatPersianNumber(metrics.refundTickets)}`,
        'اگر release لازم است، order id را در فرم پایین ثبت کن.',
      ],
      statusLabel: 'finance-live',
    },
    policy: {
      eyebrow: 'policy lane',
      title: 'آماده اجرای actionهای policy',
      description: 'در این lane حالا override واقعی policy و recalculate health از backend واقعی اجرا می‌شوند.',
      bullets: [
        `policy flags: ${effectivePolicyFlags.length ? effectivePolicyFlags.join(' / ') : 'بدون flag فعال'}`,
        `manual review required: ${riskPolicyView.manualReviewRequired ? 'بله' : 'خیر'}`,
        `block discounts: ${riskPolicyView.blockNewDiscounts ? 'بله' : 'خیر'}`,
        'بعد از هر update می‌توانی health را دوباره recalculate کنی.',
      ],
      statusLabel: 'policy-live',
    },
    coordination: {
      eyebrow: 'coordination lane',
      title: 'آماده handoff بین تیمی',
      description: 'در این lane تصمیم بین policy، finance و timeline جمع می‌شود تا context از بین نرود.',
      bullets: [
        `timeline events: ${formatPersianNumber(timeline.length)}`,
        `customer rating count: ${ratingCount}`,
        `resolved tickets: ${formatPersianNumber(metrics.resolvedTickets)}`,
        'digest رخدادها و policy snapshot پایین همین route مرجع handoff می‌مانند.',
      ],
      statusLabel: 'coordination-live',
    },
  }

  const activeLaneSummary = laneSummaryMap[activeLane]

  const workflowStages = [
    {
      label: '۱. assess',
      value: `${getStatusLabel(status)} / score ${healthScore}`,
      note: 'اول وضعیت سلامت، سیگنال مشتری و فشار تیکت باید تثبیت شود.',
    },
    {
      label: '۲. policy',
      value: effectivePolicyFlags.length ? effectivePolicyFlags.join(' / ') : 'بدون محدودیت فعال',
      note: 'بعد باید policy موثر و overrideهای احتمالی خوانده شوند.',
    },
    {
      label: '۳. finance',
      value: `${formatPersianNumber(metrics.refundTickets)} refund / ${formatPersianNumber(metrics.reversalTickets)} reversal`,
      note: 'فشار مالی و نیاز به hold/release/review در این مرحله سنجیده می‌شود.',
    },
    {
      label: '۴. handoff',
      value: formatPersianNumber(timeline.length),
      note: 'اگر تصمیم بین تیمی شد، handoff باید همین route را مرجع خود نگه دارد.',
    },
  ]

  const decisionMatrix = {
    finance: [
      'اول wallet را نگاه کن، بعد adjustment یا release settlement را اجرا کن.',
      'اگر held balance پایین است، قبل از release باید context order بررسی شود.',
      'بعد از هر action مالی، digest رخدادها و wallet transactions را دوباره بخوان.',
    ],
    policy: [
      'اول override را ثبت کن، بعد در صورت نیاز health را recalculate بزن.',
      'اگر فروشنده AT_RISK است، update policy باید با note شفاف ثبت شود.',
      'اگر discount block فعال می‌شود، timeline باید دلیل این تصمیم را منعکس کند.',
    ],
    coordination: [
      'وقتی policy و finance هر دو درگیرند، context را از timeline و metrics هم‌زمان بخوان.',
      'route باید مرجع handoff بین مالی، پشتیبانی و عملیات بماند.',
      'بعد از actionهای واقعی، latest events باید برای جمع‌بندی نهایی مرور شوند.',
    ],
  }[activeLane]

  const latestEventDigest = timeline.slice(0, 4).map((item, index) => ({
    id: readText(item, ['id'], String(index + 1)),
    title: readText(item, ['summary', 'aggregateType'], 'event'),
    meta: formatJalaliDate(item.createdAt),
    actor: readText(item, ['actorUserId'], 'سیستمی/نامشخص'),
  }))

  const timelineFeed = timeline.slice(0, 10).map((item, index) => ({
    id: readText(item, ['id'], String(index + 1)),
    title: readText(item, ['summary', 'aggregateType'], 'policy event'),
    meta: formatJalaliDate(item.createdAt),
    description: readText(item, ['aggregateType'], 'جزئیات event'),
    tone: index % 2 === 0 ? ('warning' as const) : ('success' as const),
  }))

  async function runAction(key: string, action: () => Promise<unknown>, successMessage: string) {
    setActionBusy(key)
    setActionError(null)
    setActionMessage(null)

    try {
      await action()
      await loadWorkspaceData()
      setActionMessage(successMessage)
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'اجرای action با خطا مواجه شد')
    } finally {
      setActionBusy(null)
    }
  }

  async function handlePolicySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    let metadata: Record<string, unknown> | undefined
    try {
      metadata = parseMetadataInput(policyForm.metadata)
    } catch (parseError) {
      setActionError(parseError instanceof Error ? parseError.message : 'metadata policy نامعتبر است')
      setActionMessage(null)
      return
    }

    const body: Record<string, unknown> = {
      autoSettlementHoldEnabled: policyForm.autoSettlementHoldEnabled,
      manualReviewRequired: policyForm.manualReviewRequired,
      blockNewDiscounts: policyForm.blockNewDiscounts,
      note: policyForm.note.trim() || undefined,
      metadata,
    }

    if (policyForm.settlementHoldDaysOverride.trim()) {
      body.settlementHoldDaysOverride = Number(policyForm.settlementHoldDaysOverride)
    }

    await runAction(
      'policy-submit',
      () => adminApi.updateVendorRiskPolicy(session, storeId, body),
      'policy فروشنده با موفقیت به‌روزرسانی شد.',
    )
  }

  async function handleRecalculateHealth() {
    await runAction(
      'health-recalculate',
      () => adminApi.recalculateVendorHealth(session, storeId),
      'health فروشنده دوباره محاسبه شد.',
    )
  }

  async function handleWalletSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    let metadata: Record<string, unknown> | undefined
    try {
      metadata = parseMetadataInput(walletForm.metadata)
    } catch (parseError) {
      setActionError(parseError instanceof Error ? parseError.message : 'metadata wallet نامعتبر است')
      setActionMessage(null)
      return
    }

    await runAction(
      'wallet-submit',
      () =>
        adminApi.adjustWallet(session, storeId, {
          direction: walletForm.direction,
          type: walletForm.type.trim() || undefined,
          amount: Number(walletForm.amount),
          title: walletForm.title.trim(),
          description: walletForm.description.trim() || undefined,
          batchKey: walletForm.batchKey.trim() || undefined,
          metadata,
        }),
      'adjustment کیف پول با موفقیت ثبت شد.',
    )
  }

  async function handleReleaseSettlement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await runAction(
      'settlement-release',
      () => adminApi.releaseOrderSettlement(session, releaseOrderId.trim()),
      'release settlement با موفقیت انجام شد.',
    )
  }

  async function handleReleaseDueSettlements() {
    await runAction(
      'settlement-release-due',
      () => adminApi.releaseDueSettlements(session),
      'release due settlements با موفقیت اجرا شد.',
    )
  }

  return (
    <div className="fm-stack">
      <div className="vendors-workspace-topbar">
        <button className="vendors-workspace-back" onClick={onBack} type="button">
          بازگشت به کارتابل فروشنده‌ها
        </button>
        <Pill tone={getStatusTone(status)}>{getStatusLabel(status)}</Pill>
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
          title={`بررسی فروشنده ${readText(store ?? {}, ['storeName'], '—')}`}
          description="این route عمدا از list page جدا شده تا اقدام‌های بعدی و تصمیم‌های عملیاتی در یک surface خلوت، متمرکز و قابل‌گسترش جمع شوند."
          actions={<Pill tone="primary">focused route</Pill>}
        >
          <div className="vendors-workspace-lanes">
            {laneCards.map((item) => (
              <button
                className={`vendors-workspace-lane-card${activeLane === item.key ? ' is-active' : ''}`}
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
          eyebrow={activeLaneSummary.eyebrow}
          title={activeLaneSummary.title}
          description={activeLaneSummary.description}
          actions={<Pill tone="neutral">{activeLaneSummary.statusLabel}</Pill>}
        >
          <div className="vendors-workspace-action-grid">
            {activeLaneSummary.bullets.map((item) => (
              <article className="vendors-workspace-action-card" key={item}>
                <strong>نکته عملیاتی</strong>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="workflow board"
          title="برد کامل workflow فروشنده"
          description="این برد مسیر کامل review را از assess اولیه تا handoff نهایی یکجا نگه می‌دارد تا چیزی از قلم نیفتد."
          actions={<Pill tone="primary">workflow</Pill>}
        >
          <div className="vendors-workspace-checklist">
            {workflowStages.map((item) => (
              <article className="vendors-workspace-check-item" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="decision matrix"
          title="ماتریس تصمیم برای lane انتخاب‌شده"
          description="هر lane باید منطق تصمیم‌گیری خودش را داشته باشد تا route فقط یک صفحه تزئینی نباشد."
          actions={<Pill tone="neutral">{activeLane}</Pill>}
        >
          <div className="vendors-workspace-action-grid">
            {decisionMatrix.map((item) => (
              <article className="vendors-workspace-action-card" key={item}>
                <strong>قاعده تصمیم</strong>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="actions"
          title="actionهای واقعی vendor workflow"
          description="این بخش حالا مستقیم به backend واقعی وصل است و actionهای اصلی این domain را از همین route اجرا می‌کند."
          actions={<Pill tone="success">live actions</Pill>}
        >
          <div className="vendors-workspace-surface-grid">
            <article className="vendors-workspace-surface-card">
              <strong>health control</strong>
              <p>اگر نیاز به بازبینی فوری score و snapshot داری، health را دوباره محاسبه کن.</p>
              <button
                className="fm-button fm-button--primary"
                disabled={actionBusy === 'health-recalculate'}
                onClick={handleRecalculateHealth}
                type="button"
              >
                {actionBusy === 'health-recalculate' ? 'در حال اجرا...' : 'محاسبه مجدد health'}
              </button>
            </article>

            <article className="vendors-workspace-surface-card">
              <strong>settlement due sweep</strong>
              <p>برای آزادسازی batch settlementهای due از action سراسری backend استفاده کن.</p>
              <button
                className="fm-button fm-button--secondary"
                disabled={actionBusy === 'settlement-release-due'}
                onClick={handleReleaseDueSettlements}
                type="button"
              >
                {actionBusy === 'settlement-release-due' ? 'در حال اجرا...' : 'release due settlements'}
              </button>
            </article>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="policy control"
          title="ویرایش policy و manual override"
          description="overrideهای واقعی policy ریسک همین‌جا ثبت می‌شوند و بعد از submit دوباره snapshot بارگذاری می‌شود."
          actions={<Pill tone="warning">policy mutation</Pill>}
        >
          <form className="fm-form-grid vendors-workspace-form-grid" onSubmit={handlePolicySubmit}>
            <div className="vendors-workspace-toggle-grid">
              <label className="vendors-workspace-toggle">
                <input
                  checked={policyForm.autoSettlementHoldEnabled}
                  onChange={(event) =>
                    setPolicyForm((current) => ({ ...current, autoSettlementHoldEnabled: event.target.checked }))
                  }
                  type="checkbox"
                />
                <span>auto settlement hold</span>
              </label>
              <label className="vendors-workspace-toggle">
                <input
                  checked={policyForm.manualReviewRequired}
                  onChange={(event) =>
                    setPolicyForm((current) => ({ ...current, manualReviewRequired: event.target.checked }))
                  }
                  type="checkbox"
                />
                <span>manual review required</span>
              </label>
              <label className="vendors-workspace-toggle">
                <input
                  checked={policyForm.blockNewDiscounts}
                  onChange={(event) =>
                    setPolicyForm((current) => ({ ...current, blockNewDiscounts: event.target.checked }))
                  }
                  type="checkbox"
                />
                <span>block new discounts</span>
              </label>
            </div>

            <div className="fm-field">
              <label htmlFor="policy-hold-days">settlementHoldDaysOverride</label>
              <input
                id="policy-hold-days"
                min="1"
                onChange={(event) =>
                  setPolicyForm((current) => ({ ...current, settlementHoldDaysOverride: event.target.value }))
                }
                placeholder="مثلا 14"
                type="number"
                value={policyForm.settlementHoldDaysOverride}
              />
            </div>

            <div className="fm-field">
              <label htmlFor="policy-note">note</label>
              <textarea
                id="policy-note"
                onChange={(event) => setPolicyForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="دلیل override یا تصمیم policy را بنویس"
                rows={4}
                value={policyForm.note}
              />
            </div>

            <div className="fm-field">
              <label htmlFor="policy-metadata">metadata JSON</label>
              <textarea
                id="policy-metadata"
                onChange={(event) => setPolicyForm((current) => ({ ...current, metadata: event.target.value }))}
                placeholder='{"reasonCode":"HIGH_REFUND_RATE"}'
                rows={4}
                value={policyForm.metadata}
              />
            </div>

            <button className="fm-button fm-button--primary" disabled={actionBusy === 'policy-submit'} type="submit">
              {actionBusy === 'policy-submit' ? 'در حال ذخیره...' : 'ثبت policy override'}
            </button>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="wallet control"
          title="کنترل واقعی کیف پول فروشنده"
          description="جزئیات wallet و adjustment دستی همین‌جا اجرا می‌شود و recent transactions هم برای review کنار آن دیده می‌شود."
          actions={<Pill tone="success">wallet mutation</Pill>}
        >
          <div className="vendors-workspace-wallet-grid">
            <div className="vendors-workspace-wallet-summary">
              <div className="vendors-brief-grid">
                {[
                  { label: 'current balance', value: formatPersianNumber(wallet.currentBalance) },
                  { label: 'available balance', value: formatPersianNumber(wallet.availableBalance) },
                  { label: 'held balance', value: formatPersianNumber(wallet.heldBalance) },
                  { label: 'transactions', value: formatPersianNumber(walletTransactions.length) },
                ].map((item) => (
                  <article className="vendors-brief-item" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>

              <div className="vendors-transaction-list">
                {walletTransactions.slice(0, 6).map((item) => (
                  <article className="vendors-transaction-item" key={readText(item, ['id'], Math.random().toString())}>
                    <strong>{readText(item, ['title'], 'transaction')}</strong>
                    <span>{readText(item, ['direction'], '—')}</span>
                    <small>{`${formatPersianNumber(readText(item, ['amount'], '—'))} / ${formatJalaliDate(item.createdAt)}`}</small>
                  </article>
                ))}
              </div>
            </div>

            <form className="fm-form-grid vendors-workspace-form-grid" onSubmit={handleWalletSubmit}>
              <div className="fm-field">
                <label htmlFor="wallet-direction">direction</label>
                <select
                  id="wallet-direction"
                  onChange={(event) => setWalletForm((current) => ({ ...current, direction: event.target.value }))}
                  value={walletForm.direction}
                >
                  <option value="CREDIT">CREDIT</option>
                  <option value="DEBIT">DEBIT</option>
                </select>
              </div>

              <div className="fm-field">
                <label htmlFor="wallet-type">type</label>
                <input
                  id="wallet-type"
                  onChange={(event) => setWalletForm((current) => ({ ...current, type: event.target.value }))}
                  placeholder="اختیاری؛ مثلا MANUAL_CREDIT"
                  value={walletForm.type}
                />
              </div>

              <div className="fm-field">
                <label htmlFor="wallet-amount">amount</label>
                <input
                  id="wallet-amount"
                  min="0.01"
                  onChange={(event) => setWalletForm((current) => ({ ...current, amount: event.target.value }))}
                  placeholder="250000"
                  step="0.01"
                  type="number"
                  value={walletForm.amount}
                />
              </div>

              <div className="fm-field">
                <label htmlFor="wallet-title">title</label>
                <input
                  id="wallet-title"
                  onChange={(event) => setWalletForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="پاداش یا برداشت دستی"
                  value={walletForm.title}
                />
              </div>

              <div className="fm-field">
                <label htmlFor="wallet-description">description</label>
                <textarea
                  id="wallet-description"
                  onChange={(event) => setWalletForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="توضیح این adjustment"
                  rows={3}
                  value={walletForm.description}
                />
              </div>

              <div className="fm-field">
                <label htmlFor="wallet-batch">batchKey</label>
                <input
                  id="wallet-batch"
                  onChange={(event) => setWalletForm((current) => ({ ...current, batchKey: event.target.value }))}
                  placeholder="batch-may-01"
                  value={walletForm.batchKey}
                />
              </div>

              <div className="fm-field">
                <label htmlFor="wallet-metadata">metadata JSON</label>
                <textarea
                  id="wallet-metadata"
                  onChange={(event) => setWalletForm((current) => ({ ...current, metadata: event.target.value }))}
                  placeholder='{"source":"admin-panel"}'
                  rows={4}
                  value={walletForm.metadata}
                />
              </div>

              <button className="fm-button fm-button--primary" disabled={actionBusy === 'wallet-submit'} type="submit">
                {actionBusy === 'wallet-submit' ? 'در حال ثبت...' : 'ثبت wallet adjustment'}
              </button>
            </form>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="settlement release"
          title="آزادسازی settlement بر اساس order"
          description="اگر order مشخصی باید دستی release شود، این فرم مستقیم به endpoint واقعی finance وصل است."
          actions={<Pill tone="danger">release mutation</Pill>}
        >
          <form className="fm-form-grid vendors-workspace-form-grid" onSubmit={handleReleaseSettlement}>
            <div className="fm-field">
              <label htmlFor="release-order-id">order id</label>
              <input
                id="release-order-id"
                onChange={(event) => setReleaseOrderId(event.target.value)}
                placeholder="شناسه سفارش"
                value={releaseOrderId}
              />
            </div>

            <button className="fm-button fm-button--primary" disabled={actionBusy === 'settlement-release'} type="submit">
              {actionBusy === 'settlement-release' ? 'در حال آزادسازی...' : 'release settlement'}
            </button>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="latest events"
          title="digest رخدادهای آخر"
          description="چهار رخداد آخر timeline اینجا فشرده دیده می‌شوند تا اپراتور قبل از اسکرول timeline full context را سریع بگیرد."
          actions={<Pill tone="warning">event digest</Pill>}
        >
          {latestEventDigest.length ? (
            <div className="vendors-brief-grid">
              {latestEventDigest.map((item) => (
                <article className="vendors-brief-item" key={item.id}>
                  <span>{item.title}</span>
                  <strong>{item.meta}</strong>
                  <small>{`actor: ${item.actor}`}</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="fm-message">هنوز رخداد کافی برای ساخت digest آخر وجود ندارد.</div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="policy snapshot"
          title="وضعیت policy و snapshot فعلی"
          description="این بخش برای متمرکز نگه داشتن review state، policy override و تصمیم‌های بعدی در یک route جداست."
          actions={<Pill tone="warning">policy state</Pill>}
        >
          <div className="vendors-workspace-policy-grid">
            <article className="vendors-policy-item">
              <span>policy خودکار</span>
              <strong>{formatPolicy(currentPolicy.auto)}</strong>
            </article>
            <article className="vendors-policy-item">
              <span>manual override</span>
              <strong>{formatPolicy(currentPolicy.manualOverride)}</strong>
            </article>
            <article className="vendors-policy-item">
              <span>policy موثر</span>
              <strong>{formatPolicy(currentPolicy.effective)}</strong>
            </article>
            <article className="vendors-policy-item">
              <span>آخرین health snapshot</span>
              <strong>{formatJalaliDate(detailStore.vendorHealthCalculatedAt)}</strong>
            </article>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="policy timeline"
          title="timeline سیاست‌ها و رخدادهای فروشنده"
          description="timeline در workspace جدا مانده تا actionهای واقعی، notes و state transitionها همین‌جا trace شوند."
          actions={<Pill tone="success">{`${new Intl.NumberFormat('fa-IR').format(timeline.length)} event`}</Pill>}
        >
          {timelineFeed.length ? (
            <ActivityFeed items={timelineFeed} />
          ) : (
            <div className="fm-message">برای این فروشنده هنوز timeline قابل‌نمایشی وجود ندارد.</div>
          )}
        </SectionCard>
      </LoadableState>
    </div>
  )
}

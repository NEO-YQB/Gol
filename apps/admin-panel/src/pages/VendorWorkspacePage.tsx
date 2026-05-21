import { ActivityFeed, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type VendorRecord = Record<string, unknown>
type WorkspaceLane = 'finance' | 'policy' | 'coordination'

function getDirectionLabel(direction: string) {
  return direction === 'DEBIT' ? 'برداشت' : 'افزایش'
}

function translateTimelineActor(value: string) {
  if (!value) return 'سامانه یا نامشخص'
  return value
}

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
    .map(([key, value]) => `${translatePolicyKey(key)}: ${typeof value === 'boolean' ? (value ? 'بله' : 'خیر') : String(value)}`)

  return entries.length ? entries.join(' | ') : '—'
}

function translatePolicyKey(key: string) {
  switch (key) {
    case 'autoSettlementHoldEnabled':
      return 'نگه‌داری خودکار تسویه'
    case 'settlementHoldDaysOverride':
      return 'تعداد روز نگه‌داری'
    case 'manualReviewRequired':
      return 'نیازمند بررسی دستی'
    case 'blockNewDiscounts':
      return 'جلوگیری از تخفیف تازه'
    case 'note':
      return 'توضیح'
    case 'metadata':
      return 'جزئیات تکمیلی'
    case 'VendorRiskPolicy':
      return 'سیاست ریسک فروشنده'
    case 'Store':
      return 'فروشگاه'
    case 'WalletTransaction':
      return 'گردش کیف پول'
    case 'Settlement':
      return 'تسویه'
    case 'SupportTicket':
      return 'تیکت پشتیبانی'
    case 'Review':
      return 'نظر مشتری'
    default:
      return key
  }
}

function collectActiveFlags(policy: unknown) {
  return Object.entries(toObject(policy))
    .filter(([, value]) => value === true)
    .map(([key]) => translatePolicyKey(key))
}

function parseMetadataInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const parsed = JSON.parse(trimmed) as unknown
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('جزئیات ساختاریافته باید یک شیء معتبر باشد.')
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
  useNoticeEffect(actionMessage, 'success')
  useNoticeEffect(actionError, 'error')
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
  const [storeActiveBusy, setStoreActiveBusy] = useState(false)

  const storeId = readText(store ?? {}, ['storeId'], '')

  const loadWorkspaceData = useCallback(async () => {
    if (!storeId) {
      setLoading(false)
      setDetail(null)
      setHealthDetail(null)
      setWalletDetail(null)
      setError('برای ورود به میزکار فروشنده، ابتدا یک فروشنده را از کارتابل انتخاب کن.')
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
      setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری میزکار فروشنده')
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
      detail: 'هویت اصلی فروشگاهی که در حال رسیدگی به آن هستی',
      hint: 'همه تصمیم‌های این صفحه مستقیما روی همین فروشگاه اثر می‌گذارند.',
      tone: 'primary' as const,
    },
    {
      label: 'وضعیت سلامت',
      value: getStatusLabel(status),
      delta: `امتیاز ${healthScore}`,
      detail: 'پایه تصمیم‌های ریسک و محدودیت‌ها',
      hint: 'اگر وضعیت پرریسک است، بهتر است هم بخش ریسک و هم بخش مالی را مرور کنی.',
      tone: getStatusTone(status),
    },
    {
      label: 'امتیاز مشتری',
      value: customerAverage,
      delta: `${ratingCount} رأی`,
      detail: 'برداشت مشتری از عملکرد فروشگاه',
      hint: 'این عدد کنار فشار تیکت کمک می‌کند بفهمی مسئله فقط داخلی است یا روی تجربه مشتری هم اثر گذاشته.',
      tone: 'success' as const,
    },
    {
      label: 'فشار تیکت',
      value: ticketPressure,
      delta: 'فشار عملیاتی',
      detail: 'نمای سریع فشار رسیدگی روی فروشگاه',
      hint: 'اگر این عدد بالا باشد، تصمیم‌ها باید با دقت بیشتری ثبت شوند تا دوباره‌کاری کم شود.',
      tone: 'warning' as const,
    },
    {
      label: 'فعال‌سازی فروشگاه',
      value: readText(detailStore, ['isVerified'], 'false') === 'true' ? 'فعال' : 'غیرفعال',
      delta: detailStore.name ? String(detailStore.name) : 'وضعیت دسترسی فروشگاه',
      detail: 'ادمین می‌تواند فروشگاه را فعال یا غیرفعال کند.',
      hint: 'بعد از تکمیل و تایید همه مراحل، از همین‌جا فروشگاه را فعال کن.',
      tone: readText(detailStore, ['isVerified'], 'false') === 'true' ? 'success' as const : 'warning' as const,
    },
  ]

  async function handleToggleStoreActivation(nextIsVerified: boolean) {
    if (!storeId) return
    setStoreActiveBusy(true)
    setActionError(null)
    try {
      await adminApi.updateStore(session, storeId, { isVerified: nextIsVerified })
      setActionMessage(nextIsVerified ? 'فروشگاه فعال شد.' : 'فروشگاه غیرفعال شد.')
      await loadWorkspaceData()
    } catch (toggleError) {
      setActionError(toggleError instanceof Error ? toggleError.message : 'تغییر وضعیت فروشگاه ناموفق بود')
    } finally {
      setStoreActiveBusy(false)
    }
  }

  const laneCards = [
    {
      key: 'finance' as const,
      title: 'مسیر مالی و تسویه',
      description: 'برای رسیدگی به پول، تسویه و فشار مالی فروشنده.',
      detail: `${formatPersianNumber(metrics.refundTickets)} بازگشت وجه / ${formatPersianNumber(metrics.reversalTickets)} برگشت تراکنش`,
    },
    {
      key: 'policy' as const,
      title: 'مسیر ریسک و محدودیت',
      description: 'برای ثبت دخالت دستی، محدودیت‌ها و بررسی دقیق‌تر.',
      detail: `${getStatusLabel(status)} / امتیاز ${healthScore}`,
    },
    {
      key: 'coordination' as const,
      title: 'مسیر هماهنگی بین تیمی',
      description: 'برای جمع‌کردن نظر مالی، پشتیبانی و عملیات.',
      detail: `${formatPersianNumber(metrics.totalTickets)} تیکت / ${formatPersianNumber(metrics.resolvedTickets)} حل‌شده`,
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
      eyebrow: 'مسیر مالی',
      title: 'آماده اجرای اقدام‌های مالی',
      description: 'در این مسیر می‌توانی اصلاح کیف پول و آزادسازی تسویه را انجام دهی.',
      bullets: [
        `موجودی آزاد: ${formatPersianNumber(wallet.availableBalance)}`,
        `موجودی نگه‌داری‌شده: ${formatPersianNumber(wallet.heldBalance)}`,
        `تعداد بازگشت وجه: ${formatPersianNumber(metrics.refundTickets)}`,
        'اگر باید تسویه یک سفارش را آزاد کنی، شناسه سفارش را در فرم پایین ثبت کن.',
      ],
      statusLabel: 'اقدام مالی',
    },
    policy: {
      eyebrow: 'مسیر ریسک',
      title: 'آماده اجرای اقدام‌های ریسک',
      description: 'در این مسیر می‌توانی محدودیت‌ها را تغییر دهی و وضعیت سلامت را دوباره محاسبه کنی.',
      bullets: [
        `محدودیت‌های فعال: ${effectivePolicyFlags.length ? effectivePolicyFlags.join(' / ') : 'بدون محدودیت فعال'}`,
        `نیازمند بررسی دستی: ${riskPolicyView.manualReviewRequired ? 'بله' : 'خیر'}`,
        `جلوگیری از تخفیف تازه: ${riskPolicyView.blockNewDiscounts ? 'بله' : 'خیر'}`,
        'بعد از هر تغییر می‌توانی وضعیت سلامت را دوباره محاسبه کنی.',
      ],
      statusLabel: 'اقدام ریسک',
    },
    coordination: {
      eyebrow: 'مسیر هماهنگی',
      title: 'آماده جمع‌بندی بین تیمی',
      description: 'در این مسیر تصمیم مالی، محدودیت‌ها و رخدادها کنار هم می‌آیند تا روند کار شفاف بماند.',
      bullets: [
        `تعداد رخدادها: ${formatPersianNumber(timeline.length)}`,
        `تعداد رأی مشتری: ${ratingCount}`,
        `تعداد تیکت حل‌شده: ${formatPersianNumber(metrics.resolvedTickets)}`,
        'جمع‌بندی رخدادها و وضعیت محدودیت‌ها پایین همین صفحه مرجع هماهنگی می‌مانند.',
      ],
      statusLabel: 'هماهنگی زنده',
    },
  }

  const activeLaneSummary = laneSummaryMap[activeLane]

  const workflowStages = [
    {
      label: '۱. بررسی اولیه',
      value: `${getStatusLabel(status)} / امتیاز ${healthScore}`,
      note: 'اول وضعیت سلامت، نظر مشتری و فشار تیکت را جمع‌بندی کن.',
    },
    {
      label: '۲. محدودیت‌ها',
      value: effectivePolicyFlags.length ? effectivePolicyFlags.join(' / ') : 'بدون محدودیت فعال',
      note: 'بعد از آن باید محدودیت‌های فعال و دخالت‌های دستی خوانده شوند.',
    },
    {
      label: '۳. مالی',
      value: `${formatPersianNumber(metrics.refundTickets)} بازگشت وجه / ${formatPersianNumber(metrics.reversalTickets)} برگشت تراکنش`,
      note: 'در این مرحله نیاز به نگه‌داری، آزادسازی یا اصلاح مالی سنجیده می‌شود.',
    },
    {
      label: '۴. هماهنگی',
      value: formatPersianNumber(timeline.length),
      note: 'اگر تصمیم بین چند تیم تقسیم شد، همین صفحه باید مرجع نهایی بماند.',
    },
  ]

  const decisionMatrix = {
    finance: [
      'اول کیف پول را ببین، بعد اصلاح یا آزادسازی تسویه را انجام بده.',
      'اگر موجودی نگه‌داری‌شده کم است، پیش از آزادسازی باید وضعیت سفارش را بررسی کنی.',
      'بعد از هر اقدام مالی، رخدادهای آخر و گردش کیف پول را دوباره بخوان.',
    ],
    policy: [
      'اول تغییر محدودیت را ثبت کن و بعد در صورت نیاز دوباره وضعیت سلامت را محاسبه کن.',
      'اگر فروشنده پرریسک است، دلیل تغییر باید شفاف و مکتوب ثبت شود.',
      'اگر جلوگیری از تخفیف تازه را فعال می‌کنی، دلیل آن باید در رخدادها دیده شود.',
    ],
    coordination: [
      'وقتی هم ریسک و هم مالی درگیرند، رخدادها و شاخص‌ها را کنار هم بخوان.',
      'این صفحه باید مرجع هماهنگی بین مالی، پشتیبانی و عملیات بماند.',
      'بعد از اقدام‌های واقعی، رخدادهای آخر را برای جمع‌بندی نهایی مرور کن.',
    ],
  }[activeLane]

  const latestEventDigest = timeline.slice(0, 4).map((item, index) => ({
    id: readText(item, ['id'], String(index + 1)),
    title: readText(item, ['summary'], '') || translatePolicyKey(readText(item, ['aggregateType'], 'رخداد')),
    meta: formatJalaliDate(item.createdAt),
    actor: translateTimelineActor(readText(item, ['actorUserId'], 'سامانه یا نامشخص')),
  }))

  const timelineFeed = timeline.slice(0, 10).map((item, index) => ({
    id: readText(item, ['id'], String(index + 1)),
    title: readText(item, ['summary'], '') || translatePolicyKey(readText(item, ['aggregateType'], 'رخداد ریسک')),
    meta: formatJalaliDate(item.createdAt),
    description: translatePolicyKey(readText(item, ['aggregateType'], 'جزئیات رخداد')),
    tone: index % 2 === 0 ? ('warning' as const) : ('success' as const),
  }))

  const actionWorkflow = [
    {
      lane: 'هماهنگی',
      label: 'فعال‌سازی یا غیرفعال‌سازی فروشگاه',
      detail: 'برای باز یا بسته کردن دسترسی عملیاتی فروشگاه بعد از جمع‌بندی نهایی.',
    },
    {
      lane: 'ریسک',
      label: 'محاسبه دوباره وضعیت سلامت',
      detail: 'پس از تغییر محدودیت‌ها یا ثبت رخدادهای اثرگذار، تصویر سلامت را تازه می‌کند.',
    },
    {
      lane: 'ریسک',
      label: 'ثبت تغییر محدودیت',
      detail: 'نگه‌داری تسویه، بررسی دستی و توقف تخفیف تازه از همین فرم اعمال می‌شود.',
    },
    {
      lane: 'مالی',
      label: 'اصلاح کیف پول',
      detail: 'افزایش یا برداشت دستی همراه با عنوان، توضیح و جزئیات ساختاریافته.',
    },
    {
      lane: 'مالی',
      label: 'آزادسازی تسویه سفارش',
      detail: 'برای آزادسازی دستی یک سفارش مشخص که آماده خروج از نگه‌داری است.',
    },
    {
      lane: 'مالی',
      label: 'آزادسازی گروهی تسویه‌های آماده',
      detail: 'برای اجرای یک‌جای release روی موردهای رسیده به شرط لازم.',
    },
  ]

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
      setActionError(parseError instanceof Error ? parseError.message : 'جزئیات ساختاریافته بخش ریسک معتبر نیست')
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
      'تنظیمات ریسک فروشنده با موفقیت به‌روزرسانی شد.',
    )
  }

  async function handleRecalculateHealth() {
    await runAction(
      'health-recalculate',
      () => adminApi.recalculateVendorHealth(session, storeId),
      'وضعیت سلامت فروشنده دوباره محاسبه شد.',
    )
  }

  async function handleWalletSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    let metadata: Record<string, unknown> | undefined
    try {
      metadata = parseMetadataInput(walletForm.metadata)
    } catch (parseError) {
      setActionError(parseError instanceof Error ? parseError.message : 'جزئیات ساختاریافته کیف پول معتبر نیست')
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
      'اصلاح کیف پول با موفقیت ثبت شد.',
    )
  }

  async function handleReleaseSettlement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await runAction(
      'settlement-release',
      () => adminApi.releaseOrderSettlement(session, releaseOrderId.trim()),
      'آزادسازی تسویه با موفقیت انجام شد.',
    )
  }

  async function handleReleaseDueSettlements() {
    await runAction(
      'settlement-release-due',
      () => adminApi.releaseDueSettlements(session),
      'آزادسازی تسویه‌های آماده با موفقیت انجام شد.',
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

      <LoadableState error={error} loading={loading}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="میزکار متمرکز"
          title={`بررسی فروشنده ${readText(store ?? {}, ['storeName'], '—')}`}
          description="این صفحه جدا شده تا اقدام‌های اصلی، تصمیم‌های حساس و جمع‌بندی بین تیمی در یک جای خلوت و روشن انجام شود."
          hint="اول یکی از سه مسیر بالا را انتخاب کن تا بدانی تمرکز این رسیدگی روی مالی است، روی محدودیت‌هاست یا روی هماهنگی بین تیم‌ها."
          actions={<Pill tone="primary">رسیدگی متمرکز</Pill>}
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
          hint="این بخش فقط روی همان مسیری تمرکز می‌کند که بالا انتخاب کرده‌ای تا ذهنت بین چند کار پخش نشود."
          actions={<Pill tone="neutral">{activeLaneSummary.statusLabel}</Pill>}
        >
          <div className="vendors-workspace-action-grid">
            {activeLaneSummary.bullets.map((item) => (
              <article className="vendors-workspace-action-card" key={item}>
                <strong>نکته کاربردی</strong>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="روند رسیدگی"
          title="مسیر کامل رسیدگی به فروشنده"
          description="این بخش قدم‌های اصلی را از بررسی اولیه تا جمع‌بندی نهایی نشان می‌دهد تا چیزی از قلم نیفتد."
          hint="اگر نمی‌دانی از کجا شروع کنی، این چهار گام را به‌ترتیب بخوان."
          actions={<Pill tone="primary">چهار گام اصلی</Pill>}
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
          eyebrow="راهنمای تصمیم"
          title="منطق تصمیم برای مسیر انتخاب‌شده"
          description="هر مسیر منطق خودش را دارد تا رسیدگی فقط نمایشی نباشد و تصمیم روشن و مرحله‌ای جلو برود."
          hint="این قواعد کوتاه، خلاصه همان تصمیم‌هایی هستند که معمولا همکار پنل باید به‌ترتیب در ذهن نگه دارد."
          actions={<Pill tone="neutral">{activeLane === 'finance' ? 'مالی' : activeLane === 'policy' ? 'ریسک' : 'هماهنگی'}</Pill>}
        >
          <div className="vendors-workspace-action-grid">
            {decisionMatrix.map((item) => (
              <article className="vendors-workspace-action-card" key={item}>
                <strong>قاعده رسیدگی</strong>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="workflow اقدام‌ها"
          title="ترتیب اجرای actionهای این workspace"
          description="همه actionهای اصلی این حوزه در همین workflow کنار هم آمده‌اند تا اجرای رسیدگی مرحله‌ای، روشن و قابل‌پیگیری بماند."
          hint="اگر قرار است روی این فروشنده چند اقدام پشت‌سرهم انجام شود، از این نقشه کوتاه استفاده کن."
          actions={<Pill tone="neutral">نقشه اقدام‌ها</Pill>}
        >
          <div className="vendors-workspace-workflow-grid">
            {actionWorkflow.map((item) => (
              <article className="vendors-workspace-workflow-item" key={item.label}>
                <span>{item.lane}</span>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="اقدام‌های اصلی"
          title="اقدام‌های واقعی رسیدگی به فروشنده"
          description="این بخش مستقیم به سامانه متصل است و اقدام‌های اصلی این حوزه را از همین صفحه اجرا می‌کند."
          hint="اگر هنوز از نتیجه مطمئن نیستی، اول بخش‌های بالاتر را مرور کن و بعد این دکمه‌ها را بزن."
          actions={<Pill tone="success">اقدام زنده</Pill>}
        >
          <div className="vendors-workspace-surface-grid">
            <article className="vendors-workspace-surface-card">
              <strong>فعال‌سازی فروشگاه</strong>
              <p>بعد از تایید کامل مدارک و محصول اولیه، از اینجا فروشگاه را برای فعالیت باز یا بسته کن.</p>
              <button
                className={`fm-button ${readText(detailStore, ['isVerified'], 'false') === 'true' ? 'fm-button--ghost' : 'fm-button--primary'}`}
                disabled={storeActiveBusy}
                onClick={() => void handleToggleStoreActivation(!(readText(detailStore, ['isVerified'], 'false') === 'true'))}
                type="button"
              >
                {storeActiveBusy ? 'در حال بروزرسانی...' : readText(detailStore, ['isVerified'], 'false') === 'true' ? 'غیرفعال کردن فروشگاه' : 'فعال کردن فروشگاه'}
              </button>
            </article>
            <article className="vendors-workspace-surface-card">
              <strong>محاسبه دوباره سلامت</strong>
              <p>اگر لازم است امتیاز و تصویر فعلی فروشگاه دوباره به‌روز شود، از این دکمه استفاده کن.</p>
              <button
                className="fm-button fm-button--primary"
                disabled={actionBusy === 'health-recalculate'}
                onClick={handleRecalculateHealth}
                type="button"
              >
                {actionBusy === 'health-recalculate' ? 'در حال اجرا...' : 'محاسبه دوباره وضعیت سلامت'}
              </button>
            </article>

            <article className="vendors-workspace-surface-card">
              <strong>آزادسازی تسویه‌های آماده</strong>
              <p>برای آزادسازی گروهی تسویه‌هایی که زمانشان رسیده است از این دکمه استفاده کن.</p>
              <button
                className="fm-button fm-button--secondary"
                disabled={actionBusy === 'settlement-release-due'}
                onClick={handleReleaseDueSettlements}
                type="button"
              >
                {actionBusy === 'settlement-release-due' ? 'در حال اجرا...' : 'آزادسازی تسویه‌های آماده'}
              </button>
            </article>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="کنترل ریسک"
          title="ویرایش محدودیت‌ها و دخالت دستی"
          description="تغییرهای واقعی محدودیت‌ها از همین بخش ثبت می‌شوند و بعد از ثبت، تصویر تازه دوباره بارگذاری می‌شود."
          hint="اگر قرار است محدودیتی را عوض کنی، دلیل آن را هم در توضیح بنویس تا برای بقیه روشن بماند."
          actions={<Pill tone="warning">ثبت تغییر ریسک</Pill>}
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
                <span>نگه‌داری خودکار تسویه فعال باشد</span>
              </label>
              <label className="vendors-workspace-toggle">
                <input
                  checked={policyForm.manualReviewRequired}
                  onChange={(event) =>
                    setPolicyForm((current) => ({ ...current, manualReviewRequired: event.target.checked }))
                  }
                  type="checkbox"
                />
                <span>بررسی دستی لازم باشد</span>
              </label>
              <label className="vendors-workspace-toggle">
                <input
                  checked={policyForm.blockNewDiscounts}
                  onChange={(event) =>
                    setPolicyForm((current) => ({ ...current, blockNewDiscounts: event.target.checked }))
                  }
                  type="checkbox"
                />
                <span>ثبت تخفیف تازه متوقف شود</span>
              </label>
            </div>

            <div className="fm-field">
              <label htmlFor="policy-hold-days">تعداد روز نگه‌داری تسویه</label>
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
              <label htmlFor="policy-note">توضیح تصمیم</label>
              <textarea
                id="policy-note"
                onChange={(event) => setPolicyForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="دلیل این تغییر یا تصمیم ریسک را بنویس"
                rows={4}
                value={policyForm.note}
              />
            </div>

            <div className="fm-field">
              <label htmlFor="policy-metadata">جزئیات ساختاریافته</label>
              <textarea
                id="policy-metadata"
                onChange={(event) => setPolicyForm((current) => ({ ...current, metadata: event.target.value }))}
                placeholder='{"reasonCode":"HIGH_REFUND_RATE"}'
                rows={4}
                value={policyForm.metadata}
              />
            </div>

            <button className="fm-button fm-button--primary" disabled={actionBusy === 'policy-submit'} type="submit">
              {actionBusy === 'policy-submit' ? 'در حال ذخیره...' : 'ثبت تغییر محدودیت'}
            </button>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="کنترل کیف پول"
          title="کنترل واقعی کیف پول فروشنده"
          description="خلاصه کیف پول، گردش‌های اخیر و اصلاح دستی مبلغ همگی در همین بخش دیده و ثبت می‌شوند."
          hint="اگر قرار است مبلغی را کم یا زیاد کنی، عنوان و توضیح شفاف وارد کن تا دلیل تغییر بعدا مشخص باشد."
          actions={<Pill tone="success">ثبت مالی دستی</Pill>}
        >
          <div className="vendors-workspace-wallet-grid">
            <div className="vendors-workspace-wallet-summary">
              <div className="vendors-brief-grid">
                {[
                  { label: 'موجودی کل', value: formatPersianNumber(wallet.currentBalance) },
                  { label: 'موجودی آزاد', value: formatPersianNumber(wallet.availableBalance) },
                  { label: 'موجودی نگه‌داری‌شده', value: formatPersianNumber(wallet.heldBalance) },
                  { label: 'تعداد گردش‌ها', value: formatPersianNumber(walletTransactions.length) },
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
                    <strong>{readText(item, ['title'], 'گردش مالی')}</strong>
                    <span>{getDirectionLabel(readText(item, ['direction'], '—'))}</span>
                    <small>{`${formatPersianNumber(readText(item, ['amount'], '—'))} / ${formatJalaliDate(item.createdAt)}`}</small>
                  </article>
                ))}
              </div>
            </div>

            <form className="fm-form-grid vendors-workspace-form-grid" onSubmit={handleWalletSubmit}>
              <div className="fm-field">
                <label htmlFor="wallet-direction">نوع تغییر</label>
                <select
                  id="wallet-direction"
                  onChange={(event) => setWalletForm((current) => ({ ...current, direction: event.target.value }))}
                  value={walletForm.direction}
                >
                  <option value="CREDIT">افزایش</option>
                  <option value="DEBIT">برداشت</option>
                </select>
              </div>

              <div className="fm-field">
                <label htmlFor="wallet-type">دسته تغییر</label>
                <input
                  id="wallet-type"
                  onChange={(event) => setWalletForm((current) => ({ ...current, type: event.target.value }))}
                  placeholder="اختیاری؛ مثلا افزایش دستی"
                  value={walletForm.type}
                />
              </div>

              <div className="fm-field">
                <label htmlFor="wallet-amount">مبلغ</label>
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
                <label htmlFor="wallet-title">عنوان</label>
                <input
                  id="wallet-title"
                  onChange={(event) => setWalletForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="پاداش یا برداشت دستی"
                  value={walletForm.title}
                />
              </div>

              <div className="fm-field">
                <label htmlFor="wallet-description">توضیح</label>
                <textarea
                  id="wallet-description"
                  onChange={(event) => setWalletForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="توضیح این تغییر مالی"
                  rows={3}
                  value={walletForm.description}
                />
              </div>

              <div className="fm-field">
                <label htmlFor="wallet-batch">شناسه گروهی</label>
                <input
                  id="wallet-batch"
                  onChange={(event) => setWalletForm((current) => ({ ...current, batchKey: event.target.value }))}
                  placeholder="گروه-اردیبهشت-۱"
                  value={walletForm.batchKey}
                />
              </div>

              <div className="fm-field">
                <label htmlFor="wallet-metadata">جزئیات ساختاریافته</label>
                <textarea
                  id="wallet-metadata"
                  onChange={(event) => setWalletForm((current) => ({ ...current, metadata: event.target.value }))}
                  placeholder='{"source":"panel"}'
                  rows={4}
                  value={walletForm.metadata}
                />
              </div>

              <button className="fm-button fm-button--primary" disabled={actionBusy === 'wallet-submit'} type="submit">
                {actionBusy === 'wallet-submit' ? 'در حال ثبت...' : 'ثبت تغییر کیف پول'}
              </button>
            </form>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="آزادسازی تسویه"
          title="آزادسازی تسویه بر اساس سفارش"
          description="اگر یک سفارش مشخص باید دستی آزاد شود، از همین فرم استفاده کن."
          hint="این فرم فقط برای وقتی است که شناسه سفارش مشخص را از قبل می‌دانی."
          actions={<Pill tone="danger">آزادسازی دستی</Pill>}
        >
          <form className="fm-form-grid vendors-workspace-form-grid" onSubmit={handleReleaseSettlement}>
            <div className="fm-field">
              <label htmlFor="release-order-id">شناسه سفارش</label>
              <input
                id="release-order-id"
                onChange={(event) => setReleaseOrderId(event.target.value)}
                placeholder="شناسه سفارش"
                value={releaseOrderId}
              />
            </div>

            <button className="fm-button fm-button--primary" disabled={actionBusy === 'settlement-release'} type="submit">
              {actionBusy === 'settlement-release' ? 'در حال آزادسازی...' : 'آزادسازی تسویه'}
            </button>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="رخدادهای آخر"
          title="جمع‌بندی کوتاه از رخدادهای اخیر"
          description="چهار رخداد آخر اینجا فشرده دیده می‌شوند تا پیش از خواندن کل فهرست، تصویر سریع بگیری."
          hint="اگر آخرین تصمیم‌ها برایت مهم‌تر از سابقه قدیمی هستند، اول این بخش را بخوان."
          actions={<Pill tone="warning">مرور سریع رخدادها</Pill>}
        >
          {latestEventDigest.length ? (
            <div className="vendors-brief-grid">
              {latestEventDigest.map((item) => (
                <article className="vendors-brief-item" key={item.id}>
                  <span>{item.title}</span>
                  <strong>{item.meta}</strong>
                  <small>{`ثبت‌کننده: ${item.actor}`}</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="fm-message">هنوز رخداد کافی برای ساخت جمع‌بندی کوتاه وجود ندارد.</div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="وضعیت فعلی ریسک"
          title="خلاصه قانون‌ها و تصویر فعلی فروشگاه"
          description="این بخش کمک می‌کند قانون‌های خودکار، دخالت‌های دستی و نتیجه نهایی را یک‌جا ببینی."
          hint="اگر بین چند تصمیم مردد هستی، از مقایسه این چهار کارت شروع کن."
          actions={<Pill tone="warning">مرور محدودیت‌ها</Pill>}
        >
          <div className="vendors-workspace-policy-grid">
            <article className="vendors-policy-item">
              <span>قانون خودکار</span>
              <strong>{formatPolicy(currentPolicy.auto)}</strong>
            </article>
            <article className="vendors-policy-item">
              <span>دخالت دستی</span>
              <strong>{formatPolicy(currentPolicy.manualOverride)}</strong>
            </article>
            <article className="vendors-policy-item">
              <span>قانون نهایی موثر</span>
              <strong>{formatPolicy(currentPolicy.effective)}</strong>
            </article>
            <article className="vendors-policy-item">
              <span>آخرین به‌روزرسانی سلامت</span>
              <strong>{formatJalaliDate(detailStore.vendorHealthCalculatedAt)}</strong>
            </article>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="فهرست رخدادها"
          title="رخدادهای ریسک و تصمیم‌های فروشنده"
          description="این فهرست برای ردگیری تغییرها، تصمیم‌ها و پیامدهای آن‌ها در همین صفحه نگه داشته شده است."
          hint="اگر می‌خواهی دلیل وضعیت فعلی فروشگاه را بفهمی، رخدادها را از جدید به قدیم مرور کن."
          actions={<Pill tone="success">{`${new Intl.NumberFormat('fa-IR').format(timeline.length)} رخداد`}</Pill>}
        >
          {timelineFeed.length ? (
            <ActivityFeed items={timelineFeed} />
          ) : (
            <div className="fm-message">برای این فروشنده هنوز رخداد قابل‌نمایشی وجود ندارد.</div>
          )}
        </SectionCard>
      </LoadableState>
    </div>
  )
}

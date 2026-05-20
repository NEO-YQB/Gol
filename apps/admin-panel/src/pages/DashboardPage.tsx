import { SectionCard, Spotlight, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi, apiConfig } from '../lib/api'
import { makeFeed, toArray } from '../lib/normalize'
import { hasPermission, hasRole } from '../lib/permissions'
import type { AuthSession } from '../lib/session'

type DashboardPayload = {
  stats: Array<{
    label: string
    value: string
    delta: string
    detail: string
    tone: 'primary' | 'success' | 'warning' | 'danger'
  }>
  feed: Array<{
    id: string
    title: string
    meta: string
    description: string
    tone?: 'primary' | 'success' | 'warning' | 'danger'
  }>
  spotlight: {
    eyebrow: string
    title: string
    description: string
    metrics: Array<{ label: string; value: string }>
  }
  notes: {
    eyebrow: string
    title: string
    description: string
    bullets: string[]
  }
}

function countOf(value: unknown) {
  return toArray(value).length
}

function isSeoSession(session: AuthSession) {
  return hasRole(session, 'SEO_MANAGER') || hasRole(session, 'CONTENT_EDITOR') || hasRole(session, 'CONTENT_WRITER')
}

function isFinanceSession(session: AuthSession) {
  return hasRole(session, 'FINANCE_OPERATOR') || hasPermission(session, 'read', 'StoreWallet')
}

function isSupportSession(session: AuthSession) {
  return hasRole(session, 'SUPPORT_AGENT') || hasPermission(session, 'read', 'SupportTicket')
}

function isAccessSession(session: AuthSession) {
  return hasRole(session, 'ACCESS_MANAGER') || hasPermission(session, 'read', 'AdminUser')
}

async function buildDashboardPayload(session: AuthSession): Promise<DashboardPayload> {
  if (hasPermission(session, 'manage', 'all')) {
    const [orders, alerts, tickets, notifications] = await Promise.all([
      adminApi.getAdminOrders(session),
      adminApi.getAlerts(session),
      adminApi.getSupportTickets(session),
      adminApi.getNotifications(session),
    ])

    return {
      stats: [
        { label: 'سفارش های جاری', value: String(countOf(orders)), delta: 'عملیات امروز', detail: 'ورودی اصلی برای تصمیم های سفارش و استثناها', tone: 'primary' },
        { label: 'هشدارهای باز', value: String(countOf(alerts)), delta: 'نیازمند رسیدگی', detail: 'alertهایی که هنوز بسته یا snooze نشده اند', tone: 'danger' },
        { label: 'تیکت های فعال', value: String(countOf(tickets)), delta: 'در صف پشتیبانی', detail: 'تیکت هایی که نیاز به پیگیری یا تصمیم مالی دارند', tone: 'warning' },
        { label: 'اعلان های اخیر', value: String(countOf(notifications)), delta: 'لایه اطلاع رسانی', detail: 'نمای سریع از صف اعلان ها و dispatchها', tone: 'success' },
      ],
      feed: [...makeFeed(toArray(alerts), 'هشدار عملیاتی'), ...makeFeed(toArray(notifications), 'اعلان سیستمی')].slice(0, 6),
      spotlight: {
        eyebrow: 'نمای مدیر کل',
        title: 'این نشست همه laneهای اصلی پنل را در اختیار دارد',
        description: 'داشبورد مدیر کل باید هم data-dense باشد و هم سریع؛ بنابراین فقط summaryهای تصمیم ساز را در لایه اول نشان می دهد.',
        metrics: [
          { label: 'API پایه', value: apiConfig.baseUrl },
          { label: 'کاربر فعلی', value: session.user.fullName || session.user.phoneNumber },
          { label: 'نقش های نشست', value: session.user.roles.join(' / ') || '—' },
          { label: 'سطح پنل', value: 'مدیر کل' },
        ],
      },
      notes: {
        eyebrow: 'اولویت امروز',
        title: 'ادمین باید از اینجا تصویر کامل و سریع بگیرد',
        description: 'در سطح مدیر کل، این داشبورد فقط برای شروع تصمیم است؛ کار سنگین در workspaceهای تخصصی انجام می شود.',
        bullets: [
          'هشدارهای باز را قبل از انباشته شدن ببند یا snooze کن.',
          'سفارش های مسئله دار را به workspace سفارش بفرست.',
          'تیکت هایی که به مالی رسیده اند را در lane مالی و پشتیبانی هماهنگ کن.',
        ],
      },
    }
  }

  if (isSeoSession(session)) {
    const [articles, audits, authors, categories] = await Promise.all([
      adminApi.getArticles(session, { page: 1, limit: 100 }),
      adminApi.getContentAudits(session),
      adminApi.getAuthors(session),
      adminApi.getArticleCategories(session),
    ])

    return {
      stats: [
        { label: 'مقاله های قابل مشاهده', value: String(countOf(articles)), delta: 'کارتابل محتوا', detail: 'حجم فعلی مقاله هایی که این نقش می تواند ببیند', tone: 'primary' },
        { label: 'یافته های پایش محتوا', value: String(countOf(audits)), delta: 'اولویت سئو', detail: 'مواردی که نیاز به تکمیل برچسب، کلیدواژه یا ساختار دارند', tone: 'warning' },
        { label: 'نویسنده های فعال', value: String(countOf(authors)), delta: 'تیم محتوا', detail: 'نویسنده هایی که در چرخه فعلی محتوا فعال اند', tone: 'success' },
        { label: 'دسته بندی های محتوایی', value: String(countOf(categories)), delta: 'ساختار سایت', detail: 'چیدمان فعلی taxonomy برای توسعه محتوا و crawlability', tone: 'danger' },
      ],
      feed: [...makeFeed(toArray(audits), 'پایش محتوایی'), ...makeFeed(toArray(articles), 'مقاله')].slice(0, 6),
      spotlight: {
        eyebrow: 'نمای تیم محتوا و سئو',
        title: 'این نشست برای انتشار، پایش و بهینه سازی محتوا آماده است',
        description: 'در سطح محتوایی، داشبورد باید به جای داده های غیرمرتبط، مسیر تولید، ویرایش و رفع گره های SEO را نشان دهد.',
        metrics: [
          { label: 'مقاله', value: String(countOf(articles)) },
          { label: 'پایش', value: String(countOf(audits)) },
          { label: 'نویسنده', value: String(countOf(authors)) },
          { label: 'نشست', value: 'تحریریه / سئو' },
        ],
      },
      notes: {
        eyebrow: 'گام بعدی',
        title: 'تمرکز این نقش باید روی کیفیت و انتشار باشد',
        description: 'این نقش لازم نیست با laneهای مالی یا هشدارهای unrelated درگیر شود؛ فقط تصمیم های محتوایی را در سطح اول ببیند.',
        bullets: [
          'مقاله های ناقص از نظر برچسب یا کلیدواژه را اولویت بندی کن.',
          'ویرایش و انتشار را از workspace محتوایی انجام بده.',
          'taxonomy را قبل از رشد listingها منسجم نگه دار.',
        ],
      },
    }
  }

  if (isFinanceSession(session)) {
    const [wallets, financeSummary, refunds] = await Promise.all([
      adminApi.getWallets(session),
      adminApi.getFinanceSummary(session),
      adminApi.getRefundSummary(session),
    ])

    return {
      stats: [
        { label: 'کیف پول های قابل مشاهده', value: String(countOf(wallets)), delta: 'لایه مالی', detail: 'فروشگاه هایی که در این نشست برایشان visibility مالی وجود دارد', tone: 'primary' },
        { label: 'خلاصه مالی', value: String(countOf(financeSummary)), delta: 'وضعیت تجمعی', detail: 'نمای فشرده روی کیف پول و settlementها', tone: 'success' },
        { label: 'بازگشت وجه / برگشت', value: String(countOf(refunds)), delta: 'پیگیری مالی', detail: 'خلاصه وضعیت refund و reversal برای تصمیم گیری مالی', tone: 'warning' },
        { label: 'دامنه این نقش', value: 'مالی', delta: 'نقش تخصصی', detail: 'این داشبورد فقط روی laneهای مالی متمرکز می ماند', tone: 'danger' },
      ],
      feed: [...makeFeed(toArray(wallets), 'کیف پول'), ...makeFeed(toArray(refunds), 'بازگشت وجه')].slice(0, 6),
      spotlight: {
        eyebrow: 'نمای اپراتور مالی',
        title: 'این نشست فقط summaryهای مالی و settlement را در سطح اول می بیند',
        description: 'اپراتور مالی نباید با laneهای تحریریه یا مدیریت دسترسی شلوغ شود؛ فقط داده هایی را ببیند که برای تصمیم مالی لازم است.',
        metrics: [
          { label: 'کیف پول', value: String(countOf(wallets)) },
          { label: 'خلاصه مالی', value: String(countOf(financeSummary)) },
          { label: 'بازگشت', value: String(countOf(refunds)) },
          { label: 'نشست', value: 'مالی و تسویه' },
        ],
      },
      notes: {
        eyebrow: 'دستور کار',
        title: 'تمرکز این نقش باید روی خطاها و استثناهای مالی بماند',
        description: 'لایه اول برای اپراتور مالی باید کوتاه، شفاف و قابل اقدام باشد.',
        bullets: [
          'کیف پول های مسئله دار را در workspace مالی دنبال کن.',
          'خلاصه refundها را با تیکت ها و سفارش های مرتبط تطبیق بده.',
          'از این سطح فقط وارد مسیرهای مالی و settlement شو.',
        ],
      },
    }
  }

  if (isSupportSession(session)) {
    const [tickets, followUps] = await Promise.all([
      adminApi.getSupportTickets(session),
      adminApi.getSupportFollowUps(session),
    ])

    return {
      stats: [
        { label: 'تیکت های قابل رسیدگی', value: String(countOf(tickets)), delta: 'صف اصلی', detail: 'حجم فعلی ticketهایی که نیازمند رسیدگی هستند', tone: 'primary' },
        { label: 'پیگیری های باز', value: String(countOf(followUps)), delta: 'مورد فعال', detail: 'follow-upهایی که هنوز باید بسته یا ادامه داده شوند', tone: 'warning' },
        { label: 'دامنه این نقش', value: 'پشتیبانی', delta: 'تمرکز عملیاتی', detail: 'این نقش فقط laneهای تیکت و رسیدگی بعدی را می بیند', tone: 'success' },
        { label: 'سطح پنل', value: 'هدفمند', delta: 'بدون شلوغی', detail: 'navigation و dashboard برای رسیدگی سریع تنظیم شده است', tone: 'danger' },
      ],
      feed: [...makeFeed(toArray(followUps), 'پیگیری پشتیبانی'), ...makeFeed(toArray(tickets), 'تیکت')].slice(0, 6),
      spotlight: {
        eyebrow: 'نمای اپراتور پشتیبانی',
        title: 'این نشست برای queue پشتیبانی و follow-upها بهینه شده است',
        description: 'اپراتور پشتیبانی باید به سرعت ticketها را اسکن کند و از همینجا به workspace رسیدگی وارد شود.',
        metrics: [
          { label: 'تیکت', value: String(countOf(tickets)) },
          { label: 'پیگیری', value: String(countOf(followUps)) },
          { label: 'کاربر فعلی', value: session.user.fullName || session.user.phoneNumber },
          { label: 'نشست', value: 'پشتیبانی' },
        ],
      },
      notes: {
        eyebrow: 'اقدام سریع',
        title: 'این نقش باید فقط آنچه برای رسیدگی لازم است ببیند',
        description: 'سطح اول پشتیبانی باید واضح، کم نویز و queue-oriented باشد.',
        bullets: [
          'ticketهای باز و follow-upهای overdue را زودتر بررسی کن.',
          'در صورت نیاز به تصمیم مالی، تیکت را به lane مناسب escalate کن.',
          'جزئیات و noteها را در workspace پشتیبانی ثبت کن.',
        ],
      },
    }
  }

  if (isAccessSession(session)) {
    const [users, roles, permissions] = await Promise.all([
      adminApi.getAccessControlUsers(session, { page: 1, limit: 12 }),
      adminApi.getAccessControlRoles(session),
      adminApi.getAccessControlPermissions(session, { page: 1, limit: 20 }),
    ])

    return {
      stats: [
        { label: 'کاربران قابل مدیریت', value: String(countOf((users as Record<string, unknown>)?.data)), delta: 'دامنه دسترسی', detail: 'کاربرهایی که این نشست می تواند ببیند یا مدیریت کند', tone: 'primary' },
        { label: 'نقش های ثبت شده', value: String(countOf(roles)), delta: 'ماتریس نقش', detail: 'roleهای تعریف شده برای تیم های مختلف پنل', tone: 'warning' },
        { label: 'دسترسی های مرجع', value: String(countOf((permissions as Record<string, unknown>)?.data)), delta: 'کاتالوگ پنل', detail: 'permissionهایی که navigation و actionها را شکل می دهند', tone: 'success' },
        { label: 'سطح نشست', value: 'مدیریت دسترسی', delta: 'نقش تخصصی', detail: 'این dashboard برای user/role/permission flow طراحی شده است', tone: 'danger' },
      ],
      feed: [...makeFeed(toArray((users as Record<string, unknown>)?.data), 'کاربر'), ...makeFeed(toArray(roles), 'نقش')].slice(0, 6),
      spotlight: {
        eyebrow: 'نمای مدیر دسترسی',
        title: 'این نشست باید سریع و شفاف روی کاربران، نقش ها و دسترسی ها متمرکز بماند',
        description: 'مدیر دسترسی نیازی به laneهای unrelated ندارد؛ سطح اول باید فقط برای کنترل user/role/permission بهینه باشد.',
        metrics: [
          { label: 'کاربر', value: String(countOf((users as Record<string, unknown>)?.data)) },
          { label: 'نقش', value: String(countOf(roles)) },
          { label: 'دسترسی', value: String(countOf((permissions as Record<string, unknown>)?.data)) },
          { label: 'نشست', value: 'مدیریت دسترسی' },
        ],
      },
      notes: {
        eyebrow: 'حساسیت این نقش',
        title: 'هر تغییر دسترسی باید آگاهانه و کم خطا انجام شود',
        description: 'این نقش باید داده های access-control را بدون نویز اضافی و با summaryهای قابل تصمیم ببیند.',
        bullets: [
          'کاربر جدید را با کمترین نقش لازم بساز.',
          'نقش های پرقدرت را فقط در صورت نیاز واقعی assign کن.',
          'پیش از تغییر permission، دامنه اثر آن را در workspace بررسی کن.',
        ],
      },
    }
  }

  return {
    stats: [
      { label: 'نشست فعال', value: '1', delta: 'کاربر احراز شده', detail: 'این حساب وارد پنل شده اما هنوز lane تخصصی واضحی برای آن تعریف نشده است', tone: 'primary' },
      { label: 'نقش های نشست', value: String(session.user.roles.length), delta: 'نقش ثبت شده', detail: 'فهرست نقش ها در بالا قابل مشاهده است', tone: 'warning' },
      { label: 'دسترسی های موثر', value: String(session.bootstrap?.effectivePermissions.length ?? 0), delta: 'bootstrap شده', detail: 'فرانت بر اساس این سطح، routeها و actionها را می سازد', tone: 'success' },
      { label: 'وضعیت پنل', value: 'آماده', delta: 'قابل استفاده', detail: 'اگر route مجاز داشته باشی، از navigation وارد lane مرتبط شو', tone: 'danger' },
    ],
    feed: [],
    spotlight: {
      eyebrow: 'نشست محدود',
      title: 'این نشست با دسترسی محدود وارد شده است',
      description: 'اگر routeهای کمی می بینی، به این دلیل است که shell دقیقا بر اساس permissionهای موثر پنل را محدود کرده است.',
      metrics: [
        { label: 'کاربر فعلی', value: session.user.fullName || session.user.phoneNumber },
        { label: 'نقش ها', value: session.user.roles.join(' / ') || '—' },
        { label: 'دسترسی موثر', value: String(session.bootstrap?.effectivePermissions.length ?? 0) },
        { label: 'API پایه', value: apiConfig.baseUrl },
      ],
    },
    notes: {
      eyebrow: 'راهنمای سریع',
      title: 'هر آنچه می بینی بر اساس نقش واقعی تو فیلتر شده است',
      description: 'در این پروژه، پنل برای هر کاربر عمدا تمام routeها را نشان نمی دهد.',
      bullets: [
        'از همان routeهایی استفاده کن که در navigation برایت باز شده اند.',
        'اگر نیاز به سطح بیشتری داری، role و permission باید از سمت مدیر دسترسی تنظیم شود.',
      ],
    },
  }
}

export function DashboardPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<DashboardPayload | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const nextPayload = await buildDashboardPayload(session)
        if (!active) return
        setPayload(nextPayload)
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری داشبورد نقش محور')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [session])

  const notes = useMemo(() => payload?.notes.bullets ?? [], [payload])

  return (
    <div className="fm-stack role-dashboard-page">
      <LoadableState error={error} loading={loading}>
        <div className="fm-grid role-dashboard-grid">
          {(payload?.stats ?? []).map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>
      </LoadableState>

      {payload ? (
        <Spotlight
          eyebrow={payload.spotlight.eyebrow}
          title={payload.spotlight.title}
          description={payload.spotlight.description}
          metrics={payload.spotlight.metrics}
        />
      ) : null}

      {payload ? (
        <SectionCard eyebrow={payload.notes.eyebrow} title={payload.notes.title} description={payload.notes.description}>
          <div className="dashboard-note-list dashboard-note-list--role-aware">
            {notes.length ? (
              notes.map((item) => (
                <article className="dashboard-note-item" key={item}>
                  <strong>{item}</strong>
                </article>
              ))
            ) : (
              <div className="fm-message">برای این نقش هنوز یادداشت عملیاتی ثبت نشده است.</div>
            )}
          </div>
        </SectionCard>
      ) : null}

      {payload?.feed?.length ? (
        <SectionCard eyebrow="رخدادهای مرتبط" title="فقط فید مرتبط با همین نقش" description="در سطح اول فقط رخدادهایی نشان داده می شوند که برای تصمیم همین نقش مفید باشند.">
          <div className="dashboard-feed-list">
            {payload.feed.map((item) => (
              <article className="dashboard-feed-item" key={item.id}>
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  )
}

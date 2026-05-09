import {
  ActivityFeed,
  AppShell,
  DataTable,
  Pill,
  SectionCard,
  Spotlight,
  StatCard,
  type FeedItem,
  type NavSection,
  type StatItem,
  type TableColumn,
  type TableRow,
} from '@frontend-core'
import './App.css'

const adminNav: NavSection[] = [
  {
    title: 'عملیات اصلی',
    items: [
      { label: 'داشبورد', hint: 'خلاصه وضعیت کل مارکت‌پلیس', active: true },
      { label: 'سفارش‌ها', hint: 'پردازش، مانیتورینگ و exceptions', badge: '128' },
      { label: 'پرداخت و تسویه', hint: 'wallet, ledger, release, reversal' },
      { label: 'پشتیبانی', hint: 'ticket, finance decision, escalation', badge: '23' },
    ],
  },
  {
    title: 'کنترل و رشد',
    items: [
      { label: 'فروشندگان و ریسک', hint: 'health score, policy, watchlist' },
      { label: 'محتوا و SEO', hint: 'article, taxonomy, audit, search' },
      { label: 'هشدارها و اعلان‌ها', hint: 'alert lifecycle, notification ops', badge: '9' },
      { label: 'گزارش‌های مالی', hint: 'summary, trend, audit visibility' },
    ],
  },
]

const stats: StatItem[] = [
  {
    label: 'سفارش‌های نیازمند بررسی',
    value: '128',
    delta: '+14 امروز',
    detail: 'ترکیب review payment، settlement hold و support follow-up',
    tone: 'warning',
  },
  {
    label: 'تسویه‌های آماده release',
    value: '42',
    delta: '87% سالم',
    detail: 'مبتنی بر policy effective snapshot و health gating',
    tone: 'success',
  },
  {
    label: 'alertهای باز',
    value: '9',
    delta: '3 بحرانی',
    detail: 'ترکیب risk policy، payment anomaly و support escalations',
    tone: 'danger',
  },
  {
    label: 'وظایف محتوایی SEO',
    value: '31',
    delta: '6 قابل انتشار',
    detail: 'article audit، keyword gap و taxonomy hygiene',
    tone: 'primary',
  },
]

const queueColumns: TableColumn[] = [
  { key: 'queue', label: 'صف' },
  { key: 'owner', label: 'مسئول' },
  { key: 'sla', label: 'SLA' },
  { key: 'status', label: 'وضعیت' },
]

const queueRows: TableRow[] = [
  {
    id: '1',
    queue: 'refund / reversal review',
    owner: 'finance ops',
    sla: '17 دقیقه',
    status: 'نیازمند تصمیم',
  },
  {
    id: '2',
    queue: 'vendor at-risk watchlist',
    owner: 'risk desk',
    sla: '43 دقیقه',
    status: 'در حال پایش',
  },
  {
    id: '3',
    queue: 'content SEO audit',
    owner: 'content team',
    sla: 'امروز',
    status: 'قابل اقدام',
  },
  {
    id: '4',
    queue: 'notification dispatch failures',
    owner: 'ops control',
    sla: '9 دقیقه',
    status: 'نیازمند بازبینی',
  },
]

const feedItems: FeedItem[] = [
  {
    id: '1',
    title: 'hold خودکار برای settlement یک فروشنده اعمال شد',
    meta: '10 دقیقه پیش',
    description: 'health score فروشگاه به مرز AT_RISK رسیده و policy موثر به‌روزرسانی شده است.',
    tone: 'warning',
  },
  {
    id: '2',
    title: 'مقاله راهنمای انتخاب گل آپدیت و آماده publish شد',
    meta: '27 دقیقه پیش',
    description: 'focus keyword و canonical بررسی شده و audit SEO مورد تایید قرار گرفته است.',
    tone: 'success',
  },
  {
    id: '3',
    title: 'payment anomaly برای یک batch از سفارش‌ها ثبت شد',
    meta: '46 دقیقه پیش',
    description: 'پنل باید مسیر رسیدگی سریع، timeline و drill-down روشن برای تیم عملیات داشته باشد.',
    tone: 'danger',
  },
]

export default function App() {
  return (
    <AppShell
      tone="admin"
      productName="Admin Control Center"
      productSubtitle="Flower Marketplace Operations"
      workspaceLabel="Admin panel"
      userName="افشین"
      userRole="Platform admin"
      pageEyebrow="FE-1 / Foundation"
      pageTitle="Foundation پنل ادمین شکل گرفت"
      pageDescription="این خروجی عمدا روی app shell، hierarchy، component patterns و data-heavy layout تمرکز دارد تا قبل از ورود به routing و integration عمیق، ساختار کلی پنل به‌صورت واقعی چکش‌کاری شود."
      navSections={adminNav}
      actions={[
        { label: 'ایجاد alert view', tone: 'ghost' },
        { label: 'مرور معماری محتوا', tone: 'secondary' },
        { label: 'شروع domain integration', tone: 'primary' },
      ]}
    >
      <div className="fm-grid">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <Spotlight
        eyebrow="Operational blueprint"
        title="ساختار کلی برای یک مارکت‌پلیس بزرگ باید از اولین قدم قابلیت scale داشته باشد"
        description="در این نسخه، تمرکز روی یک shell مشترک، table pattern، summary cards، activity feed و visual language یکپارچه است تا بعدا domainهای order, settlement, support, finance و content بدون آشفتگی روی آن سوار شوند."
        metrics={[
          { label: 'shared tokens', value: 'فعال' },
          { label: 'layout system', value: 'مشترک' },
          { label: 'role-aware surfaces', value: 'آماده' },
          { label: 'design direction', value: 'premium ops' },
        ]}
      >
        <div className="fm-chip-row">
          <span className="fm-chip">sidebar چندبخشی</span>
          <span className="fm-chip">topbar اقدام‌محور</span>
          <span className="fm-chip">table-first interfaces</span>
          <span className="fm-chip">state-friendly cards</span>
          <span className="fm-chip">foundation برای RBAC visibility</span>
        </div>
      </Spotlight>

      <div className="fm-two-column">
        <SectionCard
          eyebrow="Queue visibility"
          title="صف‌های اصلی عملیات"
          description="این بخش نشان می‌دهد که table pattern و hierarchy داده‌ای برای بخش‌های عملیاتی از همین حالا آماده است."
          actions={<Pill tone="warning">server-side ready</Pill>}
        >
          <DataTable columns={queueColumns} rows={queueRows} />
        </SectionCard>

        <SectionCard
          eyebrow="Live activity"
          title="فید رخدادها"
          description="timeline و event feed باید در domainهای alert، support، settlement و content قابل‌اتکا باشند."
          actions={<Pill tone="success">timeline-friendly</Pill>}
        >
          <ActivityFeed items={feedItems} />
        </SectionCard>
      </div>

      <div className="fm-three-column">
        <SectionCard
          eyebrow="Admin priorities"
          title="سطح‌های بعدی اجرا"
          description="فاز بعدی باید روی routing، auth/session و اتصال domainهای اصلی backend متمرکز شود."
        >
          <div className="admin-checklist">
            <article>
              <strong>1) shell to routes</strong>
              <p>تبدیل navigation فعلی به route-based workspace با page contracts مشخص.</p>
            </article>
            <article>
              <strong>2) auth + permissions</strong>
              <p>انطباق UI با RBAC backend و پنهان‌سازی actionهای خارج از scope نقش.</p>
            </article>
            <article>
              <strong>3) real data domains</strong>
              <p>شروع از orders، settlements، support و content dashboard summaries.</p>
            </article>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Visual rules"
          title="اصول یکدستی"
          description="این قواعد باید در تمام pageها حفظ شوند تا پنل ادمین شلوغ یا generic نشود."
        >
          <ul className="admin-rules">
            <li>رنگ فقط برای معنا، نه تزئین</li>
            <li>فضای سفید کنترل‌شده برای data density</li>
            <li>drawer و detail page به‌جای modalهای بی‌نظم</li>
            <li>summary بالا، drill-down پایین</li>
          </ul>
        </SectionCard>

        <SectionCard
          eyebrow="Backend alignment"
          title="آمادگی برای domainهای موجود"
          description="ساختار فعلی دقیقا با دامنه‌های تاییدشده backend align شده است."
        >
          <div className="admin-domain-pills">
            <Pill>orders</Pill>
            <Pill>payments</Pill>
            <Pill>settlements</Pill>
            <Pill>support</Pill>
            <Pill>policy</Pill>
            <Pill>alerts</Pill>
            <Pill>content</Pill>
            <Pill>notifications</Pill>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  )
}

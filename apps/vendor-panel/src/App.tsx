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
} from '@flower-marketplace/frontend-core'
import './App.css'

const vendorNav: NavSection[] = [
  {
    title: 'کارهای روزانه',
    items: [
      { key: 'overview', label: 'نمای کلی', hint: 'فروش، سفارش و کیفیت فروشگاه', active: true },
      { key: 'orders', label: 'سفارش‌ها', hint: 'آماده‌سازی، ارسال و پیگیری' },
      { key: 'wallet', label: 'تسویه و کیف پول', hint: 'held earning, release, finance visibility' },
      { key: 'support', label: 'پشتیبانی', hint: 'ticketها و follow-upها', badge: '4' },
    ],
  },
  {
    title: 'رشد فروشگاه',
    items: [
      { key: 'products', label: 'محصولات', hint: 'موجودی، قیمت و آماده‌سازی' },
      { key: 'discounts', label: 'تخفیف‌ها', hint: 'coupon, promotion, restrictions' },
      { key: 'reviews', label: 'review و health', hint: 'امتیاز، بازخورد و بهبود کیفیت' },
      { key: 'notifications', label: 'اعلان‌ها', hint: 'پیام‌های عملیاتی و هشدارها', badge: '11' },
    ],
  },
]

const stats: StatItem[] = [
  {
    label: 'سفارش‌های امروز',
    value: '36',
    delta: '+12 نسبت به دیروز',
    detail: 'درک سریع وضعیت روز، بدون شلوغی اضافه',
    tone: 'success',
  },
  {
    label: 'مبلغ آماده تسویه',
    value: '48.2M',
    delta: '7 مورد hold',
    detail: 'شفافیت مالی باید برای فروشنده فوری و قابل‌فهم باشد',
    tone: 'primary',
  },
  {
    label: 'میانگین رضایت',
    value: '4.7 / 5',
    delta: '+0.2 این هفته',
    detail: 'نمایش ساده اما دقیق از review و health score',
    tone: 'warning',
  },
  {
    label: 'پیگیری‌های باز',
    value: '6',
    delta: '2 فوری',
    detail: 'ticket، policy restriction و پیام‌های نیازمند اقدام',
    tone: 'danger',
  },
]

const orderColumns: TableColumn[] = [
  { key: 'order', label: 'سفارش' },
  { key: 'customer', label: 'مشتری' },
  { key: 'delivery', label: 'تحویل' },
  { key: 'status', label: 'وضعیت' },
]

const orderRows: TableRow[] = [
  {
    id: '1',
    order: '#FM-1208',
    customer: 'سارا رستگار',
    delivery: 'امروز / 18:00',
    status: 'در حال آماده‌سازی',
  },
  {
    id: '2',
    order: '#FM-1207',
    customer: 'مهدی حسینی',
    delivery: 'امروز / 20:00',
    status: 'آماده ارسال',
  },
  {
    id: '3',
    order: '#FM-1204',
    customer: 'پریناز محمدی',
    delivery: 'فردا / 11:00',
    status: 'نیازمند تایید موجودی',
  },
]

const feedItems: FeedItem[] = [
  {
    id: '1',
    title: 'یک review جدید برای سفارش تحویل‌شده ثبت شد',
    meta: '12 دقیقه پیش',
    description: 'پنل فروشنده باید بازخورد را در کنار health score و actionهای بهبود نمایش دهد.',
    tone: 'success',
  },
  {
    id: '2',
    title: 'policy محدودیت تخفیف برای فروشگاه اعمال شد',
    meta: '34 دقیقه پیش',
    description: 'visibility این تصمیم باید شفاف، انسانی و قابل پیگیری باشد.',
    tone: 'warning',
  },
  {
    id: '3',
    title: 'ticket جدید برای سفارش دیرتحویل ایجاد شد',
    meta: '1 ساعت پیش',
    description: 'priority، timeline و next step باید بدون بار شناختی اضافی دیده شوند.',
    tone: 'danger',
  },
]

export default function App() {
  return (
    <AppShell
      tone="vendor"
      productName="Vendor Workspace"
      productSubtitle="Store Operations & Growth"
      workspaceLabel="Vendor panel"
      userName="فروشگاه رزینا"
      userRole="Store owner"
      pageEyebrow="FE-1 / Foundation"
      pageTitle="Foundation پنل فروشنده با شخصیت مستقل آماده شد"
      pageDescription="پنل فروشنده باید از زبان طراحی مشترک استفاده کند، اما لحن آن انسانی‌تر، روشن‌تر و task-oriented باشد. این خروجی همین تمایز را از حالا نشان می‌دهد."
      navSections={vendorNav}
      actions={[
        { label: 'مشاهده اعلان‌ها', tone: 'ghost' },
        { label: 'مدیریت موجودی', tone: 'secondary' },
        { label: 'بررسی سفارش‌های امروز', tone: 'primary' },
      ]}
    >
      <div className="fm-grid">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <Spotlight
        eyebrow="Vendor experience"
        title="فروشنده باید سریع بفهمد امروز چه کاری مهم‌تر است و چرا"
        description="طراحی این پنل روی clarity، اعتماد و سرعت تصمیم‌گیری تمرکز دارد؛ نه روی data overload. هر widget باید به یک اقدام واقعی ختم شود."
        metrics={[
          { label: 'clarity level', value: 'بالا' },
          { label: 'daily tasks', value: 'مرتب' },
          { label: 'financial visibility', value: 'شفاف' },
          { label: 'shared system', value: 'یکپارچه' },
        ]}
      >
        <div className="fm-chip-row">
          <span className="fm-chip">friendly summaries</span>
          <span className="fm-chip">financial confidence</span>
          <span className="fm-chip">review-driven improvements</span>
          <span className="fm-chip">policy visibility</span>
        </div>
      </Spotlight>

      <div className="fm-two-column">
        <SectionCard
          eyebrow="Today queue"
          title="سفارش‌های نزدیک و نیازمند اقدام"
          description="الگوی table در پنل فروشنده باید ساده‌تر از ادمین باشد، اما همچنان حرفه‌ای و scale-ready بماند."
          actions={<Pill tone="primary">quick actions next</Pill>}
        >
          <DataTable columns={orderColumns} rows={orderRows} />
        </SectionCard>

        <SectionCard
          eyebrow="Signals"
          title="سیگنال‌های مهم فروشگاه"
          description="ترکیب اعلان، بازخورد مشتری و محدودیت‌های policy در یک surface خوانا."
          actions={<Pill tone="warning">action-oriented</Pill>}
        >
          <ActivityFeed items={feedItems} />
        </SectionCard>
      </div>

      <div className="fm-three-column">
        <SectionCard
          eyebrow="Vendor principles"
          title="اصل‌های تجربه کاربری"
          description="پنل فروشنده باید استرس عملیاتی را کم کند، نه اینکه فقط داده نمایش دهد."
        >
          <ul className="vendor-principles">
            <li>هر summary باید به یک تصمیم روشن ختم شود</li>
            <li>زبان پیام‌ها انسانی و بدون ابهام باشد</li>
            <li>موجودی، سفارش و تسویه در دسترس‌ترین بخش‌ها باشند</li>
            <li>restrictionها شفاف و قابل اقدام نمایش داده شوند</li>
          </ul>
        </SectionCard>

        <SectionCard
          eyebrow="Readiness"
          title="اتصال به backend موجود"
          description="این foundation برای دامنه‌های فعال backend پروژه طراحی شده و از mock business دوری می‌کند."
        >
          <div className="vendor-domain-pills">
            <Pill>orders</Pill>
            <Pill>wallet</Pill>
            <Pill>settlement</Pill>
            <Pill>reviews</Pill>
            <Pill>health score</Pill>
            <Pill>support</Pill>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Next step"
          title="بعد از این foundation"
          description="گام بعدی باید route structure، session handling و integration واقعی order/finance باشد."
        >
          <div className="vendor-next-step">
            <strong>تمرکز پیشنهادی:</strong>
            <p>اول auth و shell routing، بعد dashboard overview، سپس orders و wallet/settlements.</p>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  )
}

import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi } from '../lib/api'
import { formatFaNumber, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type DiscountRecord = Record<string, unknown>

const discountColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'title', label: 'عنوان' },
  { key: 'product', label: 'محصول' },
  { key: 'value', label: 'مقدار' },
  { key: 'active', label: 'وضعیت' },
]

function getDiscountTitle(record: DiscountRecord) {
  return readText(record, ['title'], '—')
}

function getDiscountProduct(record: DiscountRecord) {
  const product = record.product
  if (typeof product === 'object' && product !== null) {
    return readText(product as DiscountRecord, ['name'], '—')
  }

  return readText(record, ['productName'], '—')
}

function getDiscountValue(record: DiscountRecord) {
  const valueType = readText(record, ['valueType'], 'UNKNOWN')
  const value = Number(readText(record, ['value'], '0'))
  const formatted = formatFaNumber(value)
  return valueType === 'PERCENTAGE' ? `${formatted}٪` : `${formatted} تومان`
}

function getDiscountState(record: DiscountRecord) {
  return record.isActive ? 'فعال' : 'غیرفعال'
}

function stateOptions(items: DiscountRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getDiscountState(item))))
  return ['ALL', ...unique]
}

export function DiscountsPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [discounts, setDiscounts] = useState<DiscountRecord[]>([])
  const [stateFilter, setStateFilter] = useState('ALL')
  const [selectedDiscountId, setSelectedDiscountId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const payload = await vendorApi.getVendorDiscounts(session, { limit: 50 })
        if (!active) return

        const discountList = toArray(payload)
        setDiscounts(discountList)
        if (discountList.length > 0) {
          setSelectedDiscountId(readText(discountList[0], ['id'], ''))
        }
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری تخفیف‌های فروشگاه')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [session])

  const filteredDiscounts = useMemo(
    () => discounts.filter((item) => (stateFilter === 'ALL' ? true : getDiscountState(item) === stateFilter)),
    [discounts, stateFilter],
  )

  useEffect(() => {
    if (filteredDiscounts.length === 0) {
      setSelectedDiscountId(null)
      return
    }

    const hasSelected = filteredDiscounts.some((item) => readText(item, ['id'], '') === selectedDiscountId)
    if (!hasSelected) {
      setSelectedDiscountId(readText(filteredDiscounts[0], ['id'], ''))
    }
  }, [filteredDiscounts, selectedDiscountId])

  const rows = useMemo(
    () =>
      filteredDiscounts.slice(0, 20).map((item, index) => ({
        id: readText(item, ['id'], String(index + 1)),
        title: getDiscountTitle(item),
        product: getDiscountProduct(item),
        value: getDiscountValue(item),
        active: getDiscountState(item),
      })),
    [filteredDiscounts],
  )

  const stats = useMemo(
    () => [
      {
        label: 'کل تخفیف‌ها',
        value: formatFaNumber(discounts.length),
        delta: `${formatFaNumber(filteredDiscounts.length)} در view فعلی`,
        detail: 'فهرست vendor discountهای فروشگاه',
        tone: 'primary' as const,
      },
      {
        label: 'تخفیف‌های فعال',
        value: formatFaNumber(discounts.filter((item) => item.isActive).length),
        delta: 'روی vitrine فروش',
        detail: 'تخفیف‌هایی که فعلا قابل اعمال‌اند',
        tone: 'success' as const,
      },
      {
        label: 'تخفیف‌های غیرفعال',
        value: formatFaNumber(discounts.filter((item) => !item.isActive).length),
        delta: 'آماده بازبینی',
        detail: 'موردهایی که برای فعال‌سازی بعدی نگه داشته شده‌اند',
        tone: 'warning' as const,
      },
      {
        label: 'محصول‌های دارای تخفیف',
        value: formatFaNumber(new Set(discounts.map((item) => readText(item, ['productId'], ''))).size),
        delta: 'پایه promotion بعدی',
        detail: 'coverage فعلی تخفیف روی محصولات',
        tone: 'danger' as const,
      },
    ],
    [discounts, filteredDiscounts.length],
  )

  const selectedDiscount = useMemo(
    () => filteredDiscounts.find((item) => readText(item, ['id'], '') === selectedDiscountId) ?? null,
    [filteredDiscounts, selectedDiscountId],
  )

  const selectedSummary = selectedDiscount
    ? [
        { label: 'شناسه', value: readText(selectedDiscount, ['id'], '—') },
        { label: 'عنوان', value: getDiscountTitle(selectedDiscount) },
        { label: 'محصول', value: getDiscountProduct(selectedDiscount) },
        { label: 'وضعیت', value: getDiscountState(selectedDiscount) },
        { label: 'مقدار', value: getDiscountValue(selectedDiscount) },
        { label: 'اولویت', value: readText(selectedDiscount, ['priority'], '—') },
        { label: 'شروع', value: readText(selectedDiscount, ['startAt'], '—') },
        { label: 'پایان', value: readText(selectedDiscount, ['endAt'], '—') },
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
          eyebrow="کارتابل تخفیف‌ها"
          title="workspace تخفیف‌ها و promotion readiness"
          description="این route دید روشنی روی vendor discountها می‌دهد و آماده است تا بعدا actionهای create/edit و promotion flow روی آن سوار شوند."
          actions={<Pill tone="primary">تخفیف‌ها v1</Pill>}
        >
          <div className="vendor-discounts-filters">
            {stateOptions(discounts).map((status) => (
              <button
                className={`vendor-discounts-filter-chip ${status === stateFilter ? 'is-active' : ''}`}
                key={status}
                onClick={() => setStateFilter(status)}
                type="button"
              >
                {status === 'ALL' ? 'همه وضعیت‌ها' : status}
              </button>
            ))}
          </div>
        </SectionCard>

        <div className="vendor-discounts-layout">
          <SectionCard
            eyebrow="جدول تخفیف‌ها"
            title="لیست تخفیف‌های فروشگاه"
            description="فروشنده باید سریع ببیند کدام تخفیف فعال است، روی چه محصولی نشسته و چه موردی نیاز به بازبینی دارد."
            actions={<Pill tone="success">{`${formatFaNumber(filteredDiscounts.length)} تخفیف`}</Pill>}
          >
            <div className="vendor-discounts-table-card">
              <DataTable columns={discountColumns} rows={rows} />

              <div className="vendor-discounts-selection-list">
                {filteredDiscounts.slice(0, 8).map((item) => {
                  const id = readText(item, ['id'], '—')
                  const isActive = id === selectedDiscountId

                  return (
                    <button
                      className={`vendor-discounts-selection-item ${isActive ? 'is-active' : ''}`}
                      key={id}
                      onClick={() => setSelectedDiscountId(id)}
                      type="button"
                    >
                      <strong>{getDiscountTitle(item)}</strong>
                      <span>{getDiscountProduct(item)}</span>
                      <small>{getDiscountState(item)}</small>
                    </button>
                  )
                })}
              </div>
            </div>
          </SectionCard>

          <div className="vendor-discounts-detail-column">
            <SectionCard
              eyebrow="تخفیف انتخاب‌شده"
              title={selectedDiscount ? getDiscountTitle(selectedDiscount) : 'تخفیفی انتخاب نشده'}
              description="این summary پایه detail panel و actionهای بعدی برای discount management و promotion flow است."
              actions={<Pill tone="warning">{selectedDiscount ? getDiscountState(selectedDiscount) : 'بدون انتخاب'}</Pill>}
            >
              {selectedSummary.length ? (
                <div className="vendor-discounts-detail-grid">
                  {selectedSummary.map((item) => (
                    <article className="vendor-discounts-detail-item" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                  <article className="vendor-discounts-detail-item vendor-discounts-detail-item--wide">
                    <span>یادداشت کارتابل</span>
                    <strong>
                      مرحله بعدی این بخش می‌تواند create/edit discount، scheduling دقیق‌تر، stack policy و promotion actionها را روی همین ساختار سوار کند.
                    </strong>
                  </article>
                </div>
              ) : (
                <div className="vendor-note-card">در این فیلتر هنوز تخفیفی برای نمایش جزئیات وجود ندارد.</div>
              )}
            </SectionCard>
          </div>
        </div>
      </LoadableState>
    </div>
  )
}

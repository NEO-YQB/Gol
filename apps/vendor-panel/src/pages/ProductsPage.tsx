import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi } from '../lib/api'
import { formatFaNumber, makeRows, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type ProductRecord = Record<string, unknown>

const productColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'name', label: 'محصول' },
  { key: 'category', label: 'دسته' },
  { key: 'price', label: 'قیمت' },
  { key: 'quantity', label: 'موجودی' },
]

function getProductName(record: ProductRecord) {
  return readText(record, ['name'], '—')
}

function getProductCategory(record: ProductRecord) {
  const category = record.category
  if (typeof category === 'object' && category !== null) {
    return readText(category as ProductRecord, ['name', 'title'], '—')
  }

  return readText(record, ['categoryName'], '—')
}

function getProductQuantity(record: ProductRecord) {
  return Number(readText(record, ['quantity'], '0'))
}

function getProductPrice(record: ProductRecord) {
  return Number(readText(record, ['price'], '0'))
}

function getDiscountPrice(record: ProductRecord) {
  const raw = readText(record, ['discountPrice'], '')
  if (!raw) return null
  const numeric = Number(raw)
  return Number.isNaN(numeric) ? null : numeric
}

function getInventoryState(record: ProductRecord) {
  const quantity = getProductQuantity(record)
  const discountPrice = getDiscountPrice(record)

  if (quantity <= 0) return 'ناموجود'
  if (quantity <= 5) return 'کم‌موجودی'
  if (discountPrice !== null && discountPrice > 0) return 'دارای تخفیف'
  return 'عادی'
}

function inventoryOptions(items: ProductRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getInventoryState(item))))
  return ['ALL', ...unique]
}

export function ProductsPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [search, setSearch] = useState('')
  const [inventoryFilter, setInventoryFilter] = useState('ALL')
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const health = await vendorApi.getHealthSummary(session)
        if (!active) return

        const store = (((health as Record<string, unknown>).store as Record<string, unknown>) ?? {})
        const storeId = Number(readText(store, ['id'], '0'))

        if (!storeId) {
          setProducts([])
          setSelectedProductId(null)
          return
        }

        const payload = await vendorApi.getProducts(session, {
          storeId,
          search,
          limit: 50,
        })
        if (!active) return

        const productList = toArray(payload)
        setProducts(productList)
        if (productList.length > 0) {
          setSelectedProductId(readText(productList[0], ['id'], ''))
        }
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری محصولات فروشگاه')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [search, session])

  const filteredProducts = useMemo(
    () =>
      products.filter((item) =>
        inventoryFilter === 'ALL' ? true : getInventoryState(item) === inventoryFilter,
      ),
    [inventoryFilter, products],
  )

  useEffect(() => {
    if (filteredProducts.length === 0) {
      setSelectedProductId(null)
      return
    }

    const hasSelected = filteredProducts.some((item) => readText(item, ['id'], '') === selectedProductId)
    if (!hasSelected) {
      setSelectedProductId(readText(filteredProducts[0], ['id'], ''))
    }
  }, [filteredProducts, selectedProductId])

  const rows = useMemo(
    () =>
      makeRows(filteredProducts.slice(0, 20), [
        { key: 'id', source: ['id'] },
        { key: 'name', source: ['name'] },
        { key: 'category', source: ['categoryName'] },
        { key: 'price', source: ['price'] },
        { key: 'quantity', source: ['quantity'] },
      ]),
    [filteredProducts],
  )

  const stats = useMemo(
    () => [
      {
        label: 'کل محصولات',
        value: formatFaNumber(products.length),
        delta: `${formatFaNumber(filteredProducts.length)} در view فعلی`,
        detail: 'صف اصلی محصولات فروشگاه',
        tone: 'primary' as const,
      },
      {
        label: 'کم‌موجودی',
        value: formatFaNumber(products.filter((item) => getProductQuantity(item) > 0 && getProductQuantity(item) <= 5).length),
        delta: 'نیازمند تامین',
        detail: 'محصول‌هایی که به refill نزدیک شده‌اند',
        tone: 'warning' as const,
      },
      {
        label: 'ناموجود',
        value: formatFaNumber(products.filter((item) => getProductQuantity(item) <= 0).length),
        delta: 'خارج از چرخه فروش',
        detail: 'محصول‌هایی که فعلا موجودی ندارند',
        tone: 'danger' as const,
      },
      {
        label: 'دارای تخفیف',
        value: formatFaNumber(products.filter((item) => getDiscountPrice(item) !== null).length),
        delta: 'قابل‌استفاده برای promotion',
        detail: 'محصول‌هایی که discountPrice دارند',
        tone: 'success' as const,
      },
    ],
    [filteredProducts.length, products],
  )

  const selectedProduct = useMemo(
    () => filteredProducts.find((item) => readText(item, ['id'], '') === selectedProductId) ?? null,
    [filteredProducts, selectedProductId],
  )

  const selectedSummary = selectedProduct
    ? [
        { label: 'شناسه', value: readText(selectedProduct, ['id'], '—') },
        { label: 'نام محصول', value: getProductName(selectedProduct) },
        { label: 'دسته‌بندی', value: getProductCategory(selectedProduct) },
        { label: 'وضعیت موجودی', value: getInventoryState(selectedProduct) },
        { label: 'قیمت پایه', value: formatFaNumber(getProductPrice(selectedProduct)) },
        {
          label: 'قیمت با تخفیف',
          value: getDiscountPrice(selectedProduct) === null ? 'بدون تخفیف' : formatFaNumber(getDiscountPrice(selectedProduct) ?? 0),
        },
        { label: 'موجودی', value: formatFaNumber(getProductQuantity(selectedProduct)) },
        { label: 'اسلاگ', value: readText(selectedProduct, ['slug'], '—') },
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
          eyebrow="کارتابل محصولات"
          title="workspace محصولات فروشگاه"
          description="این route دیدی سریع روی موجودی، دسته‌ها و محصول‌های نیازمند توجه می‌سازد تا فروشنده برای domainهای بعدی آماده شود."
          actions={<Pill tone="primary">محصولات v1</Pill>}
        >
          <div className="vendor-products-toolbar">
            <div className="fm-field vendor-products-search">
              <label htmlFor="vendor-products-search">جستجو</label>
              <input
                id="vendor-products-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="نام محصول یا بخشی از عنوان"
                value={search}
              />
            </div>

            <div className="vendor-products-filters">
              {inventoryOptions(products).map((status) => (
                <button
                  className={`vendor-products-filter-chip ${status === inventoryFilter ? 'is-active' : ''}`}
                  key={status}
                  onClick={() => setInventoryFilter(status)}
                  type="button"
                >
                  {status === 'ALL' ? 'همه وضعیت‌ها' : status}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        <div className="vendor-products-layout">
          <SectionCard
            eyebrow="جدول محصولات"
            title="لیست محصولات قابل اسکن"
            description="فروشنده باید بتواند سریع ببیند کدام محصول نیاز به تامین، تخفیف یا بررسی بیشتر دارد."
            actions={<Pill tone="success">{`${formatFaNumber(filteredProducts.length)} محصول`}</Pill>}
          >
            <div className="vendor-products-table-card">
              <DataTable columns={productColumns} rows={rows} />

              <div className="vendor-products-selection-list">
                {filteredProducts.slice(0, 8).map((item) => {
                  const id = readText(item, ['id'], '—')
                  const isActive = id === selectedProductId

                  return (
                    <button
                      className={`vendor-products-selection-item ${isActive ? 'is-active' : ''}`}
                      key={id}
                      onClick={() => setSelectedProductId(id)}
                      type="button"
                    >
                      <strong>{getProductName(item)}</strong>
                      <span>{getProductCategory(item)}</span>
                      <small>{getInventoryState(item)}</small>
                    </button>
                  )
                })}
              </div>
            </div>
          </SectionCard>

          <div className="vendor-products-detail-column">
            <SectionCard
              eyebrow="محصول انتخاب‌شده"
              title={selectedProduct ? getProductName(selectedProduct) : 'محصولی انتخاب نشده'}
              description="این summary پایه detail panel بعدی برای products، inventory actionها و promotion surface است."
              actions={<Pill tone="warning">{selectedProduct ? getInventoryState(selectedProduct) : 'بدون انتخاب'}</Pill>}
            >
              {selectedSummary.length ? (
                <div className="vendor-products-detail-grid">
                  {selectedSummary.map((item) => (
                    <article className="vendor-products-detail-item" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                  <article className="vendor-products-detail-item vendor-products-detail-item--wide">
                    <span>یادداشت کارتابل</span>
                    <strong>
                      مرحله بعدی این بخش می‌تواند ویرایش موجودی، quick actionهای promotion و detail بیشتر محصول را روی همین ساختار سوار کند.
                    </strong>
                  </article>
                </div>
              ) : (
                <div className="vendor-note-card">در این فیلتر هنوز محصولی برای نمایش جزئیات وجود ندارد.</div>
              )}
            </SectionCard>
          </div>
        </div>
      </LoadableState>
    </div>
  )
}

import { DataTable, JalaliDatePicker, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi, type VendorDiscountPayload } from '../lib/api'
import { formatFaNumber, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type DiscountRecord = Record<string, unknown>
type ProductRecord = Record<string, unknown>

type DiscountFormState = {
  productId: string
  title: string
  description: string
  valueType: 'PERCENTAGE' | 'FIXED'
  value: string
  priority: string
  startAt: string
  endAt: string
  isActive: boolean
}

const discountColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'title', label: 'عنوان' },
  { key: 'product', label: 'محصول' },
  { key: 'value', label: 'مقدار' },
  { key: 'active', label: 'وضعیت' },
]

const initialFormState: DiscountFormState = {
  productId: '',
  title: '',
  description: '',
  valueType: 'PERCENTAGE',
  value: '',
  priority: '',
  startAt: '',
  endAt: '',
  isActive: true,
}

const jalaliDateTimeFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

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

function getProductName(record: ProductRecord) {
  return readText(record, ['name'], '—')
}

function stateOptions(items: DiscountRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getDiscountState(item))))
  return ['ALL', ...unique]
}

function buildPayload(form: DiscountFormState): VendorDiscountPayload {
  return {
    productId: Number(form.productId),
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    valueType: form.valueType,
    value: Number(form.value),
    priority: form.priority.trim() ? Number(form.priority) : undefined,
    startAt: form.startAt || undefined,
    endAt: form.endAt || undefined,
    isActive: form.isActive,
  }
}

function formatJalaliDateTime(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return '—'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return jalaliDateTimeFormatter.format(parsed)
}

export function DiscountsPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [discounts, setDiscounts] = useState<DiscountRecord[]>([])
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [stateFilter, setStateFilter] = useState('ALL')
  const [selectedDiscountId, setSelectedDiscountId] = useState<string | null>(null)
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null)
  const [form, setForm] = useState<DiscountFormState>(initialFormState)

  async function loadDiscountData(activeRef = { current: true }) {
    const health = await vendorApi.getHealthSummary(session)
    if (!activeRef.current) return

    const store = (((health as Record<string, unknown>).store as Record<string, unknown>) ?? {})
    const storeId = Number(readText(store, ['id'], '0'))

    const [discountPayload, productsPayload] = await Promise.all([
      vendorApi.getVendorDiscounts(session, { limit: 50 }),
      storeId ? vendorApi.getProducts(session, { storeId, limit: 100 }) : Promise.resolve({ data: [] }),
    ])
    if (!activeRef.current) return

    const discountList = toArray(discountPayload)
    const productList = toArray(productsPayload)
    setDiscounts(discountList)
    setProducts(productList)

    if (discountList.length > 0) {
      setSelectedDiscountId((current) => current ?? readText(discountList[0], ['id'], ''))
    }

    if (productList.length > 0) {
      setForm((current) => ({
        ...current,
        productId: current.productId || readText(productList[0], ['id'], ''),
      }))
    }
  }

  useEffect(() => {
    const activeRef = { current: true }

    async function load() {
      setLoading(true)
      setError(null)

      try {
        await loadDiscountData(activeRef)
      } catch (loadError) {
        if (!activeRef.current) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری تخفیف‌های فروشگاه')
      } finally {
        if (activeRef.current) setLoading(false)
      }
    }

    void load()
    return () => {
      activeRef.current = false
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
        { label: 'شروع', value: formatJalaliDateTime(selectedDiscount.startAt) },
        { label: 'پایان', value: formatJalaliDateTime(selectedDiscount.endAt) },
      ]
    : []

  function handleStartCreate() {
    setEditingDiscountId(null)
    setFormError(null)
    setFormMessage(null)
    setForm((current) => ({
      ...initialFormState,
      productId: current.productId || (products.length > 0 ? readText(products[0], ['id'], '') : ''),
    }))
  }

  function handleStartEdit() {
    if (!selectedDiscount) return

    setEditingDiscountId(readText(selectedDiscount, ['id'], ''))
    setFormError(null)
    setFormMessage(null)
    setForm({
      productId: readText(selectedDiscount, ['productId'], readText((selectedDiscount.product as ProductRecord) ?? {}, ['id'], '')),
      title: readText(selectedDiscount, ['title'], ''),
      description: readText(selectedDiscount, ['description'], ''),
      valueType: readText(selectedDiscount, ['valueType'], 'PERCENTAGE') === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
      value: readText(selectedDiscount, ['value'], ''),
      priority: readText(selectedDiscount, ['priority'], ''),
      startAt: readText(selectedDiscount, ['startAt'], ''),
      endAt: readText(selectedDiscount, ['endAt'], ''),
      isActive: Boolean(selectedDiscount.isActive),
    })
  }

  async function handleToggleActive() {
    if (!selectedDiscount) return

    setSaving(true)
    setFormError(null)
    setFormMessage(null)

    try {
      const nextState = !Boolean(selectedDiscount.isActive)
      await vendorApi.updateVendorDiscount(session, Number(readText(selectedDiscount, ['id'], '0')), {
        isActive: nextState,
      })
      setFormMessage(nextState ? 'تخفیف فعال شد.' : 'تخفیف غیرفعال شد.')
      await loadDiscountData({ current: true })
    } catch (toggleError) {
      setFormError(toggleError instanceof Error ? toggleError.message : 'تغییر وضعیت تخفیف ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedDiscount) return

    setSaving(true)
    setFormError(null)
    setFormMessage(null)

    try {
      await vendorApi.deleteVendorDiscount(session, Number(readText(selectedDiscount, ['id'], '0')))
      setFormMessage('تخفیف با موفقیت حذف شد.')
      setEditingDiscountId(null)
      await loadDiscountData({ current: true })
    } catch (deleteError) {
      setFormError(deleteError instanceof Error ? deleteError.message : 'حذف تخفیف ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    if (!form.productId || !form.title.trim() || !form.value.trim()) {
      setFormError('محصول، عنوان و مقدار تخفیف الزامی هستند.')
      return
    }

    setSaving(true)
    setFormError(null)
    setFormMessage(null)

    try {
      const payload = buildPayload(form)

      if (editingDiscountId) {
        await vendorApi.updateVendorDiscount(session, Number(editingDiscountId), {
          productId: payload.productId,
          title: payload.title,
          description: payload.description,
          valueType: payload.valueType,
          value: payload.value,
          priority: payload.priority,
          startAt: payload.startAt,
          endAt: payload.endAt,
          isActive: payload.isActive,
        })
        setFormMessage('تخفیف با موفقیت به‌روزرسانی شد.')
      } else {
        await vendorApi.createVendorDiscount(session, payload)
        setFormMessage('تخفیف جدید با موفقیت ایجاد شد.')
      }

      await loadDiscountData({ current: true })
      setEditingDiscountId(null)
      setForm((current) => ({
        ...initialFormState,
        productId: products.length > 0 ? readText(products[0], ['id'], '') : current.productId,
      }))
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'ذخیره تخفیف ناموفق بود')
    } finally {
      setSaving(false)
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
          eyebrow="کارتابل تخفیف‌ها"
          title="workspace تخفیف‌ها و promotion readiness"
          description="این route هم visibility می‌دهد و هم حالا سطح اولیه create/edit را برای vendor discountها باز می‌کند."
          actions={<Pill tone="primary">تخفیف‌ها v2</Pill>}
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
                      مرحله بعدی این بخش می‌تواند scheduling دقیق‌تر، stack policy و promotion actionها را روی همین ساختار سوار کند.
                    </strong>
                  </article>
                </div>
              ) : (
                <div className="vendor-note-card">در این فیلتر هنوز تخفیفی برای نمایش جزئیات وجود ندارد.</div>
              )}
            </SectionCard>

            <SectionCard
              eyebrow="مدیریت تخفیف"
              title={editingDiscountId ? 'ویرایش تخفیف انتخاب‌شده' : 'ایجاد تخفیف جدید'}
              description="در این مرحله فروشنده می‌تواند تخفیف جدید بسازد یا یک تخفیف موجود را به‌روزرسانی کند."
              actions={
                <div className="vendor-discounts-actions">
                  <button className="fm-button fm-button--ghost" onClick={handleStartCreate} type="button">
                    تخفیف جدید
                  </button>
                  <button
                    className="fm-button fm-button--secondary"
                    disabled={!selectedDiscount}
                    onClick={handleStartEdit}
                    type="button"
                  >
                    ویرایش انتخاب‌شده
                  </button>
                  <button
                    className="fm-button fm-button--ghost"
                    disabled={!selectedDiscount || saving}
                    onClick={handleToggleActive}
                    type="button"
                  >
                    {selectedDiscount?.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                  </button>
                  <button
                    className="fm-button fm-button--secondary"
                    disabled={!selectedDiscount || saving}
                    onClick={handleDelete}
                    type="button"
                  >
                    حذف انتخاب‌شده
                  </button>
                </div>
              }
            >
              <div className="vendor-discounts-form-grid">
                <div className="fm-field">
                  <label htmlFor="discount-product">محصول</label>
                  <select
                    id="discount-product"
                    onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}
                    value={form.productId}
                  >
                    {products.map((product) => {
                      const id = readText(product, ['id'], '')
                      return (
                        <option key={id} value={id}>
                          {getProductName(product)}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div className="fm-field">
                  <label htmlFor="discount-title">عنوان تخفیف</label>
                  <input
                    id="discount-title"
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="مثلا تخفیف آخر هفته"
                    value={form.title}
                  />
                </div>

                <div className="fm-field">
                  <label htmlFor="discount-value-type">نوع تخفیف</label>
                  <select
                    id="discount-value-type"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        valueType: event.target.value === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
                      }))
                    }
                    value={form.valueType}
                  >
                    <option value="PERCENTAGE">درصدی</option>
                    <option value="FIXED">مبلغ ثابت</option>
                  </select>
                </div>

                <div className="fm-field">
                  <label htmlFor="discount-value">مقدار</label>
                  <input
                    id="discount-value"
                    inputMode="decimal"
                    onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
                    placeholder={form.valueType === 'PERCENTAGE' ? 'مثلا ۱۵' : 'مثلا ۵۰۰۰۰'}
                    value={form.value}
                  />
                </div>

                <div className="fm-field">
                  <label htmlFor="discount-priority">اولویت</label>
                  <input
                    id="discount-priority"
                    inputMode="numeric"
                    onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                    placeholder="مثلا ۱۰۰"
                    value={form.priority}
                  />
                </div>

                <div className="fm-field">
                  <label htmlFor="discount-start-at">شروع</label>
                  <JalaliDatePicker
                    includeTime
                    onChange={(nextValue) => setForm((current) => ({ ...current, startAt: nextValue }))}
                    value={form.startAt}
                  />
                </div>

                <div className="fm-field">
                  <label htmlFor="discount-end-at">پایان</label>
                  <JalaliDatePicker
                    includeTime
                    onChange={(nextValue) => setForm((current) => ({ ...current, endAt: nextValue }))}
                    value={form.endAt}
                  />
                </div>

                <div className="fm-field vendor-discounts-checkbox">
                  <label htmlFor="discount-active">وضعیت</label>
                  <label className="vendor-discounts-toggle">
                    <input
                      checked={form.isActive}
                      id="discount-active"
                      onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                      type="checkbox"
                    />
                    <span>{form.isActive ? 'فعال' : 'غیرفعال'}</span>
                  </label>
                </div>

                <div className="fm-field vendor-discounts-field--wide">
                  <label htmlFor="discount-description">توضیح</label>
                  <textarea
                    id="discount-description"
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="توضیح کوتاه برای تیم فروشگاه یا ثبت context تخفیف"
                    rows={4}
                    value={form.description}
                  />
                </div>

                <div className="vendor-discounts-submit-row vendor-discounts-field--wide">
                  <button className="fm-button fm-button--primary" disabled={saving} onClick={handleSubmit} type="button">
                    {saving ? 'در حال ذخیره...' : editingDiscountId ? 'ذخیره تغییرات' : 'ایجاد تخفیف'}
                  </button>
                  {formMessage ? <div className="fm-message fm-message--success">{formMessage}</div> : null}
                  {formError ? <div className="fm-message fm-message--danger">{formError}</div> : null}
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </LoadableState>
    </div>
  )
}

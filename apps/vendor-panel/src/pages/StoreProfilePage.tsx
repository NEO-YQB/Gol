import { Pill, RichTextEditor, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi, type DeliveryWindowPayload, type VendorStorePayload } from '../lib/api'
import { formatFaNumber, readText } from '../lib/normalize'
import type { AuthSession } from '../lib/session'
import { VendorMapPicker } from '../components/VendorMapPicker'

type StoreRecord = Record<string, unknown>

type DeliveryWindowForm = {
  key: string
  label: string
  startTime: string
  endTime: string
}

type StoreFormState = {
  name: string
  slug: string
  description: string
  logo: string
  address: string
  lat: string
  lng: string
  sameDayDelivery: boolean
  hasExpressDelivery: boolean
  minDeliveryHours: string
  maxDeliveryHours: string
  expressDeliveryHours: string
  deliveryWindows: DeliveryWindowForm[]
}

const initialWindow: DeliveryWindowForm = {
  key: '',
  label: '',
  startTime: '',
  endTime: '',
}

const initialForm: StoreFormState = {
  name: '',
  slug: '',
  description: '',
  logo: '',
  address: '',
  lat: '',
  lng: '',
  sameDayDelivery: false,
  hasExpressDelivery: false,
  minDeliveryHours: '',
  maxDeliveryHours: '',
  expressDeliveryHours: '',
  deliveryWindows: [],
}

function parseWindows(value: unknown): DeliveryWindowForm[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => (typeof item === 'object' && item !== null ? (item as StoreRecord) : {}))
    .map((item) => ({
      key: readText(item, ['key'], ''),
      label: readText(item, ['label'], ''),
      startTime: readText(item, ['startTime'], ''),
      endTime: readText(item, ['endTime'], ''),
    }))
    .filter((item) => item.key || item.label || item.startTime || item.endTime)
}

function normalizeStoreForm(store: StoreRecord | null): StoreFormState {
  if (!store) return initialForm

  return {
    name: readText(store, ['name'], ''),
    slug: readText(store, ['slug'], ''),
    description: readText(store, ['description'], ''),
    logo: readText(store, ['logo'], ''),
    address: readText(store, ['address'], ''),
    lat: readText(store, ['lat'], ''),
    lng: readText(store, ['lng'], ''),
    sameDayDelivery: Boolean(store.sameDayDelivery),
    hasExpressDelivery: Boolean(store.hasExpressDelivery),
    minDeliveryHours: readText(store, ['minDeliveryHours'], ''),
    maxDeliveryHours: readText(store, ['maxDeliveryHours'], ''),
    expressDeliveryHours: readText(store, ['expressDeliveryHours'], ''),
    deliveryWindows: parseWindows(store.deliveryWindows),
  }
}

function buildPayload(form: StoreFormState): VendorStorePayload {
  const deliveryWindows: DeliveryWindowPayload[] = form.deliveryWindows
    .map((item) => ({
      key: item.key.trim(),
      label: item.label.trim(),
      startTime: item.startTime.trim(),
      endTime: item.endTime.trim(),
    }))
    .filter((item) => item.key && item.label && item.startTime && item.endTime)

  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    description: form.description.trim() || undefined,
    logo: form.logo.trim() || undefined,
    address: form.address.trim() || undefined,
    lat: form.lat.trim() ? Number(form.lat) : undefined,
    lng: form.lng.trim() ? Number(form.lng) : undefined,
    sameDayDelivery: form.sameDayDelivery,
    hasExpressDelivery: form.hasExpressDelivery,
    minDeliveryHours: form.minDeliveryHours.trim() ? Number(form.minDeliveryHours) : undefined,
    maxDeliveryHours: form.maxDeliveryHours.trim() ? Number(form.maxDeliveryHours) : undefined,
    expressDeliveryHours: form.expressDeliveryHours.trim() ? Number(form.expressDeliveryHours) : undefined,
    deliveryWindows: deliveryWindows.length ? deliveryWindows : undefined,
  }
}

function getStoreProductCount(store: StoreRecord | null) {
  if (!store) return 0
  if (Array.isArray(store.products)) return store.products.length

  const countRecord = typeof store._count === 'object' && store._count !== null ? (store._count as StoreRecord) : null
  if (countRecord) {
    const raw = Number(readText(countRecord, ['products'], '0'))
    return Number.isNaN(raw) ? 0 : raw
  }

  return 0
}

function toNumericCoordinate(value: string, fallback: number) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

export function StoreProfilePage({ session }: { session: AuthSession }) {
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [store, setStore] = useState<StoreRecord | null>(null)
  const [form, setForm] = useState<StoreFormState>(initialForm)

  async function loadStoreProfile(activeRef = { current: true }) {
    const health = await vendorApi.getHealthSummary(session)
    if (!activeRef.current) return

    const healthStore = (((health as StoreRecord).store as StoreRecord) ?? null)
    if (!healthStore || !Object.keys(healthStore).length) {
      setStore(null)
      setForm(initialForm)
      return
    }

    const slug = readText(healthStore, ['slug'], '')
    const detail = slug ? ((await vendorApi.getStoreBySlug(slug)) as StoreRecord) : healthStore
    if (!activeRef.current) return

    setStore(detail)
    setForm(normalizeStoreForm(detail))
  }

  useEffect(() => {
    const activeRef = { current: true }

    async function load() {
      setLoading(true)
      setError(null)

      try {
        await loadStoreProfile(activeRef)
      } catch (loadError) {
        if (!activeRef.current) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری پروفایل فروشگاه')
      } finally {
        if (activeRef.current) setLoading(false)
      }
    }

    void load()
    return () => {
      activeRef.current = false
    }
  }, [session])

  const stats = useMemo(
    () => [
      {
        label: 'محصول‌ها',
        value: formatFaNumber(getStoreProductCount(store)),
        delta: 'coverage فعلی فروشگاه',
        detail: 'تعداد محصول‌های متصل به این پروفایل', 
        tone: 'primary' as const,
      },
      {
        label: 'بازه‌های ارسال',
        value: formatFaNumber(form.deliveryWindows.length),
        delta: form.sameDayDelivery ? 'ارسال امروز فعال است' : 'ارسال امروز غیرفعال است',
        detail: 'تعداد بازه‌های زمانی تعریف‌شده',
        tone: 'success' as const,
      },
      {
        label: 'ارسال فوری',
        value: form.hasExpressDelivery ? 'فعال' : 'غیرفعال',
        delta: form.expressDeliveryHours.trim() ? `${formatFaNumber(form.expressDeliveryHours)} ساعت` : 'بدون SLA',
        detail: 'وضعیت سرویس express برای فروشگاه',
        tone: form.hasExpressDelivery ? 'warning' as const : 'primary' as const,
      },
      {
        label: 'لوکیشن',
        value: form.lat.trim() && form.lng.trim() ? 'ثبت شده' : 'ناقص',
        delta: form.address.trim() ? 'آدرس موجود است' : 'آدرس هنوز کامل نیست',
        detail: 'آمادگی داده‌های مکانی فروشگاه',
        tone: form.address.trim() ? 'success' as const : 'danger' as const,
      },
    ],
    [form, store],
  )

  const summary = useMemo(
    () => [
      { label: 'نام فروشگاه', value: form.name || '—' },
      { label: 'اسلاگ', value: form.slug || '—' },
      { label: 'آدرس', value: form.address || '—' },
      { label: 'ارسال امروز', value: form.sameDayDelivery ? 'فعال' : 'غیرفعال' },
      { label: 'ارسال فوری', value: form.hasExpressDelivery ? 'فعال' : 'غیرفعال' },
      { label: 'حداقل زمان ارسال', value: form.minDeliveryHours ? `${formatFaNumber(form.minDeliveryHours)} ساعت` : '—' },
      { label: 'حداکثر زمان ارسال', value: form.maxDeliveryHours ? `${formatFaNumber(form.maxDeliveryHours)} ساعت` : '—' },
      { label: 'زمان ارسال فوری', value: form.expressDeliveryHours ? `${formatFaNumber(form.expressDeliveryHours)} ساعت` : '—' },
    ],
    [form],
  )

  function handleOpenEditor() {
    setEditorOpen(true)
    setFormError(null)
    setFormMessage(null)
  }

  function handleCloseEditor() {
    setEditorOpen(false)
    setFormError(null)
    setFormMessage(null)
    setForm(normalizeStoreForm(store))
  }

  function addWindow() {
    setForm((current) => ({ ...current, deliveryWindows: [...current.deliveryWindows, { ...initialWindow }] }))
  }

  function updateWindow(index: number, key: keyof DeliveryWindowForm, value: string) {
    setForm((current) => ({
      ...current,
      deliveryWindows: current.deliveryWindows.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }))
  }

  function removeWindow(index: number) {
    setForm((current) => ({
      ...current,
      deliveryWindows: current.deliveryWindows.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function handleLogoChoose(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return

    setUploadingLogo(true)
    setFormError(null)
    setFormMessage(null)

    try {
      const uploaded = await vendorApi.uploadProductImage(session, file)
      setForm((current) => ({ ...current, logo: uploaded.url }))
      setFormMessage('لوگوی فروشگاه آپلود شد و در فرم قرار گرفت.')
    } catch (uploadError) {
      setFormError(uploadError instanceof Error ? uploadError.message : 'آپلود لوگو ناموفق بود')
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) {
        logoInputRef.current.value = ''
      }
    }
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.slug.trim()) {
      setFormError('نام فروشگاه و اسلاگ الزامی هستند.')
      return
    }

    setSaving(true)
    setFormError(null)
    setFormMessage(null)

    try {
      const payload = buildPayload(form)

      if (store) {
        await vendorApi.updateStore(session, Number(readText(store, ['id'], '0')), payload)
        setFormMessage('پروفایل فروشگاه با موفقیت به‌روزرسانی شد.')
      } else {
        await vendorApi.createStore(session, payload)
        setFormMessage('فروشگاه جدید با موفقیت ایجاد شد.')
      }

      await loadStoreProfile({ current: true })
      setEditorOpen(false)
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'ذخیره پروفایل فروشگاه ناموفق بود')
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

        {!editorOpen ? (
          <div className="vendor-store-workspace-grid">
            <SectionCard
              eyebrow="نمای پروفایل"
              title={form.name || 'پروفایل فروشگاه'}
              description="در این view فقط تصویر کلی فروشگاه، تنظیمات ارسال و readiness داده‌ها را می‌بینی. ویرایش کامل در workspace جدا انجام می‌شود."
              actions={
                <div className="vendor-products-actions">
                  <Pill tone={form.sameDayDelivery ? 'success' : 'warning'}>{form.sameDayDelivery ? 'ارسال امروز فعال' : 'ارسال امروز غیرفعال'}</Pill>
                  <button className="fm-button fm-button--primary" onClick={handleOpenEditor} type="button">
                    {store ? 'ویرایش کامل پروفایل' : 'ساخت پروفایل فروشگاه'}
                  </button>
                </div>
              }
            >
              <div className="vendor-store-hero">
                <div className="vendor-store-logo-card">
                  {form.logo ? <img alt="لوگوی فروشگاه" src={form.logo} /> : <div className="vendor-store-logo-placeholder">لوگو ثبت نشده</div>}
                </div>
                <div className="vendor-store-copy">
                  <h3>{form.name || 'فروشگاه بدون نام'}</h3>
                  <p>{form.address || 'آدرس فروشگاه هنوز کامل نشده است.'}</p>
                  <div className="vendor-store-pill-row">
                    <Pill tone="primary">{form.slug || 'بدون اسلاگ'}</Pill>
                    <Pill tone={form.hasExpressDelivery ? 'success' : 'neutral'}>{form.hasExpressDelivery ? 'ارسال فوری' : 'بدون ارسال فوری'}</Pill>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="خلاصه عملیاتی"
              title="هویت، زمان ارسال و کیفیت اطلاعات"
              description="این summary برای quick review است تا فروشنده قبل از ورود به edit بداند کدام بخش نیاز به تکمیل یا اصلاح دارد."
              actions={<Pill tone="warning">store profile workspace</Pill>}
            >
              <div className="vendor-products-summary-grid">
                {summary.map((item) => (
                  <article className="vendor-products-summary-card" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>
            </SectionCard>
          </div>
        ) : null}

        {editorOpen ? (
          <SectionCard
            eyebrow={store ? 'ویرایش پروفایل فروشگاه' : 'ایجاد پروفایل فروشگاه'}
            title={store ? `ویرایش ${form.name || 'فروشگاه'}` : 'ایجاد پروفایل فروشگاه'}
            description="این workspace برای اطلاعات هویتی، توضیحات، رسانه، زمان‌بندی ارسال و کیفیت داده‌های فروشگاه ساخته شده است تا این domain هم مثل محصولات منظم و focused بماند."
            actions={
              <div className="vendor-products-actions">
                <button className="fm-button fm-button--ghost" onClick={handleCloseEditor} type="button">
                  بازگشت به نمای پروفایل
                </button>
                <button className="fm-button fm-button--primary" disabled={saving} onClick={handleSubmit} type="button">
                  {saving ? 'در حال ذخیره...' : store ? 'ذخیره تغییرات' : 'ایجاد فروشگاه'}
                </button>
              </div>
            }
          >
            <div className="vendor-product-editor-shell">
              <section className="vendor-product-editor-main">
                <div className="vendor-product-editor-grid">
                  <article className="vendor-product-editor-panel">
                    <div className="vendor-product-editor-panel-head">
                      <strong>هویت فروشگاه</strong>
                      <span>نام، اسلاگ، لوگو و نشانی اصلی فروشگاه</span>
                    </div>

                    <div className="vendor-product-editor-fields">
                      <div className="fm-field">
                        <label htmlFor="store-name">نام فروشگاه</label>
                        <input id="store-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="مثلا گلخانه بهار" />
                      </div>

                      <div className="fm-field">
                        <label htmlFor="store-slug">اسلاگ</label>
                        <input id="store-slug" dir="ltr" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder="bahar-flower-shop" />
                      </div>

                      <div className="fm-field vendor-product-editor-wide">
                        <label htmlFor="store-address">آدرس</label>
                        <textarea id="store-address" rows={3} value={form.address} readOnly placeholder="آدرس کامل فروشگاه" />
                        <small className="vendor-map-help">لوکیشن فروشگاه بعد از onboarding برای جلوگیری از اختلال در منطق فروشنده نزدیک قفل می‌شود.</small>
                      </div>

                      <div className="fm-field vendor-product-editor-wide">
                        <label htmlFor="store-logo">لوگو</label>
                        <div className="vendor-products-upload-card">
                          <div className="vendor-products-upload-actions">
                            <button className="fm-button fm-button--secondary" disabled={uploadingLogo} onClick={() => logoInputRef.current?.click()} type="button">
                              {uploadingLogo ? 'در حال آپلود...' : 'انتخاب لوگو'}
                            </button>
                            <input ref={logoInputRef} className="vendor-products-file-input" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={(event) => void handleLogoChoose(event.target.files)} />
                            <span className="vendor-products-upload-hint">لوگوی فروشگاه را انتخاب کن تا URL آن خودکار در فرم ثبت شود.</span>
                          </div>

                          <input id="store-logo" value={form.logo} onChange={(event) => setForm((current) => ({ ...current, logo: event.target.value }))} placeholder="https://..." />

                          {form.logo ? (
                            <div className="vendor-store-logo-editor-preview">
                              <img alt="پیش‌نمایش لوگوی فروشگاه" src={form.logo} />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>

                  <article className="vendor-product-editor-panel vendor-product-editor-panel--full">
                    <div className="vendor-product-editor-panel-head">
                      <strong>توضیحات و محتوای فروشگاه</strong>
                      <span>متن معرفی فروشگاه را با structure و لینک‌دهی حرفه‌ای آماده کن</span>
                    </div>

                    <div className="fm-field">
                      <label htmlFor="store-description">توضیحات فروشگاه</label>
                      <RichTextEditor id="store-description" value={form.description} onChange={(nextValue) => setForm((current) => ({ ...current, description: nextValue }))} placeholder="معرفی فروشگاه، مزیت‌ها، دامنه خدمات، لینک‌دهی داخلی و محتوای SEO-friendly را اینجا بساز" rows={12} />
                    </div>
                  </article>

                  <article className="vendor-product-editor-panel vendor-product-editor-panel--full">
                    <div className="vendor-product-editor-panel-head">
                      <strong>زمان‌بندی و تنظیمات ارسال</strong>
                      <span>سطح سرویس، ارسال فوری و بازه‌های زمانی را با دقت تنظیم کن</span>
                    </div>

                    <div className="vendor-product-editor-fields">
                      <div className="fm-field vendor-store-toggle-field">
                        <label htmlFor="store-same-day">ارسال امروز</label>
                        <label className="vendor-discounts-toggle">
                          <input id="store-same-day" type="checkbox" checked={form.sameDayDelivery} onChange={(event) => setForm((current) => ({ ...current, sameDayDelivery: event.target.checked }))} />
                          <span>{form.sameDayDelivery ? 'فعال' : 'غیرفعال'}</span>
                        </label>
                      </div>

                      <div className="fm-field vendor-store-toggle-field">
                        <label htmlFor="store-express">ارسال فوری</label>
                        <label className="vendor-discounts-toggle">
                          <input id="store-express" type="checkbox" checked={form.hasExpressDelivery} onChange={(event) => setForm((current) => ({ ...current, hasExpressDelivery: event.target.checked }))} />
                          <span>{form.hasExpressDelivery ? 'فعال' : 'غیرفعال'}</span>
                        </label>
                      </div>

                      <div className="fm-field">
                        <label htmlFor="store-min-hours">حداقل زمان ارسال</label>
                        <input id="store-min-hours" inputMode="numeric" value={form.minDeliveryHours} onChange={(event) => setForm((current) => ({ ...current, minDeliveryHours: event.target.value }))} placeholder="مثلا ۴" />
                      </div>

                      <div className="fm-field">
                        <label htmlFor="store-max-hours">حداکثر زمان ارسال</label>
                        <input id="store-max-hours" inputMode="numeric" value={form.maxDeliveryHours} onChange={(event) => setForm((current) => ({ ...current, maxDeliveryHours: event.target.value }))} placeholder="مثلا ۸" />
                      </div>

                      <div className="fm-field">
                        <label htmlFor="store-express-hours">زمان ارسال فوری</label>
                        <input id="store-express-hours" inputMode="numeric" value={form.expressDeliveryHours} onChange={(event) => setForm((current) => ({ ...current, expressDeliveryHours: event.target.value }))} placeholder="مثلا ۲" />
                      </div>

                      <div className="fm-field">
                        <label htmlFor="store-lat">عرض جغرافیایی</label>
                        <input id="store-lat" dir="ltr" value={form.lat} readOnly placeholder="35.7219" />
                      </div>

                      <div className="fm-field">
                        <label htmlFor="store-lng">طول جغرافیایی</label>
                        <input id="store-lng" dir="ltr" value={form.lng} readOnly placeholder="51.3347" />
                      </div>

                      <div className="vendor-product-editor-wide">
                        <VendorMapPicker
                          disabled
                          value={{
                            lat: toNumericCoordinate(form.lat, 35.7219),
                            lng: toNumericCoordinate(form.lng, 51.3347),
                          }}
                        />
                      </div>
                    </div>

                    <div className="vendor-store-windows-section">
                      <div className="vendor-product-editor-panel-head">
                        <strong>بازه‌های زمانی ارسال</strong>
                        <span>هر بازه باید key، label و ساعت شروع/پایان داشته باشد</span>
                      </div>

                      <div className="vendor-products-actions">
                        <button className="fm-button fm-button--secondary" onClick={addWindow} type="button">
                          افزودن بازه جدید
                        </button>
                      </div>

                      {form.deliveryWindows.length ? (
                        <div className="vendor-store-window-list">
                          {form.deliveryWindows.map((windowItem, index) => (
                            <article className="vendor-store-window-card" key={`${windowItem.key}-${index}`}>
                              <div className="vendor-product-editor-fields">
                                <div className="fm-field">
                                  <label htmlFor={`window-key-${index}`}>کلید</label>
                                  <input id={`window-key-${index}`} value={windowItem.key} onChange={(event) => updateWindow(index, 'key', event.target.value)} placeholder="today-evening" />
                                </div>
                                <div className="fm-field">
                                  <label htmlFor={`window-label-${index}`}>عنوان نمایشی</label>
                                  <input id={`window-label-${index}`} value={windowItem.label} onChange={(event) => updateWindow(index, 'label', event.target.value)} placeholder="امروز 18 تا 21" />
                                </div>
                                <div className="fm-field">
                                  <label htmlFor={`window-start-${index}`}>شروع</label>
                                  <input id={`window-start-${index}`} type="time" value={windowItem.startTime} onChange={(event) => updateWindow(index, 'startTime', event.target.value)} />
                                </div>
                                <div className="fm-field">
                                  <label htmlFor={`window-end-${index}`}>پایان</label>
                                  <input id={`window-end-${index}`} type="time" value={windowItem.endTime} onChange={(event) => updateWindow(index, 'endTime', event.target.value)} />
                                </div>
                              </div>

                              <div className="vendor-products-actions">
                                <button className="fm-button fm-button--ghost" onClick={() => removeWindow(index)} type="button">
                                  حذف این بازه
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="vendor-note-card">هنوز بازه زمانی ثبت نشده است. اگر فروشگاه delivery window دارد، از اینجا آن‌ها را اضافه کن.</div>
                      )}
                    </div>
                  </article>
                </div>

                <div className="vendor-product-editor-footer">
                  <article className="vendor-product-editor-sidecard">
                    <strong>خلاصه سریع</strong>
                    <div className="vendor-product-editor-sidegrid">
                      <span>نام</span>
                      <strong>{form.name || '—'}</strong>
                      <span>اسلاگ</span>
                      <strong>{form.slug || '—'}</strong>
                      <span>بازه‌ها</span>
                      <strong>{formatFaNumber(form.deliveryWindows.length)}</strong>
                      <span>لوگو</span>
                      <strong>{form.logo ? 'ثبت شده' : 'ثبت نشده'}</strong>
                    </div>
                  </article>

                  <article className="vendor-product-editor-sidecard">
                    <strong>راهنمای تکمیل پروفایل</strong>
                    <p>
                      پروفایل فروشگاه باید هم برای مشتری واضح باشد و هم برای عملیات داخلی قابل اتکا. اول هویت و توضیح فروشگاه را کامل کن، بعد delivery config را با SLA واقعی تنظیم کن.
                    </p>
                  </article>
                </div>

                {formMessage ? <div className="fm-message fm-message--success">{formMessage}</div> : null}
                {formError ? <div className="fm-message fm-message--danger">{formError}</div> : null}
              </section>
            </div>
          </SectionCard>
        ) : null}
      </LoadableState>
    </div>
  )
}

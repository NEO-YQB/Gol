import { Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { vendorApi } from '../lib/api'
import { formatFaNumber } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type VendorApplicationState = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
type OnboardingStep = 'profile' | 'business' | 'license' | 'product' | 'store'

type DraftDocument = { title: string; url: string }

type OnboardingDraft = {
  personalFullName: string
  personalNationalId: string
  businessName: string
  businessSlug: string
  businessDescription: string
  businessAddress: string
  businessLat: string
  businessLng: string
  licenseNumber: string
  licenseImageUrl: string
  productName: string
  productDescription: string
  productCategoryId: string
  productTypeId: string
  productMainImage: string
  productPrice: string
  productQuantity: string
}

const defaultDraft: OnboardingDraft = {
  personalFullName: '',
  personalNationalId: '',
  businessName: '',
  businessSlug: '',
  businessDescription: '',
  businessAddress: '',
  businessLat: '',
  businessLng: '',
  licenseNumber: '',
  licenseImageUrl: '',
  productName: '',
  productDescription: '',
  productCategoryId: '',
  productTypeId: '',
  productMainImage: '',
  productPrice: '',
  productQuantity: '',
}

export function VendorOnboardingPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeStep, setActiveStep] = useState<OnboardingStep>('profile')
  const [applicationState, setApplicationState] = useState<VendorApplicationState>('draft')
  const [productState, setProductState] = useState<VendorApplicationState>('draft')
  const [draft, setDraft] = useState<OnboardingDraft>(defaultDraft)
  const [storeName, setStoreName] = useState('فروشگاه شما')
  const [hasApprovedProduct, setHasApprovedProduct] = useState(false)
  const [documents, setDocuments] = useState<DraftDocument[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const onboarding = await vendorApi.getVendorOnboarding(session)
        if (!active) return
        const record = onboarding as Record<string, unknown>
        const userRecord =
          typeof record.user === 'object' && record.user !== null
            ? (record.user as Record<string, unknown>)
            : null
        const docs = Array.isArray(record.documents) ? record.documents : []
        const mappedDocs = docs
          .map((item) => (typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : null))
          .filter(Boolean)
          .map((item) => ({
            title: String(item?.title ?? ''),
            url: String(item?.url ?? ''),
          }))
        setDocuments(mappedDocs)
        setDraft((current) => ({
          ...current,
          personalFullName: String(record.personalFullName ?? userRecord?.fullName ?? session.user.fullName ?? ''),
          personalNationalId: String(record.personalNationalId ?? ''),
          businessName: String(record.businessName ?? ''),
          businessSlug: String(record.businessSlug ?? ''),
          businessDescription: String(record.businessDescription ?? ''),
          businessAddress: String(record.businessAddress ?? ''),
          businessLat: record.businessLat !== null && record.businessLat !== undefined ? String(record.businessLat) : '',
          businessLng: record.businessLng !== null && record.businessLng !== undefined ? String(record.businessLng) : '',
          licenseNumber: String(record.licenseNumber ?? ''),
          licenseImageUrl: String(record.licenseImageUrl ?? ''),
          productName: String(record.productName ?? ''),
          productDescription: String(record.productDescription ?? ''),
          productCategoryId: record.productCategoryId !== null && record.productCategoryId !== undefined ? String(record.productCategoryId) : '',
          productTypeId: record.productTypeId !== null && record.productTypeId !== undefined ? String(record.productTypeId) : '',
          productMainImage: String(record.productMainImage ?? ''),
          productPrice: record.productPrice !== null && record.productPrice !== undefined ? String(record.productPrice) : '',
          productQuantity: record.productQuantity !== null && record.productQuantity !== undefined ? String(record.productQuantity) : '',
        }))
        const appState = String(record.applicationStatus ?? 'DRAFT').toLowerCase() as VendorApplicationState
        const prodState = String(record.productStatus ?? 'DRAFT').toLowerCase() as VendorApplicationState
        setApplicationState(appState)
        setProductState(prodState)
        setHasApprovedProduct(prodState === 'approved')
        setStoreName(String(record.businessName ?? userRecord?.fullName ?? session.user.fullName ?? session.user.phoneNumber))
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری onboarding')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [session])

  const stats = useMemo(() => [
    { label: 'مرحله فعال', value: activeStep === 'profile' ? 'اطلاعات فردی' : activeStep === 'business' ? 'اطلاعات کسب‌وکار' : activeStep === 'license' ? 'جواز کسب' : activeStep === 'product' ? 'تعریف محصول' : 'فعال‌سازی فروشگاه', delta: 'wizard فروشنده', detail: 'مسیر ثبت‌نام و تایید', tone: 'primary' as const },
    { label: 'وضعیت درخواست', value: applicationState === 'approved' ? 'تایید شده' : applicationState === 'under_review' ? 'در بررسی' : applicationState === 'submitted' ? 'ارسال شده' : 'پیش‌نویس', delta: storeName, detail: 'نمایش وضعیت فعلی فروشنده', tone: 'warning' as const },
    { label: 'مدارک', value: formatFaNumber(documents.length), delta: 'فایل‌های بارگذاری شده', detail: 'مدارک هویتی و کسب‌وکار', tone: 'success' as const },
    { label: 'محصول اولیه', value: hasApprovedProduct ? 'ثبت شده' : 'منتظر ثبت', delta: productState === 'approved' ? 'تایید شده' : productState === 'submitted' ? 'در بررسی' : 'در انتظار', detail: 'محصول نمونه برای تیم محتوا/SEO', tone: hasApprovedProduct ? 'success' as const : 'danger' as const },
  ], [activeStep, applicationState, documents.length, hasApprovedProduct, productState, storeName])

  function updateDraft<K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmitApplication() {
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const response = await vendorApi.submitVendorOnboarding(session, {
        personalFullName: draft.personalFullName.trim(),
        personalNationalId: draft.personalNationalId.trim(),
        businessName: draft.businessName.trim(),
        businessSlug: draft.businessSlug.trim(),
        businessDescription: draft.businessDescription.trim() || undefined,
        businessAddress: draft.businessAddress.trim(),
        businessLat: draft.businessLat.trim() ? Number(draft.businessLat) : undefined,
        businessLng: draft.businessLng.trim() ? Number(draft.businessLng) : undefined,
        licenseNumber: draft.licenseNumber.trim(),
        licenseImageUrl: draft.licenseImageUrl.trim() || undefined,
        documents,
      }) as Record<string, unknown>
      setApplicationState(String(response.applicationStatus ?? 'submitted').toLowerCase() as VendorApplicationState)
      setMessage('درخواست فروشندگی ثبت شد و در انتظار بررسی است.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ثبت درخواست ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmitProduct() {
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const response = await vendorApi.submitVendorProduct(session, {
        productName: draft.productName.trim(),
        productDescription: draft.productDescription.trim() || undefined,
        productCategoryId: Number(draft.productCategoryId),
        productTypeId: Number(draft.productTypeId),
        productMainImage: draft.productMainImage.trim() || undefined,
        productPrice: Number(draft.productPrice),
        productQuantity: Number(draft.productQuantity),
      }) as Record<string, unknown>
      setProductState(String(response.productStatus ?? 'submitted').toLowerCase() as VendorApplicationState)
      setHasApprovedProduct(false)
      setMessage('محصول اولیه ثبت شد و برای بررسی ارسال شد.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ثبت محصول ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="vendor-onboarding-screen" dir="rtl"><div className="vendor-onboarding-layout"><p>در حال بارگذاری...</p></div></div>
  }

  return (
    <div className="vendor-onboarding-screen" dir="rtl">
      <div className="vendor-onboarding-backdrop" aria-hidden="true" />
      <div className="vendor-onboarding-layout">
        <section className="vendor-onboarding-hero">
          <Pill tone="warning">ثبت‌نام فروشنده</Pill>
          <h1>قبل از ورود به داشبورد، درخواست فروشندگی را کامل کن</h1>
          <p>این فرایند برای بررسی هویت، کسب‌وکار، جواز و محصول اولیه است. بعد از تایید، فروشگاه فعال می‌شود و داشبورد کامل باز می‌شود.</p>
          <div className="vendor-onboarding-status-row">
            <Pill tone={applicationState === 'approved' ? 'success' : 'warning'}>{applicationState === 'approved' ? 'تایید نهایی' : 'در انتظار بررسی'}</Pill>
            <Pill tone="primary">لوکیشن و آدرس فروشگاه مهم است</Pill>
            <Pill tone="warning">بعد از تایید، محصول اولیه ثبت می‌شود</Pill>
          </div>
          {message ? <p className="fm-message fm-message--success">{message}</p> : null}
          {error ? <p className="fm-message fm-message--danger">{error}</p> : null}
        </section>

        <div className="fm-grid vendor-onboarding-stats">{stats.map((item) => <StatCard key={item.label} {...item} />)}</div>

        <SectionCard eyebrow="مرحله ۱" title="اطلاعات فردی" description="نام کامل و شناسه هویتی مالک فروشگاه را ثبت کن." hint="این اطلاعات برای تطبیق جواز و بررسی حقوقی لازم است.">
          <div className="vendor-onboarding-form-grid">
            <label className="fm-field"><span>نام و نام خانوادگی</span><input value={draft.personalFullName} onChange={(event) => updateDraft('personalFullName', event.target.value)} placeholder="مثلا: مریم احمدی" /></label>
            <label className="fm-field"><span>کد ملی</span><input value={draft.personalNationalId} onChange={(event) => updateDraft('personalNationalId', event.target.value)} placeholder="کد ملی مالک" inputMode="numeric" /></label>
          </div>
          <div className="vendor-onboarding-actions"><button className="fm-button fm-button--primary" type="button" onClick={() => setActiveStep('business')}>مرحله بعد</button></div>
        </SectionCard>

        <SectionCard eyebrow="مرحله ۲" title="اطلاعات کسب‌وکار" description="اطلاعات فروشگاه، آدرس و لوکیشن را وارد کن." hint="لوکیشن برای نمایش نزدیک‌ترین فروشگاه به مشتری هم استفاده می‌شود.">
          <div className="vendor-onboarding-form-grid">
            <label className="fm-field"><span>نام فروشگاه</span><input value={draft.businessName} onChange={(event) => updateDraft('businessName', event.target.value)} placeholder="مثلا: گلخانه بهار" /></label>
            <label className="fm-field"><span>اسلاگ فروشگاه</span><input value={draft.businessSlug} onChange={(event) => updateDraft('businessSlug', event.target.value)} placeholder="bahar-flower-shop" /></label>
            <label className="fm-field vendor-onboarding-field-wide"><span>توضیح کوتاه فروشگاه</span><textarea rows={3} value={draft.businessDescription} onChange={(event) => updateDraft('businessDescription', event.target.value)} placeholder="در چند خط درباره فروشگاه و سبک کار بنویس" /></label>
            <label className="fm-field vendor-onboarding-field-wide"><span>آدرس مغازه</span><textarea rows={3} value={draft.businessAddress} onChange={(event) => updateDraft('businessAddress', event.target.value)} placeholder="آدرس دقیق و قابل‌تحویل" /></label>
            <label className="fm-field"><span>عرض جغرافیایی</span><input value={draft.businessLat} onChange={(event) => updateDraft('businessLat', event.target.value)} placeholder="35.7219" inputMode="decimal" /></label>
            <label className="fm-field"><span>طول جغرافیایی</span><input value={draft.businessLng} onChange={(event) => updateDraft('businessLng', event.target.value)} placeholder="51.3347" inputMode="decimal" /></label>
          </div>
          <div className="vendor-onboarding-actions">
            <button className="fm-button fm-button--ghost" type="button" onClick={() => setActiveStep('profile')}>قبلی</button>
            <button className="fm-button fm-button--primary" type="button" onClick={() => setActiveStep('license')}>ادامه</button>
          </div>
        </SectionCard>

        <SectionCard eyebrow="مرحله ۳" title="جواز کسب" description="جواز باید به نام مالک باشد." hint="فعلا تصویر جواز را بارگذاری کن؛ بعدا آپلود عمومی فایل‌های غیرتصویری هم اضافه می‌شود.">
          <div className="vendor-onboarding-form-grid">
            <label className="fm-field"><span>شماره جواز</span><input value={draft.licenseNumber} onChange={(event) => updateDraft('licenseNumber', event.target.value)} placeholder="شماره جواز کسب" /></label>
            <label className="fm-field vendor-onboarding-field-wide"><span>تصویر جواز</span><input value={draft.licenseImageUrl} onChange={(event) => updateDraft('licenseImageUrl', event.target.value)} placeholder="آدرس تصویر بارگذاری شده" /></label>
          </div>
          <div className="vendor-onboarding-actions">
            <button className="fm-button fm-button--ghost" type="button" onClick={() => setActiveStep('business')}>قبلی</button>
            <button className="fm-button fm-button--primary" type="button" disabled={saving} onClick={handleSubmitApplication}>{saving ? 'در حال ارسال...' : 'ارسال برای بررسی'}</button>
          </div>
        </SectionCard>

        <SectionCard eyebrow="مرحله ۴" title="محصول اولیه" description="بعد از تایید فروشنده، یک محصول نمونه ثبت کن تا تیم محتوا و سئو آن را بررسی کند." hint="این مرحله گیت بعدی قبل از فعال‌سازی کامل فروشگاه است.">
          <div className="vendor-onboarding-form-grid">
            <label className="fm-field"><span>نام محصول</span><input value={draft.productName} onChange={(event) => updateDraft('productName', event.target.value)} placeholder="مثلا: رز قرمز ویژه" /></label>
            <label className="fm-field"><span>دسته محصول</span><input value={draft.productCategoryId} onChange={(event) => updateDraft('productCategoryId', event.target.value)} placeholder="شناسه دسته" /></label>
            <label className="fm-field"><span>نوع محصول</span><input value={draft.productTypeId} onChange={(event) => updateDraft('productTypeId', event.target.value)} placeholder="شناسه نوع" /></label>
            <label className="fm-field"><span>قیمت</span><input value={draft.productPrice} onChange={(event) => updateDraft('productPrice', event.target.value)} placeholder="مبلغ" inputMode="numeric" /></label>
            <label className="fm-field"><span>موجودی</span><input value={draft.productQuantity} onChange={(event) => updateDraft('productQuantity', event.target.value)} placeholder="تعداد" inputMode="numeric" /></label>
            <label className="fm-field vendor-onboarding-field-wide"><span>توضیح محصول</span><textarea rows={3} value={draft.productDescription} onChange={(event) => updateDraft('productDescription', event.target.value)} placeholder="درباره محصول و ویژگی‌هایش توضیح بده" /></label>
          </div>
          <div className="vendor-onboarding-actions">
            <button className="fm-button fm-button--ghost" type="button" onClick={() => setActiveStep('license')}>قبلی</button>
            <button className="fm-button fm-button--secondary" type="button" disabled={saving} onClick={handleSubmitProduct}>{saving ? 'در حال ارسال...' : 'ثبت محصول نمونه'}</button>
          </div>
        </SectionCard>

        <SectionCard eyebrow="مرحله ۵" title="وضعیت درخواست" description="فروشنده فقط بعد از ورود، این صفحه را می‌بیند تا وضعیت بررسی را دنبال کند." hint="بعد از تایید، مسیرهای فروشگاه و تکمیل پروفایل باز می‌شوند.">
          <div className="vendor-onboarding-summary">
            <div><strong>وضعیت فعلی:</strong><span>{applicationState === 'approved' ? 'تایید شده' : applicationState === 'submitted' ? 'ارسال شده' : 'در انتظار بررسی'}</span></div>
            <div><strong>مدارک ثبت‌شده:</strong><span>{documents.length ? documents.map((item) => item.title).join('، ') : 'هنوز مدرکی ثبت نشده'}</span></div>
            <div><strong>مرحله بعد:</strong><span>{hasApprovedProduct ? 'فعال‌سازی کامل فروشگاه' : 'تعریف و تایید محصول اولیه'}</span></div>
          </div>
          <div className="vendor-onboarding-actions">
            <button className="fm-button fm-button--ghost" type="button" onClick={() => setActiveStep('product')}>برگشت به محصول</button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

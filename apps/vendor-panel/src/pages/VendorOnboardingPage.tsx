import { Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { vendorApi } from '../lib/api'
import { formatFaNumber } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type VendorApplicationState = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
type OnboardingStep = 'profile' | 'business' | 'license' | 'product' | 'status'

type DraftDocument = { title: string; url: string }

type OnboardingDraft = {
  personalFullName: string
  personalNationalId: string
  personalNationalIdFrontUrl: string
  personalNationalIdBackUrl: string
  businessName: string
  businessSlug: string
  businessDescription: string
  businessAddress: string
  businessLat: string
  businessLng: string
  licenseNumber: string
  licenseImageUrl: string
  productName: string
  productMainImage: string
  productGalleryImages: string[]
}

const defaultDraft: OnboardingDraft = {
  personalFullName: '',
  personalNationalId: '',
  personalNationalIdFrontUrl: '',
  personalNationalIdBackUrl: '',
  businessName: '',
  businessSlug: '',
  businessDescription: '',
  businessAddress: '',
  businessLat: '',
  businessLng: '',
  licenseNumber: '',
  licenseImageUrl: '',
  productName: '',
  productMainImage: '',
  productGalleryImages: [],
}

const stepOrder: OnboardingStep[] = ['profile', 'business', 'license', 'product', 'status']

function stepLabel(step: OnboardingStep) {
  switch (step) {
    case 'profile': return 'اطلاعات فردی'
    case 'business': return 'کسب‌وکار'
    case 'license': return 'جواز و مدارک'
    case 'product': return 'محصول نمونه'
    case 'status': return 'وضعیت درخواست'
  }
}

export function VendorOnboardingPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState<OnboardingStep>('profile')
  const [applicationState, setApplicationState] = useState<VendorApplicationState>('draft')
  const [productState, setProductState] = useState<VendorApplicationState>('draft')
  const [draft, setDraft] = useState<OnboardingDraft>(defaultDraft)
  const [storeName, setStoreName] = useState('فروشگاه شما')
  const [hasApprovedProduct, setHasApprovedProduct] = useState(false)
  const [documents, setDocuments] = useState<DraftDocument[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRefs = {
    license: useRef<HTMLInputElement | null>(null),
    idFront: useRef<HTMLInputElement | null>(null),
    idBack: useRef<HTMLInputElement | null>(null),
    productMain: useRef<HTMLInputElement | null>(null),
    productGallery: useRef<HTMLInputElement | null>(null),
  }

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const onboarding = await vendorApi.getVendorOnboarding(session)
        if (!active) return
        const record = onboarding as Record<string, unknown>
        const userRecord = typeof record.user === 'object' && record.user !== null ? (record.user as Record<string, unknown>) : null
        const docs = Array.isArray(record.documents) ? record.documents : []
        setDocuments(
          docs
            .map((item) => (typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : null))
            .filter(Boolean)
            .map((item) => ({
              title: String(item?.title ?? ''),
              url: String(item?.url ?? ''),
            })),
        )
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
          personalNationalIdFrontUrl: String(record.personalNationalIdFrontUrl ?? ''),
          personalNationalIdBackUrl: String(record.personalNationalIdBackUrl ?? ''),
          productName: String(record.productName ?? ''),
          productMainImage: String(record.productMainImage ?? ''),
          productGalleryImages: Array.isArray(record.productGalleryImages) ? record.productGalleryImages.map((item) => String(item)) : [],
        }))
        const appState = String(record.applicationStatus ?? 'DRAFT').toLowerCase() as VendorApplicationState
        const prodState = String(record.productStatus ?? 'DRAFT').toLowerCase() as VendorApplicationState
        setApplicationState(appState)
        setProductState(prodState)
        setHasApprovedProduct(prodState === 'approved')
        setStoreName(String(record.businessName ?? userRecord?.fullName ?? session.user.fullName ?? session.user.phoneNumber))
        if (appState === 'approved') {
          setActiveStep(prodState === 'approved' ? 'status' : 'product')
        } else if (appState === 'submitted' || appState === 'under_review') {
          setActiveStep('status')
        } else {
          setActiveStep('profile')
        }
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
    { label: 'مرحله فعال', value: stepLabel(activeStep), delta: 'wizard فروشنده', detail: 'فقط همین مرحله نمایش داده می‌شود', tone: 'primary' as const },
    { label: 'وضعیت درخواست', value: applicationState === 'approved' ? 'تایید شده' : applicationState === 'under_review' ? 'در بررسی' : applicationState === 'submitted' ? 'ارسال شده' : 'پیش‌نویس', delta: storeName, detail: 'نمایش وضعیت فعلی فروشنده', tone: 'warning' as const },
    { label: 'مدارک', value: formatFaNumber(documents.length), delta: 'فایل‌های بارگذاری شده', detail: 'مدارک هویتی و کسب‌وکار', tone: 'success' as const },
    { label: 'محصول نمونه', value: hasApprovedProduct ? 'ثبت شده' : 'منتظر ثبت', delta: productState === 'approved' ? 'تایید شده' : productState === 'submitted' ? 'در بررسی' : 'در انتظار', detail: 'نمونه محصول با تصویر اصلی و گالری', tone: hasApprovedProduct ? 'success' as const : 'danger' as const },
  ], [activeStep, applicationState, documents.length, hasApprovedProduct, productState, storeName])

  function updateDraft<K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function uploadSingleFile(file: File, target: 'license' | 'idFront' | 'idBack' | 'productMain') {
    setUploading(target)
    setError(null)
    try {
      const result = await vendorApi.uploadOnboardingFile(session, file)
      if (target === 'license') updateDraft('licenseImageUrl', result.url)
      if (target === 'idFront') updateDraft('personalNationalIdFrontUrl', result.url)
      if (target === 'idBack') updateDraft('personalNationalIdBackUrl', result.url)
      if (target === 'productMain') updateDraft('productMainImage', result.url)
      setMessage('فایل با موفقیت بارگذاری شد.')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'بارگذاری فایل ناموفق بود')
    } finally {
      setUploading(null)
    }
  }

  async function uploadGalleryFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading('gallery')
    setError(null)
    try {
      const result = await vendorApi.uploadOnboardingGallery(session, Array.from(files))
      updateDraft('productGalleryImages', [...draft.productGalleryImages, ...result.map((item) => item.url)])
      setMessage('گالری محصول با موفقیت بارگذاری شد.')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'بارگذاری گالری ناموفق بود')
    } finally {
      setUploading(null)
    }
  }

  function nextStep() {
    const index = stepOrder.indexOf(activeStep)
    if (index < stepOrder.length - 1) setActiveStep(stepOrder[index + 1])
  }

  function prevStep() {
    const index = stepOrder.indexOf(activeStep)
    if (index > 0) setActiveStep(stepOrder[index - 1])
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
        documents: [
          draft.personalNationalIdFrontUrl ? { title: 'کارت ملی روی', url: draft.personalNationalIdFrontUrl } : null,
          draft.personalNationalIdBackUrl ? { title: 'کارت ملی پشت', url: draft.personalNationalIdBackUrl } : null,
          draft.licenseImageUrl ? { title: 'جواز کسب', url: draft.licenseImageUrl } : null,
        ].filter(Boolean) as DraftDocument[],
      }) as Record<string, unknown>
      setApplicationState(String(response.applicationStatus ?? 'submitted').toLowerCase() as VendorApplicationState)
      setActiveStep('status')
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
        productMainImage: draft.productMainImage.trim() || undefined,
        productGalleryImages: draft.productGalleryImages.filter(Boolean),
      }) as Record<string, unknown>
      setProductState(String(response.productStatus ?? 'submitted').toLowerCase() as VendorApplicationState)
      setHasApprovedProduct(false)
      setActiveStep('status')
      setMessage('محصول نمونه ثبت شد و برای بررسی ارسال شد.')
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
          <p>هر بار فقط یک مرحله نمایش داده می‌شود. بعد از تکمیل هر مرحله، مرحله بعدی باز می‌شود و مراحل بعدی مخفی می‌مانند.</p>
          <div className="vendor-onboarding-status-row">
            <Pill tone={applicationState === 'approved' ? 'success' : 'warning'}>{applicationState === 'approved' ? 'تایید نهایی' : 'در انتظار بررسی'}</Pill>
            <Pill tone="primary">{stepLabel(activeStep)}</Pill>
          </div>
          {message ? <p className="fm-message fm-message--success">{message}</p> : null}
          {error ? <p className="fm-message fm-message--danger">{error}</p> : null}
        </section>

        <div className="fm-grid vendor-onboarding-stats">{stats.map((item) => <StatCard key={item.label} {...item} />)}</div>

        {activeStep === 'profile' ? (
          <SectionCard eyebrow="مرحله ۱" title="اطلاعات فردی" description="نام کامل، کد ملی و تصویر کارت ملی را ثبت کن." hint="این اطلاعات برای تطبیق هویت و جواز لازم است.">
            <div className="vendor-onboarding-form-grid">
              <label className="fm-field"><span>نام و نام خانوادگی</span><input value={draft.personalFullName} onChange={(event) => updateDraft('personalFullName', event.target.value)} placeholder="مثلا: مریم احمدی" /></label>
              <label className="fm-field"><span>کد ملی</span><input value={draft.personalNationalId} onChange={(event) => updateDraft('personalNationalId', event.target.value)} placeholder="کد ملی مالک" inputMode="numeric" /></label>
              <div className="vendor-upload-card">
                <span>کارت ملی روی</span>
                <input ref={fileInputRefs.idFront} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadSingleFile(file, 'idFront') }} />
                <button className="fm-button fm-button--ghost" type="button" onClick={() => fileInputRefs.idFront.current?.click()} disabled={Boolean(uploading)}>{uploading === 'idFront' ? 'در حال بارگذاری...' : 'انتخاب فایل و بارگذاری'}</button>
                {draft.personalNationalIdFrontUrl ? <small>فایل انتخاب‌شده: {draft.personalNationalIdFrontUrl}</small> : null}
              </div>
              <div className="vendor-upload-card">
                <span>کارت ملی پشت</span>
                <input ref={fileInputRefs.idBack} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadSingleFile(file, 'idBack') }} />
                <button className="fm-button fm-button--ghost" type="button" onClick={() => fileInputRefs.idBack.current?.click()} disabled={Boolean(uploading)}>{uploading === 'idBack' ? 'در حال بارگذاری...' : 'انتخاب فایل و بارگذاری'}</button>
                {draft.personalNationalIdBackUrl ? <small>فایل انتخاب‌شده: {draft.personalNationalIdBackUrl}</small> : null}
              </div>
            </div>
            <div className="vendor-onboarding-actions">
              <button className="fm-button fm-button--primary" type="button" onClick={nextStep}>مرحله بعد</button>
            </div>
          </SectionCard>
        ) : null}

        {activeStep === 'business' ? (
          <SectionCard eyebrow="مرحله ۲" title="اطلاعات کسب‌وکار" description="نام فروشگاه، آدرس و لوکیشن را ثبت کن." hint="لوکیشن برای نزدیک‌ترین فروشگاه به مشتری هم استفاده می‌شود.">
            <div className="vendor-onboarding-form-grid">
              <label className="fm-field"><span>نام فروشگاه</span><input value={draft.businessName} onChange={(event) => updateDraft('businessName', event.target.value)} placeholder="مثلا: گلخانه بهار" /></label>
              <label className="fm-field"><span>اسلاگ فروشگاه</span><input value={draft.businessSlug} onChange={(event) => updateDraft('businessSlug', event.target.value)} placeholder="bahar-flower-shop" /></label>
              <label className="fm-field vendor-onboarding-field-wide"><span>توضیح کوتاه فروشگاه</span><textarea rows={3} value={draft.businessDescription} onChange={(event) => updateDraft('businessDescription', event.target.value)} placeholder="در چند خط درباره فروشگاه بنویس" /></label>
              <label className="fm-field vendor-onboarding-field-wide"><span>آدرس مغازه</span><textarea rows={3} value={draft.businessAddress} onChange={(event) => updateDraft('businessAddress', event.target.value)} placeholder="آدرس دقیق و قابل‌تحویل" /></label>
              <label className="fm-field"><span>عرض جغرافیایی</span><input value={draft.businessLat} onChange={(event) => updateDraft('businessLat', event.target.value)} placeholder="35.7219" inputMode="decimal" /></label>
              <label className="fm-field"><span>طول جغرافیایی</span><input value={draft.businessLng} onChange={(event) => updateDraft('businessLng', event.target.value)} placeholder="51.3347" inputMode="decimal" /></label>
            </div>
            <div className="vendor-onboarding-actions">
              <button className="fm-button fm-button--ghost" type="button" onClick={prevStep}>قبلی</button>
              <button className="fm-button fm-button--primary" type="button" onClick={nextStep}>ادامه</button>
            </div>
          </SectionCard>
        ) : null}

        {activeStep === 'license' ? (
          <SectionCard eyebrow="مرحله ۳" title="جواز کسب" description="شماره جواز و تصویر جواز را بارگذاری کن." hint="فایل را با دکمه انتخاب کن؛ لینک دستی لازم نیست.">
            <div className="vendor-onboarding-form-grid">
              <label className="fm-field"><span>شماره جواز</span><input value={draft.licenseNumber} onChange={(event) => updateDraft('licenseNumber', event.target.value)} placeholder="شماره جواز کسب" /></label>
              <div className="vendor-upload-card vendor-upload-card--wide">
                <span>تصویر جواز کسب</span>
                <input ref={fileInputRefs.license} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadSingleFile(file, 'license') }} />
                <button className="fm-button fm-button--primary" type="button" onClick={() => fileInputRefs.license.current?.click()} disabled={Boolean(uploading)}>{uploading === 'license' ? 'در حال بارگذاری...' : 'انتخاب فایل و بارگذاری'}</button>
                {draft.licenseImageUrl ? <small>فایل انتخاب‌شده: {draft.licenseImageUrl}</small> : null}
              </div>
            </div>
            <div className="vendor-onboarding-actions">
              <button className="fm-button fm-button--ghost" type="button" onClick={prevStep}>قبلی</button>
              <button className="fm-button fm-button--primary" type="button" onClick={nextStep}>ادامه</button>
            </div>
          </SectionCard>
        ) : null}

        {activeStep === 'product' ? (
          <SectionCard eyebrow="مرحله ۴" title="محصول نمونه" description="فقط یک محصول نمونه با تصویر اصلی و گالری ثبت کن." hint="این مرحله برای بررسی محتوا و آماده‌سازی فروشنده کافی است.">
            <div className="vendor-onboarding-form-grid">
              <label className="fm-field vendor-onboarding-field-wide"><span>نام محصول</span><input value={draft.productName} onChange={(event) => updateDraft('productName', event.target.value)} placeholder="مثلا: رز قرمز ویژه" /></label>
              <div className="vendor-upload-card">
                <span>تصویر اصلی محصول</span>
                <input ref={fileInputRefs.productMain} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadSingleFile(file, 'productMain') }} />
                <button className="fm-button fm-button--ghost" type="button" onClick={() => fileInputRefs.productMain.current?.click()} disabled={Boolean(uploading)}>{uploading === 'productMain' ? 'در حال بارگذاری...' : 'انتخاب فایل و بارگذاری'}</button>
                {draft.productMainImage ? <small>فایل انتخاب‌شده: {draft.productMainImage}</small> : null}
              </div>
              <div className="vendor-upload-card vendor-upload-card--wide">
                <span>گالری محصول</span>
                <input ref={fileInputRefs.productGallery} type="file" accept="image/*" multiple hidden onChange={(event) => void uploadGalleryFiles(event.target.files)} />
                <button className="fm-button fm-button--secondary" type="button" onClick={() => fileInputRefs.productGallery.current?.click()} disabled={Boolean(uploading)}>{uploading === 'gallery' ? 'در حال بارگذاری...' : 'انتخاب چند فایل و بارگذاری'}</button>
                {draft.productGalleryImages.length ? <small>{draft.productGalleryImages.length} تصویر در گالری ثبت شد</small> : null}
              </div>
            </div>
            <div className="vendor-onboarding-actions">
              <button className="fm-button fm-button--ghost" type="button" onClick={prevStep}>قبلی</button>
              <button className="fm-button fm-button--secondary" type="button" disabled={saving} onClick={handleSubmitProduct}>{saving ? 'در حال ارسال...' : 'ثبت محصول نمونه'}</button>
            </div>
          </SectionCard>
        ) : null}

        {activeStep === 'status' ? (
          <SectionCard eyebrow="مرحله ۵" title="وضعیت درخواست" description="فقط این بخش را می‌بینی تا وضعیت بررسی را دنبال کنی." hint="اگر نقصی باشد، بعدا فقط همین مرحله و همان بخش‌های لازم بازمی‌گردند.">
            <div className="vendor-onboarding-summary">
              <div><strong>وضعیت فعلی:</strong><span>{applicationState === 'approved' ? 'تایید شده' : applicationState === 'submitted' ? 'ارسال شده' : 'در انتظار بررسی'}</span></div>
              <div><strong>مدارک ثبت‌شده:</strong><span>{documents.length ? documents.map((item) => item.title).join('، ') : 'هنوز مدرکی ثبت نشده'}</span></div>
              <div><strong>مرحله بعد:</strong><span>{hasApprovedProduct ? 'فعال‌سازی کامل فروشگاه' : 'تعریف و تایید محصول نمونه'}</span></div>
            </div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  )
}

import { Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { vendorApi } from '../lib/api'
import { formatFaNumber } from '../lib/normalize'
import type { AuthSession } from '../lib/session'
import { VendorMapPicker } from '../components/VendorMapPicker'

type VendorApplicationState = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
type OnboardingStep = 'profile' | 'business' | 'license' | 'product' | 'status'

type DraftDocument = { title: string; url: string }
type UploadKey = 'license' | 'idFront' | 'idBack' | 'productMain' | 'gallery'
type ProductImageCropTarget = 'productMain' | 'gallery'

type ProductImageCropState = {
  target: ProductImageCropTarget
  files: File[]
  currentIndex: number
  sourceUrl: string
  naturalWidth: number
  naturalHeight: number
  baseScale: number
  minZoom: number
  zoom: number
  offsetX: number
  offsetY: number
}

const PRODUCT_IMAGE_CROP_SIZE = 320
const PRODUCT_IMAGE_MAX_EXPORT_SIZE = 800

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getCropBounds(state: Pick<ProductImageCropState, 'naturalWidth' | 'naturalHeight' | 'baseScale' | 'zoom'>) {
  const displayWidth = state.naturalWidth * state.baseScale * state.zoom
  const displayHeight = state.naturalHeight * state.baseScale * state.zoom
  return {
    minOffsetX: Math.min(0, PRODUCT_IMAGE_CROP_SIZE - displayWidth),
    maxOffsetX: 0,
    minOffsetY: Math.min(0, PRODUCT_IMAGE_CROP_SIZE - displayHeight),
    maxOffsetY: 0,
  }
}

function centerCropOffsets(naturalWidth: number, naturalHeight: number) {
  const baseScale = Math.max(PRODUCT_IMAGE_CROP_SIZE / naturalWidth, PRODUCT_IMAGE_CROP_SIZE / naturalHeight)
  const displayWidth = naturalWidth * baseScale
  const displayHeight = naturalHeight * baseScale
  return {
    baseScale,
    minZoom: 1,
    zoom: 1,
    offsetX: (PRODUCT_IMAGE_CROP_SIZE - displayWidth) / 2,
    offsetY: (PRODUCT_IMAGE_CROP_SIZE - displayHeight) / 2,
  }
}

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

function renderUploadPreview(url: string, alt: string) {
  if (!url) return null
  return <img className="vendor-upload-preview" src={url} alt={alt} />
}

function toNumericCoordinate(value: string, fallback: number) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

export function VendorOnboardingPage({
  session,
  onRefreshSession,
}: {
  session: AuthSession
  onRefreshSession: (session?: AuthSession) => Promise<AuthSession | undefined>
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<UploadKey | null>(null)
  const [uploadProgress, setUploadProgress] = useState<Record<UploadKey, number>>({
    license: 0,
    idFront: 0,
    idBack: 0,
    productMain: 0,
    gallery: 0,
  })
  const [activeStep, setActiveStep] = useState<OnboardingStep>('profile')
  const [applicationState, setApplicationState] = useState<VendorApplicationState>('draft')
  const [productState, setProductState] = useState<VendorApplicationState>('draft')
  const [draft, setDraft] = useState<OnboardingDraft>(defaultDraft)
  const [storeName, setStoreName] = useState('فروشگاه شما')
  const [hasApprovedProduct, setHasApprovedProduct] = useState(false)
  const [documents, setDocuments] = useState<DraftDocument[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cropState, setCropState] = useState<ProductImageCropState | null>(null)
  const [processingCrop, setProcessingCrop] = useState(false)
  const cropDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
  const cropSuppressClickRef = useRef(false)
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
        const mappedDocs = docs
          .map((item) => (typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : null))
          .filter(Boolean)
          .map((item) => ({
            title: String(item?.title ?? ''),
            url: String(item?.url ?? ''),
          }))
        setDocuments(mappedDocs)
        const frontDoc = mappedDocs.find((item) => item.title === 'کارت ملی روی')
        const backDoc = mappedDocs.find((item) => item.title === 'کارت ملی پشت')
        const licenseDoc = mappedDocs.find((item) => item.title === 'جواز کسب')
        const galleryDocs = mappedDocs.filter((item) => item.title === 'گالری محصول نمونه')
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
          licenseImageUrl: String(record.licenseImageUrl ?? licenseDoc?.url ?? ''),
          personalNationalIdFrontUrl: String(record.personalNationalIdFrontUrl ?? frontDoc?.url ?? ''),
          personalNationalIdBackUrl: String(record.personalNationalIdBackUrl ?? backDoc?.url ?? ''),
          productName: String(record.productName ?? ''),
          productMainImage: String(record.productMainImage ?? ''),
          productGalleryImages: Array.isArray(record.productGalleryImages)
            ? record.productGalleryImages.map((item) => String(item))
            : galleryDocs.map((item) => item.url),
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

  useEffect(() => {
    const sourceUrl = cropState?.sourceUrl
    return () => {
      if (sourceUrl) {
        URL.revokeObjectURL(sourceUrl)
      }
    }
  }, [cropState?.sourceUrl])

  useEffect(() => {
    function handlePointerMove(event: MouseEvent) {
      if (!cropDragRef.current) return
      if (Math.abs(event.clientX - cropDragRef.current.startX) > 3 || Math.abs(event.clientY - cropDragRef.current.startY) > 3) {
        cropSuppressClickRef.current = true
      }
      setCropState((current) => {
        if (!current) return current
        const bounds = getCropBounds(current)
        return {
          ...current,
          offsetX: clamp(cropDragRef.current!.originX + (event.clientX - cropDragRef.current!.startX), bounds.minOffsetX, bounds.maxOffsetX),
          offsetY: clamp(cropDragRef.current!.originY + (event.clientY - cropDragRef.current!.startY), bounds.minOffsetY, bounds.maxOffsetY),
        }
      })
    }

    function handlePointerUp() {
      cropDragRef.current = null
      if (cropSuppressClickRef.current) {
        window.setTimeout(() => {
          cropSuppressClickRef.current = false
        }, 0)
      }
    }

    window.addEventListener('mousemove', handlePointerMove)
    window.addEventListener('mouseup', handlePointerUp)
    return () => {
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('mouseup', handlePointerUp)
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!cropState || processingCrop) return
      if (event.key === 'Escape') {
        closeCropper()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cropState, processingCrop])

  const stats = useMemo(() => [
    { label: 'مرحله فعال', value: stepLabel(activeStep), delta: 'wizard فروشنده', detail: 'فقط همین مرحله نمایش داده می‌شود', tone: 'primary' as const },
    { label: 'وضعیت درخواست', value: applicationState === 'approved' ? 'تایید شده' : applicationState === 'under_review' ? 'در بررسی' : applicationState === 'submitted' ? 'ارسال شده' : 'پیش‌نویس', delta: storeName, detail: 'نمایش وضعیت فعلی فروشنده', tone: 'warning' as const },
    { label: 'مدارک', value: formatFaNumber(documents.length), delta: 'فایل‌های بارگذاری شده', detail: 'مدارک هویتی و کسب‌وکار', tone: 'success' as const },
    { label: 'محصول نمونه', value: hasApprovedProduct ? 'ثبت شده' : 'منتظر ثبت', delta: productState === 'approved' ? 'تایید شده' : productState === 'submitted' ? 'در بررسی' : 'در انتظار', detail: 'نمونه محصول با تصویر اصلی و گالری', tone: hasApprovedProduct ? 'success' as const : 'danger' as const },
  ], [activeStep, applicationState, documents.length, hasApprovedProduct, productState, storeName])

  function updateDraft<K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function readImageDimensions(sourceUrl: string) {
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('خواندن ابعاد تصویر ناموفق بود'))
      image.src = sourceUrl
    })
  }

  async function loadCropperFile(target: ProductImageCropTarget, files: File[], index: number) {
    const file = files[index]
    if (!file) return

    if (cropState?.sourceUrl) {
      URL.revokeObjectURL(cropState.sourceUrl)
    }

    const sourceUrl = URL.createObjectURL(file)
    try {
      const { width, height } = await readImageDimensions(sourceUrl)
      const next = centerCropOffsets(width, height)
      setCropState({
        target,
        files,
        currentIndex: index,
        sourceUrl,
        naturalWidth: width,
        naturalHeight: height,
        baseScale: next.baseScale,
        minZoom: next.minZoom,
        zoom: next.zoom,
        offsetX: next.offsetX,
        offsetY: next.offsetY,
      })
    } catch (cropError) {
      URL.revokeObjectURL(sourceUrl)
      setError(cropError instanceof Error ? cropError.message : 'آماده‌سازی کراپ تصویر ناموفق بود')
    }
  }

  async function openProductImageCropper(target: ProductImageCropTarget, files: File[]) {
    if (!files.length) return
    setError(null)
    setMessage(null)
    await loadCropperFile(target, files, 0)
  }

  function closeCropper() {
    if (cropState?.sourceUrl) {
      URL.revokeObjectURL(cropState.sourceUrl)
    }
    cropDragRef.current = null
    setCropState(null)
    setProcessingCrop(false)
  }

  async function exportCroppedFile(state: ProductImageCropState) {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('بارگذاری تصویر برای کراپ ناموفق بود'))
      element.src = state.sourceUrl
    })

    const displayScale = state.baseScale * state.zoom
    const sourceCropSize = PRODUCT_IMAGE_CROP_SIZE / displayScale
    const sourceX = clamp(-state.offsetX / displayScale, 0, Math.max(0, state.naturalWidth - sourceCropSize))
    const sourceY = clamp(-state.offsetY / displayScale, 0, Math.max(0, state.naturalHeight - sourceCropSize))
    const outputSize = Math.min(PRODUCT_IMAGE_MAX_EXPORT_SIZE, Math.round(sourceCropSize))
    const canvas = document.createElement('canvas')
    canvas.width = outputSize
    canvas.height = outputSize
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('آماده‌سازی canvas برای کراپ ناموفق بود')
    }

    context.drawImage(image, sourceX, sourceY, sourceCropSize, sourceCropSize, 0, 0, outputSize, outputSize)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result)
        else reject(new Error('ساخت فایل کراپ‌شده ناموفق بود'))
      }, 'image/png')
    })

    const original = state.files[state.currentIndex]
    return new File([blob], original?.name || `product-${Date.now()}.png`, { type: 'image/png' })
  }

  async function uploadCroppedProductMain(file: File) {
    setUploading('productMain')
    setUploadProgress((current) => ({ ...current, productMain: 20 }))
    const result = await vendorApi.uploadOnboardingFile(session, file)
    setUploadProgress((current) => ({ ...current, productMain: 100 }))
    updateDraft('productMainImage', result.url)
    setMessage('تصویر اصلی محصول نمونه با موفقیت بارگذاری شد.')
  }

  async function uploadCroppedProductGallery(file: File) {
    setUploading('gallery')
    setUploadProgress((current) => ({ ...current, gallery: 25 }))
    const result = await vendorApi.uploadOnboardingGallery(session, [file])
    setUploadProgress((current) => ({ ...current, gallery: 100 }))
    updateDraft('productGalleryImages', [...draft.productGalleryImages, ...result.map((item) => item.url)])
    setMessage('تصویر گالری محصول نمونه با موفقیت بارگذاری شد.')
  }

  async function handleCropConfirm() {
    if (!cropState) return
    setProcessingCrop(true)
    setError(null)
    setMessage(null)

    try {
      const croppedFile = await exportCroppedFile(cropState)
      if (cropState.target === 'productMain') {
        await uploadCroppedProductMain(croppedFile)
      } else {
        await uploadCroppedProductGallery(croppedFile)
      }

      const nextIndex = cropState.currentIndex + 1
      if (nextIndex < cropState.files.length) {
        await loadCropperFile(cropState.target, cropState.files, nextIndex)
      } else {
        closeCropper()
      }
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : 'کراپ و آپلود تصویر ناموفق بود')
    } finally {
      setProcessingCrop(false)
      window.setTimeout(() => {
        setUploading(null)
        setUploadProgress((current) => ({
          ...current,
          productMain: cropState?.target === 'productMain' ? 0 : current.productMain,
          gallery: cropState?.target === 'gallery' ? 0 : current.gallery,
        }))
      }, 400)
      if (fileInputRefs.productMain.current) {
        fileInputRefs.productMain.current.value = ''
      }
      if (fileInputRefs.productGallery.current) {
        fileInputRefs.productGallery.current.value = ''
      }
    }
  }

  function handleCropZoomChange(nextZoom: number) {
    setCropState((current) => {
      if (!current) return current
      const clampedZoom = Math.max(current.minZoom, nextZoom)
      const anchorX = PRODUCT_IMAGE_CROP_SIZE / 2
      const anchorY = PRODUCT_IMAGE_CROP_SIZE / 2
      const currentScale = current.baseScale * current.zoom
      const nextScale = current.baseScale * clampedZoom
      const imageX = (anchorX - current.offsetX) / currentScale
      const imageY = (anchorY - current.offsetY) / currentScale
      const nextState = {
        ...current,
        zoom: clampedZoom,
        offsetX: anchorX - imageX * nextScale,
        offsetY: anchorY - imageY * nextScale,
      }
      const bounds = getCropBounds(nextState)
      return {
        ...nextState,
        offsetX: clamp(nextState.offsetX, bounds.minOffsetX, bounds.maxOffsetX),
        offsetY: clamp(nextState.offsetY, bounds.minOffsetY, bounds.maxOffsetY),
      }
    })
  }

  function nudgeCropPosition(deltaX: number, deltaY: number) {
    setCropState((current) => {
      if (!current) return current
      const bounds = getCropBounds(current)
      return {
        ...current,
        offsetX: clamp(current.offsetX + deltaX, bounds.minOffsetX, bounds.maxOffsetX),
        offsetY: clamp(current.offsetY + deltaY, bounds.minOffsetY, bounds.maxOffsetY),
      }
    })
  }

  function resetCropPosition() {
    setCropState((current) => {
      if (!current) return current
      const next = centerCropOffsets(current.naturalWidth, current.naturalHeight)
      return {
        ...current,
        baseScale: next.baseScale,
        minZoom: next.minZoom,
        zoom: next.zoom,
        offsetX: next.offsetX,
        offsetY: next.offsetY,
      }
    })
  }

  async function handleBusinessLocationChange(nextValue: { lat: number; lng: number }) {
    setDraft((current) => ({
      ...current,
      businessLat: String(nextValue.lat),
      businessLng: String(nextValue.lng),
    }))

    try {
      const response = await fetch(
        `${vendorApi.getMapReverseUrl(nextValue.lat, nextValue.lng)}`,
        {
          headers: vendorApi.getMapReverseHeaders(),
        },
      )
      if (!response.ok) return
      const payload = (await response.json()) as Record<string, unknown>
      const addressText =
        typeof payload.address === 'string'
          ? payload.address
          : typeof payload.formatted_address === 'string'
            ? payload.formatted_address
            : ''

      if (addressText.trim()) {
        setDraft((current) => ({
          ...current,
          businessAddress: addressText.trim(),
        }))
      }
    } catch {}
  }

  async function uploadSingleFile(file: File, target: Exclude<UploadKey, 'gallery'>) {
    setUploading(target)
    setUploadProgress((current) => ({ ...current, [target]: 20 }))
    setError(null)
    try {
      const result = await vendorApi.uploadOnboardingFile(session, file)
      setUploadProgress((current) => ({ ...current, [target]: 100 }))
      if (target === 'license') updateDraft('licenseImageUrl', result.url)
      if (target === 'idFront') updateDraft('personalNationalIdFrontUrl', result.url)
      if (target === 'idBack') updateDraft('personalNationalIdBackUrl', result.url)
      if (target === 'productMain') updateDraft('productMainImage', result.url)
      setMessage('فایل با موفقیت بارگذاری شد و پیش‌نمایش آماده است.')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'بارگذاری فایل ناموفق بود')
    } finally {
      window.setTimeout(() => {
        setUploading(null)
        setUploadProgress((current) => ({ ...current, [target]: 0 }))
      }, 400)
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
      setDocuments([
        ...(draft.personalNationalIdFrontUrl ? [{ title: 'کارت ملی روی', url: draft.personalNationalIdFrontUrl }] : []),
        ...(draft.personalNationalIdBackUrl ? [{ title: 'کارت ملی پشت', url: draft.personalNationalIdBackUrl }] : []),
        ...(draft.licenseImageUrl ? [{ title: 'جواز کسب', url: draft.licenseImageUrl }] : []),
      ])
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
      void onRefreshSession(session)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ثبت محصول ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (applicationState !== 'approved' || productState !== 'approved') {
      return
    }

    void onRefreshSession(session)
  }, [applicationState, onRefreshSession, productState, session])

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
                <div className="vendor-upload-meta">
                  {uploading === 'idFront' || uploadProgress.idFront > 0 ? <div className="vendor-upload-progress" style={{ ['--progress' as string]: `${uploadProgress.idFront}%` }}><span>{uploadProgress.idFront}%</span></div> : null}
                  {renderUploadPreview(draft.personalNationalIdFrontUrl, 'پیش‌نمایش کارت ملی روی')}
                </div>
                {draft.personalNationalIdFrontUrl ? <small>مدرک ثبت شد.</small> : null}
              </div>
              <div className="vendor-upload-card">
                <span>کارت ملی پشت</span>
                <input ref={fileInputRefs.idBack} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadSingleFile(file, 'idBack') }} />
                <button className="fm-button fm-button--ghost" type="button" onClick={() => fileInputRefs.idBack.current?.click()} disabled={Boolean(uploading)}>{uploading === 'idBack' ? 'در حال بارگذاری...' : 'انتخاب فایل و بارگذاری'}</button>
                <div className="vendor-upload-meta">
                  {uploading === 'idBack' || uploadProgress.idBack > 0 ? <div className="vendor-upload-progress" style={{ ['--progress' as string]: `${uploadProgress.idBack}%` }}><span>{uploadProgress.idBack}%</span></div> : null}
                  {renderUploadPreview(draft.personalNationalIdBackUrl, 'پیش‌نمایش کارت ملی پشت')}
                </div>
                {draft.personalNationalIdBackUrl ? <small>مدرک ثبت شد.</small> : null}
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
              <div className="vendor-onboarding-field-wide">
                <VendorMapPicker
                  onChange={handleBusinessLocationChange}
                  value={{
                    lat: toNumericCoordinate(draft.businessLat, 35.7219),
                    lng: toNumericCoordinate(draft.businessLng, 51.3347),
                  }}
                />
              </div>
              <label className="fm-field vendor-onboarding-field-wide"><span>آدرس مغازه</span><textarea rows={3} value={draft.businessAddress} onChange={(event) => updateDraft('businessAddress', event.target.value)} placeholder="آدرس دقیق و قابل‌تحویل" /></label>
              <label className="fm-field"><span>عرض جغرافیایی</span><input value={draft.businessLat} readOnly placeholder="35.7219" inputMode="decimal" /></label>
              <label className="fm-field"><span>طول جغرافیایی</span><input value={draft.businessLng} readOnly placeholder="51.3347" inputMode="decimal" /></label>
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
                <div className="vendor-upload-meta">
                  {uploading === 'license' || uploadProgress.license > 0 ? <div className="vendor-upload-progress" style={{ ['--progress' as string]: `${uploadProgress.license}%` }}><span>{uploadProgress.license}%</span></div> : null}
                  {renderUploadPreview(draft.licenseImageUrl, 'پیش‌نمایش جواز کسب')}
                </div>
                {draft.licenseImageUrl ? <small>مدرک ثبت شد.</small> : null}
              </div>
            </div>
            <div className="vendor-onboarding-actions">
              <button className="fm-button fm-button--ghost" type="button" onClick={prevStep}>قبلی</button>
              <button className="fm-button fm-button--primary" type="button" disabled={saving} onClick={handleSubmitApplication}>{saving ? 'در حال ارسال...' : 'ارسال برای بررسی'}</button>
            </div>
          </SectionCard>
        ) : null}

        {activeStep === 'product' ? (
          <SectionCard eyebrow="مرحله ۴" title="محصول نمونه" description="فقط یک محصول نمونه با تصویر اصلی و گالری ثبت کن." hint="این مرحله برای بررسی محتوا و آماده‌سازی فروشنده کافی است.">
            <div className="vendor-onboarding-form-grid">
              <label className="fm-field vendor-onboarding-field-wide"><span>نام محصول</span><input value={draft.productName} onChange={(event) => updateDraft('productName', event.target.value)} placeholder="مثلا: رز قرمز ویژه" /></label>
              <div className="vendor-upload-card">
                <span>تصویر اصلی محصول</span>
                <input ref={fileInputRefs.productMain} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void openProductImageCropper('productMain', [file]) }} />
                <button className="fm-button fm-button--ghost" type="button" onClick={() => fileInputRefs.productMain.current?.click()} disabled={Boolean(uploading)}>{uploading === 'productMain' ? 'در حال بارگذاری...' : 'انتخاب فایل و بارگذاری'}</button>
                <div className="vendor-upload-meta">
                  {uploading === 'productMain' || uploadProgress.productMain > 0 ? <div className="vendor-upload-progress" style={{ ['--progress' as string]: `${uploadProgress.productMain}%` }}><span>{uploadProgress.productMain}%</span></div> : null}
                  {renderUploadPreview(draft.productMainImage, 'پیش‌نمایش تصویر اصلی محصول')}
                </div>
              </div>
              <div className="vendor-upload-card vendor-upload-card--wide">
                <span>گالری محصول</span>
                <input ref={fileInputRefs.productGallery} type="file" accept="image/*" multiple hidden onChange={(event) => { const files = event.target.files ? Array.from(event.target.files) : []; if (files.length) void openProductImageCropper('gallery', files) }} />
                <button className="fm-button fm-button--secondary" type="button" onClick={() => fileInputRefs.productGallery.current?.click()} disabled={Boolean(uploading)}>{uploading === 'gallery' ? 'در حال بارگذاری...' : 'انتخاب چند فایل و بارگذاری'}</button>
                <div className="vendor-upload-meta">
                  {uploading === 'gallery' || uploadProgress.gallery > 0 ? <div className="vendor-upload-progress" style={{ ['--progress' as string]: `${uploadProgress.gallery}%` }}><span>{uploadProgress.gallery}%</span></div> : null}
                  {draft.productGalleryImages.length ? (
                    <div className="vendor-upload-gallery-grid">
                      {draft.productGalleryImages.map((url, index) => <img key={`${url}-${index}`} className="vendor-upload-preview" src={url} alt={`گالری محصول ${index + 1}`} />)}
                    </div>
                  ) : null}
                </div>
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

      {cropState ? (
        <div className="product-image-cropper" dir="rtl">
          <div
            className="product-image-cropper__backdrop"
            onClick={() => {
              if (cropSuppressClickRef.current) return
              closeCropper()
            }}
          />
          <div className="product-image-cropper__panel" onClick={(event) => event.stopPropagation()}>
            <div className="product-image-cropper__header">
              <div>
                <strong>{cropState.target === 'productMain' ? 'تنظیم قاب تصویر اصلی' : 'تنظیم قاب گالری'}</strong>
                <span>1:1 · 800×800</span>
              </div>
              <button className="fm-button fm-button--ghost" disabled={processingCrop} onClick={closeCropper} type="button">
                بستن
              </button>
            </div>

            <div className="product-image-cropper__body">
              <div
                className="product-image-cropper__viewport"
                onMouseDown={(event) => {
                  if (!cropState) return
                  event.preventDefault()
                  cropSuppressClickRef.current = false
                  cropDragRef.current = {
                    startX: event.clientX,
                    startY: event.clientY,
                    originX: cropState.offsetX,
                    originY: cropState.offsetY,
                  }
                }}
                onWheel={(event) => {
                  event.preventDefault()
                  const delta = event.deltaY > 0 ? -0.08 : 0.08
                  handleCropZoomChange(Number((cropState.zoom + delta).toFixed(2)))
                }}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                onMouseUp={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                role="presentation"
              >
                <img
                  alt="پیش‌نمایش برش تصویر"
                  className="product-image-cropper__image"
                  draggable={false}
                  onDragStart={(event) => event.preventDefault()}
                  src={cropState.sourceUrl}
                  style={{
                    width: cropState.naturalWidth * cropState.baseScale * cropState.zoom,
                    height: cropState.naturalHeight * cropState.baseScale * cropState.zoom,
                    transform: `translate(${cropState.offsetX}px, ${cropState.offsetY}px)`,
                  }}
                />
                <div className="product-image-cropper__frame" />
              </div>

              <div className="product-image-cropper__controls">
                <div className="product-image-cropper__toolbar">
                  <button className="product-image-cropper__tool" onClick={() => handleCropZoomChange(Number((cropState.zoom - 0.08).toFixed(2)))} type="button">−</button>
                  <label className="product-image-cropper__slider">
                    <input
                      max="3"
                      min={cropState.minZoom}
                      onChange={(event) => handleCropZoomChange(Number(event.target.value))}
                      step="0.01"
                      type="range"
                      value={cropState.zoom}
                    />
                  </label>
                  <button className="product-image-cropper__tool" onClick={() => handleCropZoomChange(Number((cropState.zoom + 0.08).toFixed(2)))} type="button">+</button>
                  <button className="product-image-cropper__tool product-image-cropper__tool--reset" onClick={resetCropPosition} type="button">ریست</button>
                </div>
                <div className="product-image-cropper__nudge">
                  <button className="product-image-cropper__nudge-button" onClick={() => nudgeCropPosition(0, -12)} type="button">↑</button>
                  <button className="product-image-cropper__nudge-button" onClick={() => nudgeCropPosition(12, 0)} type="button">→</button>
                  <button className="product-image-cropper__nudge-button" onClick={() => nudgeCropPosition(0, 12)} type="button">↓</button>
                  <button className="product-image-cropper__nudge-button" onClick={() => nudgeCropPosition(-12, 0)} type="button">←</button>
                </div>
              </div>
            </div>

            <div className="product-image-cropper__footer">
              <span>فایل {cropState.currentIndex + 1} از {cropState.files.length}</span>
              <button className="fm-button fm-button--primary" disabled={processingCrop} onClick={() => void handleCropConfirm()} type="button">
                {processingCrop ? 'در حال پردازش...' : 'تایید'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

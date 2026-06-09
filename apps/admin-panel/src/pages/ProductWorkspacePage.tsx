import { FormatTextarea, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import {
  formatCurrency,
  formatPersianNumber,
  formatJalaliDate,
  getProductCategory,
  getProductImageCount,
  getContentReadinessLabel,
  getProductSeoReadinessLabel,
  getProductStatusLabel,
  getProductStore,
  getProductType,
  normalizeSlug,
  toProductRecord,
} from '../lib/products'
import type { AuthSession } from '../lib/session'

type ProductWorkspacePageProps = {
  session: AuthSession
  mode: 'create' | 'edit'
  productSlug: string | null
  onBack: () => void
}

type ProductRecord = Record<string, unknown>

type ProductFormState = {
  name: string
  slug: string
  shortDescription: string
  description: string
  price: string
  discountPrice: string
  quantity: string
  mainImage: string
  mainImageAlt: string
  imagesText: string
  galleryAltText: string
  videoUrl: string
  storeId: string
  categoryId: string
  productTypeId: string
  metaTitle: string
  metaDescription: string
  publicationStatus: string
  isPurchasable: boolean
  isArchived: boolean
  reviewNote: string
  compositions: Array<{
    elementId: string
    quantity: string
    elementType: string
  }>
}


type ProductImageCropTarget = 'main' | 'gallery'

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
    displayWidth,
    displayHeight,
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

function createEmptyProductForm(): ProductFormState {
  return {
    name: '',
    slug: '',
    shortDescription: '',
    description: '',
    price: '',
    discountPrice: '',
    quantity: '',
    mainImage: '',
    mainImageAlt: '',
    imagesText: '',
    galleryAltText: '',
    videoUrl: '',
    storeId: '',
    categoryId: '',
    productTypeId: '',
    metaTitle: '',
    metaDescription: '',
    publicationStatus: 'DRAFT',
    isPurchasable: false,
    isArchived: false,
    reviewNote: '',
    compositions: [],
  }
}

function toOptionalNumber(value: string) {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function toOptionalText(value: string) {
  const normalized = value.trim()
  return normalized === '' ? undefined : normalized
}

function mapProductToForm(product: ProductRecord): ProductFormState {
  const images = Array.isArray(product.images) ? product.images.filter((item): item is string => typeof item === 'string') : []
  const gallery = Array.isArray(product.gallery)
    ? product.gallery.filter((item): item is ProductRecord => typeof item === 'object' && item !== null)
    : []
  const compositions = Array.isArray(product.composition)
    ? product.composition.filter((item): item is ProductRecord => typeof item === 'object' && item !== null)
    : []
  return {
    name: readText(product, ['name'], ''),
    slug: readText(product, ['slug'], ''),
    shortDescription: readText(product, ['shortDescription'], ''),
    description: readText(product, ['description'], ''),
    price: readText(product, ['price'], ''),
    discountPrice: readText(product, ['discountPrice'], ''),
    quantity: readText(product, ['quantity'], ''),
    mainImage: readText(product, ['mainImage'], ''),
    mainImageAlt: readText(product, ['mainImageAlt'], ''),
    imagesText: gallery.length ? gallery.map((item) => readText(item, ['url'], '')).filter(Boolean).join('\n') : images.join('\n'),
    galleryAltText: gallery.map((item) => readText(item, ['alt'], '')).join('\n'),
    videoUrl: readText(product, ['videoUrl'], ''),
    storeId: readText(product, ['storeId'], ''),
    categoryId: readText(product, ['categoryId'], ''),
    productTypeId: readText(product, ['productTypeId'], ''),
    metaTitle: readText(product, ['metaTitle'], ''),
    metaDescription: readText(product, ['metaDescription'], ''),
    publicationStatus: readText(product, ['publicationStatus'], 'DRAFT'),
    isPurchasable: Boolean(product.isPurchasable),
    isArchived: Boolean(product.isArchived),
    reviewNote: readText(product, ['reviewNote'], ''),
    compositions: compositions.map((item) => ({
      elementId: readText(item, ['elementId', 'element.id'], ''),
      quantity: readText(item, ['quantity'], '1'),
      elementType: readText(item, ['elementType'], readText(item, ['element.type'], 'FLOWER')),
    })),
  }
}

export function ProductWorkspacePage({ session, mode, productSlug, onBack }: ProductWorkspacePageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [uploadingMainImage, setUploadingMainImage] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [workspaceMode, setWorkspaceMode] = useState<'create' | 'edit' | 'review'>(mode === 'create' ? 'create' : 'edit')
  const [currentProductSlug, setCurrentProductSlug] = useState<string | null>(productSlug)
  const [productDetail, setProductDetail] = useState<ProductRecord | null>(null)
  const [productForm, setProductForm] = useState<ProductFormState>(() => createEmptyProductForm())
  const [stores, setStores] = useState<ProductRecord[]>([])
  const [categories, setCategories] = useState<ProductRecord[]>([])
  const [productTypes, setProductTypes] = useState<ProductRecord[]>([])
  const [elements, setElements] = useState<ProductRecord[]>([])
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    seo: false,
    preview: true,
    signals: false,
    media: false,
    composition: false,
  })
  const mainImageInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const cropDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
  const cropSuppressClickRef = useRef(false)
  const [cropState, setCropState] = useState<ProductImageCropState | null>(null)
  const [processingCrop, setProcessingCrop] = useState(false)

  useNoticeEffect(error, 'error')
  useNoticeEffect(submitMessage, 'success')

  useEffect(() => {
    setWorkspaceMode(mode === 'create' ? 'create' : 'edit')
    setCurrentProductSlug(productSlug)
  }, [mode, productSlug])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [storesPayload, categoriesPayload, typesPayload, elementsPayload, detailPayload] = await Promise.all([
          adminApi.getStores(session),
          adminApi.getCategories(session),
          adminApi.getProductTypes(session),
          adminApi.getProductElements(session),
          currentProductSlug ? adminApi.getProductDetail(session, currentProductSlug) : Promise.resolve(null),
        ])

        if (!active) return

        setStores(toArray(storesPayload))
        setCategories(toArray(categoriesPayload))
        setProductTypes(toArray(typesPayload))
        setElements(toArray(elementsPayload))

        if (detailPayload) {
          const nextProduct = toProductRecord(detailPayload)
          setProductDetail(nextProduct)
          setProductForm(mapProductToForm(nextProduct))
        } else {
          setProductDetail(null)
          setProductForm(createEmptyProductForm())
        }
      } catch (requestError) {
        if (!active) return
        setError(requestError instanceof Error ? requestError.message : 'خطا در بارگذاری workspace محصول')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [currentProductSlug, session])

  const contentReadiness = useMemo(
    () =>
      getContentReadinessLabel({
        name: productForm.name,
        shortDescription: productForm.shortDescription,
        description: productForm.description,
        mainImage: productForm.mainImage,
      }),
    [productForm.description, productForm.mainImage, productForm.name, productForm.shortDescription],
  )

  const seoReadiness = useMemo(
    () =>
      getProductSeoReadinessLabel({
        slug: productForm.slug,
        metaTitle: productForm.metaTitle,
        metaDescription: productForm.metaDescription,
      }),
    [productForm.metaDescription, productForm.metaTitle, productForm.slug],
  )

  const galleryImages = useMemo(
    () =>
      productForm.imagesText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    [productForm.imagesText],
  )

  const galleryAltItems = useMemo(
    () =>
      productForm.galleryAltText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    [productForm.galleryAltText],
  )

  const workspaceMeta = useMemo(
    () => [
      { label: 'حالت فعال', value: workspaceMode === 'create' ? 'ایجاد محصول' : workspaceMode === 'review' ? 'بازبینی محصول' : 'ویرایش محصول' },
      { label: 'فروشگاه', value: productDetail ? getProductStore(productDetail) : readText(stores.find((item) => readText(item, ['id'], '') === productForm.storeId) ?? {}, ['name'], 'هنوز انتخاب نشده') },
      { label: 'دسته‌بندی', value: productDetail ? getProductCategory(productDetail) : readText(categories.find((item) => readText(item, ['id'], '') === productForm.categoryId) ?? {}, ['name', 'title'], 'هنوز انتخاب نشده') },
      { label: 'نوع محصول', value: productDetail ? getProductType(productDetail) : readText(productTypes.find((item) => readText(item, ['id'], '') === productForm.productTypeId) ?? {}, ['name'], 'هنوز انتخاب نشده') },
      { label: 'آخرین ویرایش', value: productDetail ? formatJalaliDate(productDetail.updatedAt ?? productDetail.createdAt, true) : 'هنوز ثبت نشده' },
      { label: 'وضعیت انتشار', value: productForm.publicationStatus || 'DRAFT' },
      { label: 'قابلیت خرید', value: productForm.isPurchasable ? 'قابل خرید' : 'غیرقابل خرید' },
    ],
    [categories, productDetail, productForm.categoryId, productForm.isPurchasable, productForm.productTypeId, productForm.publicationStatus, productForm.storeId, productTypes, stores, workspaceMode],
  )

  const workspaceSignals = useMemo(
    () => [
      { label: 'تصویرها', value: formatPersianNumber((productForm.mainImage.trim() ? 1 : 0) + galleryImages.length), hint: 'تصویر اصلی و گالری' },
      { label: 'قیمت نهایی', value: productForm.discountPrice ? formatCurrency(productForm.discountPrice) : productForm.price ? formatCurrency(productForm.price) : 'ثبت نشده', hint: 'مبنای نمایش فعلی' },
      { label: 'المان‌های آماده', value: formatPersianNumber(elements.length), hint: 'برای composition بعدی' },
      { label: 'حجم توضیح', value: formatPersianNumber(productForm.description.replace(/<[^>]*>/g, ' ').trim().length), hint: 'تقریبی از محتوای بدنه' },
    ],
    [elements.length, galleryImages.length, productForm.description, productForm.discountPrice, productForm.mainImage, productForm.price],
  )

  const seoChecklist = useMemo(
    () => [
      { label: 'اسلاگ', value: productForm.slug.trim() ? 'آماده' : 'نیازمند تکمیل' },
      { label: 'عنوان متا', value: productForm.metaTitle.trim() ? `${formatPersianNumber(productForm.metaTitle.trim().length)} کاراکتر` : 'نیازمند تکمیل' },
      { label: 'توضیح متا', value: productForm.metaDescription.trim() ? `${formatPersianNumber(productForm.metaDescription.trim().length)} کاراکتر` : 'نیازمند تکمیل' },
      { label: 'خلاصه کوتاه', value: productForm.shortDescription.trim() ? 'ثبت شده' : 'نیازمند تکمیل' },
    ],
    [productForm.metaDescription, productForm.metaTitle, productForm.shortDescription, productForm.slug],
  )

  const operationalNotes = useMemo(
    () => [
      `این محصول از نظر محتوا ${contentReadiness} است و باید قبل از انتشار، متن و رسانه‌اش یکدست بماند.`,
      `آمادگی سئو فعلاً ${seoReadiness} است؛ قبل از نهایی‌سازی، عنوان متا و توضیح متا را بازبینی کن.`,
      productForm.quantity ? `موجودی فعلی ${formatPersianNumber(productForm.quantity)} عدد است و باید با قیمت ثبت‌شده هم‌خوان بماند.` : 'موجودی هنوز مشخص نشده و برای تصمیم‌گیری عملیاتی باید کامل شود.',
    ],
    [contentReadiness, productForm.quantity, seoReadiness],
  )

  const previewTitle = productForm.metaTitle.trim() || productForm.name.trim() || 'عنوان محصول'
  const previewDescription =
    productForm.metaDescription.trim() ||
    productForm.shortDescription.trim() ||
    productForm.description.replace(/\s+/g, ' ').trim().slice(0, 160) ||
    'توضیح کوتاه برای این محصول هنوز تکمیل نشده است.'

  async function handleSubmit() {
    if (!productForm.name.trim()) {
      setError('نام محصول را وارد کن.')
      return
    }
    if (!productForm.storeId || !productForm.categoryId || !productForm.productTypeId) {
      setError('فروشگاه، دسته‌بندی و نوع محصول باید مشخص شوند.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSubmitMessage(null)

    const body = {
      name: productForm.name.trim(),
      slug: productForm.slug.trim() || undefined,
      shortDescription: toOptionalText(productForm.shortDescription),
      description: toOptionalText(productForm.description),
      price: toOptionalNumber(productForm.price) ?? 0,
      discountPrice: toOptionalNumber(productForm.discountPrice),
      quantity: toOptionalNumber(productForm.quantity) ?? 0,
      mainImage: productForm.mainImage.trim(),
      mainImageAlt: toOptionalText(productForm.mainImageAlt),
      images: productForm.imagesText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
      gallery: productForm.imagesText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((url, index) => ({
          url,
          alt: productForm.galleryAltText
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean)[index] || undefined,
        })),
      videoUrl: toOptionalText(productForm.videoUrl),
      storeId: Number(productForm.storeId),
      categoryId: Number(productForm.categoryId),
      productTypeId: Number(productForm.productTypeId),
      metaTitle: toOptionalText(productForm.metaTitle),
      metaDescription: toOptionalText(productForm.metaDescription),
      publicationStatus: productForm.publicationStatus || undefined,
      isPurchasable: productForm.isPurchasable,
      isArchived: productForm.isArchived,
      reviewNote: toOptionalText(productForm.reviewNote),
      compositions: productForm.compositions
        .filter((item) => item.elementId && item.quantity)
        .map((item) => ({
          elementId: Number(item.elementId),
          quantity: Number(item.quantity),
          elementType: item.elementType,
        })),
    }

    try {
      if (workspaceMode === 'create') {
        const created = await adminApi.createProduct(session, body)
        const createdRecord = toProductRecord(created)
        const nextSlug = readText(createdRecord, ['slug'], '')
        setSubmitMessage('محصول جدید با موفقیت ثبت شد.')
        if (nextSlug) {
          setCurrentProductSlug(nextSlug)
          setWorkspaceMode('edit')
        }
      } else if (productDetail) {
        await adminApi.updateProduct(session, readText(productDetail, ['id'], ''), body)
        setSubmitMessage('تغییرات محصول با موفقیت ذخیره شد.')
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ذخیره محصول ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }


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

  async function readImageDimensions(sourceUrl: string) {
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('خواندن ابعاد تصویر ناموفق بود'))
      image.src = sourceUrl
    })
  }

  async function openProductImageCropper(target: ProductImageCropTarget, files: File[]) {
    if (!files.length) return
    setError(null)
    await loadCropperFile(target, files, 0)
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

  async function uploadCroppedMainImage(file: File) {
    const uploaded = await adminApi.uploadProductImage(session, file)
    setProductForm((current) => ({
      ...current,
      mainImage: uploaded.url,
      mainImageAlt: current.mainImageAlt.trim() || current.name.trim() || 'تصویر اصلی محصول',
    }))
  }

  async function uploadCroppedGalleryImage(file: File) {
    const uploaded = await adminApi.uploadGalleryImages(session, [file])
    setProductForm((current) => {
      const currentImages = current.imagesText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
      const currentAlts = current.galleryAltText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
      const nextImages = [...currentImages, ...uploaded.map((item) => item.url)]
      const nextAlts = [...currentAlts, ...uploaded.map(() => current.name.trim() || 'تصویر گالری محصول')]

      return {
        ...current,
        imagesText: nextImages.join('\n'),
        galleryAltText: nextAlts.join('\n'),
      }
    })
  }

  async function handleCropConfirm() {
    if (!cropState) return
    setProcessingCrop(true)
    setError(null)

    try {
      const croppedFile = await exportCroppedFile(cropState)
      if (cropState.target === 'main') {
        setUploadingMainImage(true)
        await uploadCroppedMainImage(croppedFile)
      } else {
        setUploadingGallery(true)
        await uploadCroppedGalleryImage(croppedFile)
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
      setUploadingMainImage(false)
      setUploadingGallery(false)
      if (mainImageInputRef.current) {
        mainImageInputRef.current.value = ''
      }
      if (galleryInputRef.current) {
        galleryInputRef.current.value = ''
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

  async function handleMainImageChoose(fileList: FileList | null) {
    const files = fileList ? Array.from(fileList) : []
    if (!files.length) return
    await openProductImageCropper('main', files)
  }

  async function handleGalleryChoose(fileList: FileList | null) {
    const files = fileList ? Array.from(fileList) : []
    if (!files.length) return
    await openProductImageCropper('gallery', files)
  }

  async function handleRequestChanges() {
    if (!productDetail) return
    setSubmitting(true)
    setError(null)
    try {
      await adminApi.reviewProduct(session, readText(productDetail, ['id'], ''), {
        requestChanges: true,
        reviewNote: productForm.reviewNote,
      })
      setSubmitMessage('محصول برای اصلاح به فروشنده بازگردانده شد.')
      setProductForm((current) => ({ ...current, publicationStatus: 'CHANGES_REQUESTED' }))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ارسال برای اصلاح ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApproveReview() {
    if (!productDetail) return
    setSubmitting(true)
    setError(null)
    try {
      await adminApi.reviewProduct(session, readText(productDetail, ['id'], ''), {
        approved: true,
        reviewNote: productForm.reviewNote,
      })
      setSubmitMessage('محصول تایید شد و آماده انتشار است.')
      setProductForm((current) => ({ ...current, publicationStatus: 'APPROVED' }))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تایید محصول ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePublishToggle(nextPublish: boolean) {
    if (!productDetail) return
    setSubmitting(true)
    setError(null)
    try {
      await adminApi.publishProduct(session, readText(productDetail, ['id'], ''), {
        publish: nextPublish,
        note: productForm.reviewNote,
      })
      setSubmitMessage(nextPublish ? 'محصول منتشر شد.' : 'محصول از انتشار خارج شد.')
      setProductForm((current) => ({ ...current, publicationStatus: nextPublish ? 'PUBLISHED' : 'APPROVED' }))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تغییر انتشار ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePurchasableToggle(nextPurchasable: boolean) {
    if (!productDetail) return
    setSubmitting(true)
    setError(null)
    try {
      await adminApi.toggleProductPurchasable(session, readText(productDetail, ['id'], ''), {
        isPurchasable: nextPurchasable,
        isArchived: productForm.isArchived,
        note: productForm.reviewNote,
      })
      setSubmitMessage(nextPurchasable ? 'محصول قابل خرید شد.' : 'محصول از خرید خارج شد.')
      setProductForm((current) => ({ ...current, isPurchasable: nextPurchasable }))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تغییر قابلیت خرید ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleArchiveToggle(nextArchived: boolean) {
    if (!productDetail) return
    setSubmitting(true)
    setError(null)
    try {
      await adminApi.updateProduct(session, readText(productDetail, ['id'], ''), {
        isArchived: nextArchived,
        isPurchasable: nextArchived ? false : productForm.isPurchasable,
      })
      setSubmitMessage(nextArchived ? 'محصول آرشیو شد.' : 'محصول از آرشیو خارج شد.')
      setProductForm((current) => ({
        ...current,
        isArchived: nextArchived,
        isPurchasable: nextArchived ? false : current.isPurchasable,
      }))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تغییر وضعیت آرشیو ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  function addCompositionRow() {
    setProductForm((current) => ({
      ...current,
      compositions: [
        ...current.compositions,
        {
          elementId: readText(elements[0] ?? {}, ['id'], ''),
          quantity: '1',
          elementType: readText(elements[0] ?? {}, ['type'], 'FLOWER'),
        },
      ],
    }))
  }

  function updateCompositionRow(index: number, patch: Partial<ProductFormState['compositions'][number]>) {
    setProductForm((current) => ({
      ...current,
      compositions: current.compositions.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }))
  }

  function removeCompositionRow(index: number) {
    setProductForm((current) => ({
      ...current,
      compositions: current.compositions.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  function toggleSection(key: string) {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <div className="fm-stack product-workspace-page">
      <LoadableState error={error} loading={loading}>
        <div className="content-workspace-topbar-actions">
          <button className="content-secondary-action" onClick={onBack} type="button">
            بازگشت به کارتابل محصول‌ها
          </button>
          {productDetail ? (
            <button className="content-secondary-action" disabled={submitting} onClick={() => void handleRequestChanges()} type="button">
              بازگشت برای اصلاح
            </button>
          ) : null}
          {productDetail ? (
            <button className="content-secondary-action" disabled={submitting} onClick={() => void handleApproveReview()} type="button">
              تایید برای انتشار
            </button>
          ) : null}
          <button className="content-primary-action" disabled={submitting} onClick={() => setWorkspaceMode('review')} type="button">
            حالت بازبینی
          </button>
          <button className="content-primary-action" disabled={submitting} onClick={handleSubmit} type="button">
            {workspaceMode === 'create' ? 'ثبت محصول' : 'ذخیره تغییرات'}
          </button>
        </div>

        <div className="content-workspace-meta-grid product-workspace-meta-grid">
          {workspaceMeta.map((item) => (
            <article className="content-workspace-meta-item" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>

        <SectionCard eyebrow="برداشت سریع" title="خلاصه تصمیم‌محور میزکار" description="قبل از ورود به فرم‌های عمیق، همین‌جا باید بدانی این محصول از نظر محتوا، سئو و عملیات در چه وضعیتی است.">
          <div className="content-workspace-signal-grid product-workspace-signal-grid">
            <article className="content-workspace-signal-item">
              <span>آمادگی محتوایی</span>
              <strong>{contentReadiness}</strong>
            </article>
            <article className="content-workspace-signal-item">
              <span>آمادگی سئو</span>
              <strong>{seoReadiness}</strong>
            </article>
            {workspaceSignals.map((item) => (
              <article className="content-workspace-signal-item" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
          <div className="product-workspace-note-list">
            {operationalNotes.map((note) => (
              <article className="product-workspace-note-item" key={note}>
                <strong>یادداشت اجرایی</strong>
                <p>{note}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="وضعیت اجرایی" title="بازبینی ادمین و availability" description="این بخش حالا به workflow واقعی backend وصل است و انتشار یا خریدپذیری محصول را بدون حذف فیزیکی کنترل می‌کند.">
          <div className="content-workspace-checklist-grid product-workspace-checklist-grid">
            <article className="content-workspace-check-item">
              <span>وضعیت انتشار</span>
              <strong>{productForm.publicationStatus || 'DRAFT'}</strong>
            </article>
            <article className="content-workspace-check-item">
              <span>قابل خرید</span>
              <strong>{productForm.isPurchasable ? 'بله' : 'خیر'}</strong>
            </article>
            <article className="content-workspace-check-item">
              <span>آرشیو</span>
              <strong>{productForm.isArchived ? 'بله' : 'خیر'}</strong>
            </article>
          </div>
          <div className="content-workspace-topbar-actions">
            {productDetail ? (
              <button className="content-secondary-action" disabled={submitting} onClick={() => void handlePublishToggle(productForm.publicationStatus !== 'PUBLISHED')} type="button">
                {productForm.publicationStatus === 'PUBLISHED' ? 'خروج از انتشار' : 'انتشار محصول'}
              </button>
            ) : null}
            {productDetail ? (
              <button className="content-secondary-action" disabled={submitting} onClick={() => void handlePurchasableToggle(!productForm.isPurchasable)} type="button">
                {productForm.isPurchasable ? 'غیرقابل‌خرید کردن' : 'قابل‌خرید کردن'}
              </button>
            ) : null}
            {productDetail ? (
              <button className="content-secondary-action" disabled={submitting} onClick={() => void handleArchiveToggle(!productForm.isArchived)} type="button">
                {productForm.isArchived ? 'خروج از آرشیو' : 'آرشیو کردن'}
              </button>
            ) : null}
          </div>
          <div className="product-workspace-note-list">
            <article className="product-workspace-note-item">
              <strong>workflow تایید محصول</strong>
              <p>محصول فروشنده حالا می‌تواند در صف بازبینی بماند، برای اصلاح برگردد، تایید شود و بعد توسط ادمین منتشر شود.</p>
            </article>
            <article className="product-workspace-note-item">
              <strong>حذف نکردن محصول</strong>
              <p>برای حفظ جایگاه سئو، رفتار اصلی این route حذف فیزیکی نیست؛ محصول می‌تواند غیرقابل‌خرید یا آرشیو شود و بعداً دوباره برگردد.</p>
            </article>
          </div>
        </SectionCard>

        <div className="content-workspace-stack product-workspace-stack">
          <SectionCard eyebrow="اطلاعات پایه" title="هسته محصول" description="نام، اسلاگ، خلاصه و قیمت‌ها را اینجا کامل کن تا هویت محصول روشن شود.">
            <div className="content-editor-grid">
              <label className="content-select-field">
                <span>نام محصول</span>
                <input
                  className="fm-input"
                  onChange={(event) => {
                    const nextName = event.target.value
                    setProductForm((current) => ({
                      ...current,
                      name: nextName,
                      slug: current.slug ? current.slug : normalizeSlug(nextName),
                    }))
                  }}
                  value={productForm.name}
                />
              </label>
              <label className="content-select-field">
                <span>اسلاگ</span>
                <input
                  className="fm-input"
                  onChange={(event) => setProductForm((current) => ({ ...current, slug: normalizeSlug(event.target.value) }))}
                  value={productForm.slug}
                />
              </label>
              <label className="content-select-field content-editor-field--wide">
                <span>خلاصه کوتاه</span>
                <textarea
                  className="fm-input"
                  onChange={(event) => setProductForm((current) => ({ ...current, shortDescription: event.target.value }))}
                  rows={4}
                  value={productForm.shortDescription}
                />
              </label>
              <label className="content-select-field content-editor-field--wide">
                <span>توضیح کامل محصول</span>
                <FormatTextarea
                  id="product-description"
                  onChange={(value) => setProductForm((current) => ({ ...current, description: value }))}
                  placeholder="توضیح کامل محصول را اینجا بنویس..."
                  value={productForm.description}
                />
              </label>
              <label className="content-select-field">
                <span>قیمت پایه</span>
                <input className="fm-input" inputMode="numeric" onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} placeholder="مثلاً ۴۹۰۰۰۰" value={productForm.price} />
              </label>
              <label className="content-select-field">
                <span>قیمت تخفیفی</span>
                <input className="fm-input" inputMode="numeric" onChange={(event) => setProductForm((current) => ({ ...current, discountPrice: event.target.value }))} placeholder="در صورت وجود تخفیف" value={productForm.discountPrice} />
              </label>
              <label className="content-select-field">
                <span>موجودی</span>
                <input className="fm-input" inputMode="numeric" onChange={(event) => setProductForm((current) => ({ ...current, quantity: event.target.value }))} placeholder="تعداد موجودی" value={productForm.quantity} />
              </label>
            </div>
          </SectionCard>

          <SectionCard eyebrow="مالکیت و دسته‌بندی" title="فروشگاه، دسته و نوع محصول" description="این بخش مسیر ناوبری، مالکیت و تفسیر محتوایی محصول را مشخص می‌کند.">
            <div className="content-editor-grid">
              <label className="content-select-field">
                <span>فروشگاه</span>
                <select className="fm-input" onChange={(event) => setProductForm((current) => ({ ...current, storeId: event.target.value }))} value={productForm.storeId}>
                  <option value="">انتخاب فروشگاه</option>
                  {stores.map((item) => (
                    <option key={readText(item, ['id'], '')} value={readText(item, ['id'], '')}>
                      {readText(item, ['name'], 'فروشگاه')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="content-select-field">
                <span>دسته‌بندی</span>
                <select className="fm-input" onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))} value={productForm.categoryId}>
                  <option value="">انتخاب دسته‌بندی</option>
                  {categories.map((item) => (
                    <option key={readText(item, ['id'], '')} value={readText(item, ['id'], '')}>
                      {readText(item, ['name', 'title'], 'دسته‌بندی')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="content-select-field">
                <span>نوع محصول</span>
                <select className="fm-input" onChange={(event) => setProductForm((current) => ({ ...current, productTypeId: event.target.value }))} value={productForm.productTypeId}>
                  <option value="">انتخاب نوع محصول</option>
                  {productTypes.map((item) => (
                    <option key={readText(item, ['id'], '')} value={readText(item, ['id'], '')}>
                      {readText(item, ['name'], 'نوع محصول')}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="رسانه‌ها"
            title="تصویر و ویدیو"
            description="این بخش کمک می‌کند تیم محتوا سریع ببیند محصول از نظر رسانه آماده است یا نه."
            actions={
              <button className={`content-accordion-trigger${openSections.media ? ' is-open' : ''}`} onClick={() => toggleSection('media')} type="button">
                {openSections.media ? 'بستن رسانه‌ها' : 'باز کردن رسانه‌ها'}
              </button>
            }
          >
            {openSections.media ? (
              <div className="content-editor-grid">
                <div className="content-select-field content-editor-field--wide">
                  <span>تصویر اصلی</span>
                  <div className="admin-products-upload-card">
                    <div className="admin-products-upload-actions">
                      <button className="content-secondary-action" disabled={uploadingMainImage} onClick={() => mainImageInputRef.current?.click()} type="button">
                        {uploadingMainImage ? 'در حال آپلود...' : 'انتخاب تصویر اصلی'}
                      </button>
                      <input
                        ref={mainImageInputRef}
                        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                        className="admin-products-file-input"
                        onChange={(event) => void handleMainImageChoose(event.target.files)}
                        type="file"
                      />
                      <span className="admin-products-upload-hint">لینک مستقیم تصویر پنهان شده تا UI شلوغ نشود؛ بعد از انتخاب فایل، آدرس نهایی خودکار ثبت می‌شود.</span>
                    </div>

                    {productForm.mainImage ? (
                      <div className="admin-products-image-preview">
                        <img alt={productForm.mainImageAlt.trim() || 'پیش‌نمایش تصویر اصلی محصول'} src={productForm.mainImage} />
                      </div>
                    ) : null}

                    <label className="content-select-field">
                      <span>متن جایگزین تصویر اصلی</span>
                      <input
                        className="fm-input"
                        onChange={(event) => setProductForm((current) => ({ ...current, mainImageAlt: event.target.value }))}
                        placeholder="مثلاً دسته‌گل رز سفید برای مناسبت رسمی"
                        value={productForm.mainImageAlt}
                      />
                    </label>
                  </div>
                </div>

                <div className="content-select-field content-editor-field--wide">
                  <span>تصاویر گالری</span>
                  <div className="admin-products-upload-card">
                    <div className="admin-products-upload-actions">
                      <button className="content-secondary-action" disabled={uploadingGallery} onClick={() => galleryInputRef.current?.click()} type="button">
                        {uploadingGallery ? 'در حال آپلود...' : 'انتخاب تصاویر گالری'}
                      </button>
                      <input
                        ref={galleryInputRef}
                        multiple
                        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                        className="admin-products-file-input"
                        onChange={(event) => void handleGalleryChoose(event.target.files)}
                        type="file"
                      />
                      <span className="admin-products-upload-hint">برای هر تصویر گالری هم ALT لازم است؛ فعلاً هر خط ALT متناظر با همان تصویر در همان ترتیب ذخیره می‌شود.</span>
                    </div>

                    {galleryImages.length ? (
                      <div className="admin-products-gallery-preview">
                        {galleryImages.map((url, index) => (
                          <article className="admin-products-gallery-item" key={`${url}-${index}`}>
                            <img alt={galleryAltItems[index] || `پیش‌نمایش گالری ${index + 1}`} src={url} />
                            <span>{galleryAltItems[index] || 'ALT ثبت نشده'}</span>
                          </article>
                        ))}
                      </div>
                    ) : null}

                    <label className="content-select-field content-editor-field--wide">
                      <span>متن جایگزین گالری</span>
                      <textarea
                        className="fm-input"
                        onChange={(event) => setProductForm((current) => ({ ...current, galleryAltText: event.target.value }))}
                        placeholder="هر خط ALT متناظر با یک تصویر گالری باشد"
                        rows={4}
                        value={productForm.galleryAltText}
                      />
                    </label>
                  </div>
                </div>

                <label className="content-select-field">
                  <span>ویدیو</span>
                  <input className="fm-input" onChange={(event) => setProductForm((current) => ({ ...current, videoUrl: event.target.value }))} value={productForm.videoUrl} />
                </label>
                <label className="content-select-field content-editor-field--wide">
                  <span>یادداشت بازبینی ادمین</span>
                  <textarea
                    className="fm-input"
                    onChange={(event) => setProductForm((current) => ({ ...current, reviewNote: event.target.value }))}
                    placeholder="اگر محصول باید برای اصلاح برگردد یا نکته‌ای برای انتشار دارد اینجا ثبت کن"
                    rows={4}
                    value={productForm.reviewNote}
                  />
                </label>
              </div>
            ) : (
              <p className="content-collapsed-note">برای جلوگیری از طول زیاد صفحه، رسانه‌ها در این بخش collapsible نگه داشته می‌شوند.</p>
            )}
          </SectionCard>

          <SectionCard
            eyebrow="سئو و پیش‌نمایش"
            title="metadata، snippet و readiness"
            description="این بخش مخصوص تیم سئو است تا بدون شلوغ شدن route، آماده‌بودن خروجی جستجو را ببیند."
            actions={
              <button className={`content-accordion-trigger${openSections.seo ? ' is-open' : ''}`} onClick={() => toggleSection('seo')} type="button">
                {openSections.seo ? 'بستن تنظیمات سئو' : 'باز کردن تنظیمات سئو'}
              </button>
            }
          >
            {openSections.seo ? (
              <div className="content-editor-grid">
                <label className="content-select-field">
                  <span>عنوان متا</span>
                  <input className="fm-input" onChange={(event) => setProductForm((current) => ({ ...current, metaTitle: event.target.value }))} value={productForm.metaTitle} />
                </label>
                <label className="content-select-field content-editor-field--wide">
                  <span>توضیح متا</span>
                  <textarea className="fm-input" onChange={(event) => setProductForm((current) => ({ ...current, metaDescription: event.target.value }))} rows={4} value={productForm.metaDescription} />
                </label>
              </div>
            ) : (
              <p className="content-collapsed-note">تنظیمات سئو در این بخش جمع می‌شوند تا تمرکز روی هسته محصول حفظ شود.</p>
            )}

            <div className="content-workspace-checklist-grid product-workspace-checklist-grid">
              {seoChecklist.map((item) => (
                <article className="content-workspace-check-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>

            <div className="content-preview-grid product-preview-grid">
              <article className="content-preview-card">
                <span>پیش‌نمایش جستجو</span>
                <strong>{previewTitle}</strong>
                <p>{previewDescription}</p>
              </article>
              <article className="content-preview-card">
                <span>سیگنال سئو</span>
                <strong>{seoReadiness}</strong>
                <p>اسلاگ، عنوان متا و توضیح متا معیارهای اولیه این نمای readiness هستند.</p>
              </article>
              <article className="content-preview-card">
                <span>پیش‌نمایش محصول</span>
                <strong>{productForm.name.trim() || 'نام محصول هنوز تکمیل نشده'}</strong>
                <p>{productForm.shortDescription.trim() || 'خلاصه کوتاه این محصول هنوز نوشته نشده است.'}</p>
              </article>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="سیگنال‌ها و بازبینی"
            title="نمای کوتاه برای تیم محتوا و سئو"
            description="این بخش فقط برای decision support است و قرار نیست جای فرم اصلی را بگیرد."
            actions={
              <button className={`content-accordion-trigger${openSections.signals ? ' is-open' : ''}`} onClick={() => toggleSection('signals')} type="button">
                {openSections.signals ? 'بستن سیگنال‌ها' : 'باز کردن سیگنال‌ها'}
              </button>
            }
          >
            {openSections.signals ? (
              <div className="content-workspace-signal-grid">
                <article className="content-workspace-signal-item">
                  <span>آمادگی محتوایی</span>
                  <strong>{contentReadiness}</strong>
                </article>
                <article className="content-workspace-signal-item">
                  <span>آمادگی سئو</span>
                  <strong>{seoReadiness}</strong>
                </article>
                <article className="content-workspace-signal-item">
                  <span>وضعیت موجودی</span>
                  <strong>
                    {getProductStatusLabel({
                      quantity: Number(productForm.quantity || 0),
                    })}
                  </strong>
                </article>
                <article className="content-workspace-signal-item">
                  <span>وضعیت قیمت</span>
                  <strong>{productForm.price ? formatCurrency(productForm.price) : 'ثبت نشده'}</strong>
                </article>
              </div>
            ) : (
              <p className="content-collapsed-note">signalهای کوتاه برای بازبینی سریع در این بخش فشرده نگه داشته می‌شوند.</p>
            )}
          </SectionCard>

          <SectionCard
            eyebrow="ترکیب محصول"
            title="elementها و composition"
            description="در این نسخه، visibility این بخش اضافه شده تا type و elementهای مجاز برای توسعه بعدی روشن بمانند."
            actions={
              <button className={`content-accordion-trigger${openSections.composition ? ' is-open' : ''}`} onClick={() => toggleSection('composition')} type="button">
                {openSections.composition ? 'بستن composition' : 'باز کردن composition'}
              </button>
            }
          >
            {openSections.composition ? (
              <>
                <div className="content-workspace-checklist-grid product-workspace-checklist-grid">
                  <article className="content-workspace-check-item">
                    <span>تعداد تصویرهای ثبت‌شده</span>
                    <strong>{formatPersianNumber((productForm.mainImage.trim() ? 1 : 0) + galleryImages.length)}</strong>
                  </article>
                  <article className="content-workspace-check-item">
                    <span>تعداد composition فعلی</span>
                    <strong>{formatPersianNumber(productForm.compositions.length)}</strong>
                  </article>
                  <article className="content-workspace-check-item">
                    <span>رسانه آماده نمایش</span>
                    <strong>{formatPersianNumber(getProductImageCount(productDetail ?? {}) || ((productForm.mainImage.trim() ? 1 : 0) + galleryImages.length))}</strong>
                  </article>
                </div>
                <div className="content-workspace-topbar-actions">
                  <button className="content-secondary-action" onClick={addCompositionRow} type="button">
                    افزودن جزء
                  </button>
                </div>
                {productForm.compositions.length ? (
                  <div className="admin-product-composition-list">
                    {productForm.compositions.map((item, index) => (
                      <article className="admin-product-composition-item" key={`${item.elementId}-${index}`}>
                        <label className="content-select-field">
                          <span>{`جزء ${formatPersianNumber(index + 1)}`}</span>
                          <select
                            className="fm-input"
                            onChange={(event) => {
                              const selectedElement = elements.find((entry) => readText(entry, ['id'], '') === event.target.value) ?? {}
                              updateCompositionRow(index, {
                                elementId: event.target.value,
                                elementType: readText(selectedElement, ['type'], item.elementType || 'FLOWER'),
                              })
                            }}
                            value={item.elementId}
                          >
                            {elements.map((entry) => (
                              <option key={readText(entry, ['id'], '')} value={readText(entry, ['id'], '')}>
                                {`${readText(entry, ['name'], 'المان')} · ${readText(entry, ['type'], '—')}`}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="content-select-field">
                          <span>تعداد</span>
                          <input className="fm-input" inputMode="numeric" onChange={(event) => updateCompositionRow(index, { quantity: event.target.value })} value={item.quantity} />
                        </label>
                        <label className="content-select-field">
                          <span>نوع جزء</span>
                          <select className="fm-input" onChange={(event) => updateCompositionRow(index, { elementType: event.target.value })} value={item.elementType}>
                            {['FLOWER', 'FILLER', 'BASE', 'ACCESSORY'].map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button className="content-secondary-action" onClick={() => removeCompositionRow(index)} type="button">
                          حذف جزء
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="products-muted-note">هنوز ترکیبی برای این محصول ثبت نشده است.</p>
                )}
                <div className="content-mini-checklist">
                  {elements.slice(0, 8).map((item) => (
                    <article className="content-mini-checklist-item" key={readText(item, ['id'], '')}>
                      <span>{readText(item, ['type'], 'المان')}</span>
                      <strong>{readText(item, ['name'], 'بدون نام')}</strong>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p className="content-collapsed-note">composition در این فاز بیشتر برای visibility و آمادگی توسعه بعدی نگه داشته شده است.</p>
            )}
          </SectionCard>

          <SectionCard eyebrow="راهنمای کار" title="قاعده این workspace" description="این صفحه برای ویرایش متمرکز ساخته شده است؛ summary کوتاه می‌دهد اما فرم اصلی را از دید کاربر پنهان نمی‌کند.">
            <div className="product-workspace-note-list">
              <article className="product-workspace-note-item">
                <strong>ترتیب پیشنهادی</strong>
                <p>اول هویت محصول و قیمت را کامل کن، بعد رسانه‌ها را ببند، و در آخر metadata و preview جستجو را بازبینی کن.</p>
              </article>
              <article className="product-workspace-note-item">
                <strong>قاعده انتشار</strong>
                <p>اگر خلاصه، توضیح، تصویر اصلی و metadata ناقص باشد، این محصول هنوز برای بازبینی نهایی و تصمیم محتوایی آماده نیست.</p>
              </article>
            </div>
          </SectionCard>
        </div>
      </LoadableState>

      {cropState ? (
        <div className="product-image-cropper" role="dialog" aria-modal="true">
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
                <strong>تنظیم قاب تصویر</strong>
                <span>{`1:1 · ${PRODUCT_IMAGE_MAX_EXPORT_SIZE}×${PRODUCT_IMAGE_MAX_EXPORT_SIZE}`}</span>
              </div>
              <button className="content-secondary-action" onClick={closeCropper} type="button">
                بستن
              </button>
            </div>

            <div className="product-image-cropper__body">
              <div
                className="product-image-cropper__viewport"
                onMouseDown={(event) => {
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
                >
                <img
                  alt="Crop preview"
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
                  <button className="product-image-cropper__tool" onClick={() => handleCropZoomChange(Number((cropState.zoom - 0.08).toFixed(2)))} type="button">
                    −
                  </button>
                  <label className="product-image-cropper__slider">
                    <input
                      max="3"
                      min={String(cropState.minZoom)}
                      onChange={(event) => handleCropZoomChange(Number(event.target.value))}
                      step="0.01"
                      type="range"
                      value={cropState.zoom}
                    />
                  </label>
                  <button className="product-image-cropper__tool" onClick={() => handleCropZoomChange(Number((cropState.zoom + 0.08).toFixed(2)))} type="button">
                    +
                  </button>
                  <button className="product-image-cropper__tool product-image-cropper__tool--reset" onClick={resetCropPosition} type="button">
                    ریست
                  </button>
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
              <span>{`تصویر ${formatPersianNumber(cropState.currentIndex + 1)} از ${formatPersianNumber(cropState.files.length)}`}</span>
              <button className="content-primary-action" disabled={processingCrop} onClick={() => void handleCropConfirm()} type="button">
                {processingCrop ? 'در حال پردازش...' : 'تایید'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

import { DataTable, Pill, RichTextEditor, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { vendorApi, type VendorProductPayload } from '../lib/api'
import { formatFaNumber, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type ProductRecord = Record<string, unknown>
type CategoryRecord = Record<string, unknown>
type CompositionRow = {
  elementId: string
  quantity: string
  elementType: string
}

type ProductFormState = {
  name: string
  categoryId: string
  productTypeId: string
  price: string
  discountPrice: string
  quantity: string
  mainImage: string
  mainImageAlt: string
  imagesText: string
  galleryAltText: string
  videoUrl: string
  shortDescription: string
  description: string
  metaTitle: string
  metaDescription: string
  publicationStatus: string
  isPurchasable: boolean
  isArchived: boolean
  reviewNote: string
  compositions: CompositionRow[]
}

type ProductOption = {
  id: string
  label: string
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

const productColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'name', label: 'محصول' },
  { key: 'category', label: 'دسته' },
  { key: 'price', label: 'قیمت' },
  { key: 'quantity', label: 'موجودی' },
]

const initialFormState: ProductFormState = {
  name: '',
  categoryId: '',
  productTypeId: '',
  price: '',
  discountPrice: '',
  quantity: '',
  mainImage: '',
  mainImageAlt: '',
  imagesText: '',
  galleryAltText: '',
  videoUrl: '',
  shortDescription: '',
  description: '',
  metaTitle: '',
  metaDescription: '',
  publicationStatus: 'DRAFT',
  isPurchasable: false,
  isArchived: false,
  reviewNote: '',
  compositions: [],
}

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

function getProductType(record: ProductRecord) {
  const productType = record.productType
  if (typeof productType === 'object' && productType !== null) {
    return readText(productType as ProductRecord, ['name'], '—')
  }

  return readText(record, ['productTypeName'], '—')
}

function getProductQuantity(record: ProductRecord) {
  return Number(readText(record, ['quantity'], '0'))
}

function getProductPrice(record: ProductRecord) {
  return Number(readText(record, ['price'], '0'))
}

function getDiscountPrice(record: ProductRecord) {
  const raw = readText(record, ['discountPrice'], '')
  if (!raw || raw === '—') return null
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

function flattenCategories(items: CategoryRecord[], depth = 0): ProductOption[] {
  return items.flatMap((item) => {
    const id = readText(item, ['id'], '')
    const name = readText(item, ['name', 'title'], 'دسته بدون نام')
    const prefix = depth > 0 ? `${'— '.repeat(depth)}` : ''
    const children = Array.isArray(item.children)
      ? item.children.map((child) => (typeof child === 'object' && child !== null ? (child as CategoryRecord) : {}))
      : []

    return [{ id, label: `${prefix}${name}` }, ...flattenCategories(children, depth + 1)]
  })
}

function getGalleryImages(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildPayload(form: ProductFormState, storeId: number): VendorProductPayload {
  const galleryImages = getGalleryImages(form.imagesText)
  const galleryAltItems = form.galleryAltText
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    shortDescription: form.shortDescription.trim() || undefined,
    price: Number(form.price),
    discountPrice: form.discountPrice.trim() ? Number(form.discountPrice) : undefined,
    quantity: Number(form.quantity),
    mainImage: form.mainImage.trim(),
    mainImageAlt: form.mainImageAlt.trim() || undefined,
    images: galleryImages.length ? galleryImages : undefined,
    gallery: galleryImages.length
      ? galleryImages.map((url, index) => ({ url, alt: galleryAltItems[index] || undefined }))
      : undefined,
    videoUrl: form.videoUrl.trim() || undefined,
    categoryId: Number(form.categoryId),
    storeId,
    productTypeId: Number(form.productTypeId),
    metaTitle: form.metaTitle.trim() || undefined,
    metaDescription: form.metaDescription.trim() || undefined,
    publicationStatus: form.publicationStatus || undefined,
    isPurchasable: form.isPurchasable,
    isArchived: form.isArchived,
    reviewNote: form.reviewNote.trim() || undefined,
    compositions: form.compositions
      .filter((item) => item.elementId && item.quantity)
      .map((item) => ({
        elementId: Number(item.elementId),
        quantity: Number(item.quantity),
        elementType: item.elementType as 'FLOWER' | 'FILLER' | 'BASE' | 'ACCESSORY',
      })),
  }
}

function formatPrice(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—'
  return `${formatFaNumber(value)} تومان`
}

function getImagesText(record: ProductRecord) {
  if (!Array.isArray(record.images)) return ''
  return record.images.map((item) => String(item)).join('\n')
}

function getGalleryAltText(record: ProductRecord) {
  if (!Array.isArray(record.gallery)) return ''
  return record.gallery
    .map((item) => (typeof item === 'object' && item !== null ? readText(item as ProductRecord, ['alt'], '') : ''))
    .join('\n')
}

function mapCompositions(record: ProductRecord): CompositionRow[] {
  if (!Array.isArray(record.composition)) return []
  return record.composition
    .map((item) => (typeof item === 'object' && item !== null ? (item as ProductRecord) : {}))
    .map((item) => ({
      elementId: readText(item, ['elementId', 'element.id'], ''),
      quantity: readText(item, ['quantity'], '1'),
      elementType: readText(item, ['elementType'], readText(item, ['element.type'], 'FLOWER')),
    }))
}

export function ProductsPage({ session }: { session: AuthSession }) {
  const mainImageInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const cropDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
  const cropSuppressClickRef = useRef(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingMainImage, setUploadingMainImage] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [categoryOptions, setCategoryOptions] = useState<ProductOption[]>([])
  const [productTypeOptions, setProductTypeOptions] = useState<ProductOption[]>([])
  const [elements, setElements] = useState<ProductRecord[]>([])
  const [search, setSearch] = useState('')
  const [inventoryFilter, setInventoryFilter] = useState('ALL')
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [storeId, setStoreId] = useState<number>(0)
  const [form, setForm] = useState<ProductFormState>(initialFormState)
  const [cropState, setCropState] = useState<ProductImageCropState | null>(null)
  const [processingCrop, setProcessingCrop] = useState(false)

  const galleryImages = useMemo(() => getGalleryImages(form.imagesText), [form.imagesText])
  const galleryAltItems = useMemo(
    () =>
      form.galleryAltText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    [form.galleryAltText],
  )

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
    setFormError(null)
    setFormMessage(null)
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
      setFormError(cropError instanceof Error ? cropError.message : 'آماده‌سازی کراپ تصویر ناموفق بود')
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
    const uploaded = await vendorApi.uploadProductImage(session, file)
    setForm((current) => ({ ...current, mainImage: uploaded.url, mainImageAlt: current.mainImageAlt || current.name || 'تصویر اصلی محصول' }))
    setFormMessage('تصویر اصلی آپلود شد و در فرم قرار گرفت.')
  }

  async function uploadCroppedGalleryImage(file: File) {
    const uploaded = await vendorApi.uploadGalleryImages(session, [file])
    const nextUrls = uploaded.map((item) => item.url)
    setForm((current) => {
      const merged = Array.from(new Set([...getGalleryImages(current.imagesText), ...nextUrls]))
      const nextAlts = [
        ...current.galleryAltText
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        ...uploaded.map(() => current.name || 'تصویر گالری محصول'),
      ]
      return { ...current, imagesText: merged.join('\n'), galleryAltText: nextAlts.join('\n') }
    })
    setFormMessage('تصاویر گالری آپلود شدند و به فرم اضافه شدند.')
  }

  async function handleCropConfirm() {
    if (!cropState) return
    setProcessingCrop(true)
    setFormError(null)
    setFormMessage(null)

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
      setFormError(cropError instanceof Error ? cropError.message : 'کراپ و آپلود تصویر ناموفق بود')
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

  async function loadProductData(activeRef = { current: true }) {
    const health = await vendorApi.getHealthSummary(session)
    if (!activeRef.current) return

    const store = (((health as Record<string, unknown>).store as Record<string, unknown>) ?? {})
    const nextStoreId = Number(readText(store, ['id'], '0'))
    setStoreId(nextStoreId)

    const [productsPayload, categoriesPayload, productTypesPayload, elementsPayload] = await Promise.all([
      nextStoreId ? vendorApi.getProducts(session, { storeId: nextStoreId, search, limit: 50 }) : Promise.resolve({ data: [] }),
      vendorApi.getCategories(),
      vendorApi.getProductTypes(),
      vendorApi.getProductElements(),
    ])
    if (!activeRef.current) return

    const productList = toArray(productsPayload)
    const categoryList = toArray(categoriesPayload)
    const productTypeList = toArray(productTypesPayload)
    const nextElements = toArray(elementsPayload)
    const nextCategoryOptions = flattenCategories(categoryList)
    const nextProductTypeOptions = productTypeList.map((item) => ({
      id: readText(item, ['id'], ''),
      label: readText(item, ['name'], 'نوع بدون نام'),
    }))

    setProducts(productList)
    setCategoryOptions(nextCategoryOptions)
    setProductTypeOptions(nextProductTypeOptions)
    setElements(nextElements)

    if (productList.length > 0) {
      setSelectedProductId((current) => current ?? readText(productList[0], ['id'], ''))
    }

    setForm((current) => ({
      ...current,
      categoryId: current.categoryId || nextCategoryOptions[0]?.id || '',
      productTypeId: current.productTypeId || nextProductTypeOptions[0]?.id || '',
    }))
  }

  useEffect(() => {
    const activeRef = { current: true }

    async function load() {
      setLoading(true)
      setError(null)

      try {
        await loadProductData(activeRef)
      } catch (loadError) {
        if (!activeRef.current) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری محصولات فروشگاه')
      } finally {
        if (activeRef.current) setLoading(false)
      }
    }

    void load()
    return () => {
      activeRef.current = false
    }
  }, [search, session])

  const filteredProducts = useMemo(
    () => products.filter((item) => (inventoryFilter === 'ALL' ? true : getInventoryState(item) === inventoryFilter)),
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
      filteredProducts.slice(0, 20).map((item, index) => ({
        id: readText(item, ['id'], String(index + 1)),
        name: getProductName(item),
        category: getProductCategory(item),
        price: formatPrice(getProductPrice(item)),
        quantity: formatFaNumber(getProductQuantity(item)),
      })),
    [filteredProducts],
  )

  const stats = useMemo(
    () => [
      {
        label: 'کل محصولات',
        value: formatFaNumber(products.length),
        delta: `${formatFaNumber(filteredProducts.length)} در view فعلی`,
        detail: 'فهرست فعلی محصولات فروشگاه',
        tone: 'primary' as const,
      },
      {
        label: 'کم‌موجودی',
        value: formatFaNumber(products.filter((item) => getProductQuantity(item) > 0 && getProductQuantity(item) <= 5).length),
        delta: 'نیازمند تامین سریع',
        detail: 'محصول‌هایی که refill می‌خواهند',
        tone: 'warning' as const,
      },
      {
        label: 'ناموجود',
        value: formatFaNumber(products.filter((item) => getProductQuantity(item) <= 0).length),
        delta: 'خارج از چرخه فروش',
        detail: 'محصول‌هایی که فعلاً روی vitrine نباید بمانند',
        tone: 'danger' as const,
      },
      {
        label: 'دارای تخفیف',
        value: formatFaNumber(products.filter((item) => getDiscountPrice(item) !== null).length),
        delta: 'آماده promotion',
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
        { label: 'نام محصول', value: getProductName(selectedProduct) },
        { label: 'دسته‌بندی', value: getProductCategory(selectedProduct) },
        { label: 'نوع محصول', value: getProductType(selectedProduct) },
        { label: 'قیمت پایه', value: formatPrice(getProductPrice(selectedProduct)) },
        { label: 'قیمت با تخفیف', value: getDiscountPrice(selectedProduct) === null ? 'بدون تخفیف' : formatPrice(getDiscountPrice(selectedProduct)) },
        { label: 'موجودی', value: formatFaNumber(getProductQuantity(selectedProduct)) },
        { label: 'وضعیت', value: getInventoryState(selectedProduct) },
        { label: 'اسلاگ', value: readText(selectedProduct, ['slug'], '—') },
      ]
    : []

  function openCreateEditor() {
    setEditingProductId(null)
    setEditorOpen(true)
    setFormError(null)
    setFormMessage(null)
    setForm({
      ...initialFormState,
      categoryId: categoryOptions[0]?.id || '',
      productTypeId: productTypeOptions[0]?.id || '',
      compositions: [],
    })
  }

  function openEditEditor() {
    if (!selectedProduct) return

    setEditingProductId(readText(selectedProduct, ['id'], ''))
    setEditorOpen(true)
    setFormError(null)
    setFormMessage(null)
    setForm({
      name: readText(selectedProduct, ['name'], ''),
      categoryId: readText(selectedProduct, ['categoryId'], readText((selectedProduct.category as ProductRecord) ?? {}, ['id'], '')),
      productTypeId: readText(selectedProduct, ['productTypeId'], readText((selectedProduct.productType as ProductRecord) ?? {}, ['id'], '')),
      price: readText(selectedProduct, ['price'], ''),
      discountPrice: readText(selectedProduct, ['discountPrice'], ''),
      quantity: readText(selectedProduct, ['quantity'], ''),
      mainImage: readText(selectedProduct, ['mainImage'], ''),
      mainImageAlt: readText(selectedProduct, ['mainImageAlt'], ''),
      imagesText: getImagesText(selectedProduct),
      galleryAltText: getGalleryAltText(selectedProduct),
      videoUrl: readText(selectedProduct, ['videoUrl'], ''),
      shortDescription: readText(selectedProduct, ['shortDescription'], ''),
      description: readText(selectedProduct, ['description'], ''),
      metaTitle: readText(selectedProduct, ['metaTitle'], ''),
      metaDescription: readText(selectedProduct, ['metaDescription'], ''),
      publicationStatus: readText(selectedProduct, ['publicationStatus'], 'DRAFT'),
      isPurchasable: Boolean(selectedProduct.isPurchasable),
      isArchived: Boolean(selectedProduct.isArchived),
      reviewNote: readText(selectedProduct, ['reviewNote'], ''),
      compositions: mapCompositions(selectedProduct),
    })
  }

  function closeEditor() {
    setEditorOpen(false)
    setEditingProductId(null)
    setFormError(null)
    setFormMessage(null)
  }

  async function handleDelete() {
    if (!selectedProduct) return

    setSaving(true)
    setFormError(null)
    setFormMessage(null)

    try {
      await vendorApi.toggleProductPurchasable(session, Number(readText(selectedProduct, ['id'], '0')), {
        isPurchasable: false,
        isArchived: true,
        note: 'آرشیو توسط فروشنده',
      })
      setFormMessage('محصول حذف فیزیکی نشد و با موفقیت آرشیو شد.')
      await loadProductData({ current: true })
      closeEditor()
    } catch (deleteError) {
      setFormError(deleteError instanceof Error ? deleteError.message : 'آرشیو محصول ناموفق بود')
    } finally {
      setSaving(false)
    }
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

  async function handleSubmit() {
    if (!storeId) {
      setFormError('فروشگاه فعالی برای این حساب پیدا نشد.')
      return
    }

    if (!form.name.trim() || !form.categoryId || !form.productTypeId || !form.price.trim() || !form.quantity.trim() || !form.mainImage.trim()) {
      setFormError('نام، دسته‌بندی، نوع محصول، قیمت، موجودی و تصویر اصلی الزامی هستند.')
      return
    }

    setSaving(true)
    setFormError(null)
    setFormMessage(null)

    try {
      const payload = buildPayload(form, storeId)

      if (editingProductId) {
        await vendorApi.updateProduct(session, Number(editingProductId), payload)
        setFormMessage('محصول با موفقیت به‌روزرسانی شد.')
      } else {
        await vendorApi.createProduct(session, payload)
        setFormMessage('محصول جدید با موفقیت ایجاد شد.')
      }

      await loadProductData({ current: true })
      closeEditor()
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'ذخیره محصول ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  function addCompositionRow() {
    setForm((current) => ({
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

  function updateCompositionRow(index: number, patch: Partial<CompositionRow>) {
    setForm((current) => ({
      ...current,
      compositions: current.compositions.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }))
  }

  function removeCompositionRow(index: number) {
    setForm((current) => ({
      ...current,
      compositions: current.compositions.filter((_, itemIndex) => itemIndex !== index),
    }))
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
          eyebrow="کارتابل محصولات"
          title="فهرست محصول‌ها و مسیر مدیریت منظم"
          description="این صفحه حالا لیست، فیلتر و انتخاب محصول را از workspace ویرایش جدا می‌کند تا برای product / article / taxonomy الگوی تمیزتری داشته باشیم."
          actions={
            <div className="vendor-products-actions">
              <button className="fm-button fm-button--primary" onClick={openCreateEditor} type="button">
                افزودن محصول جدید
              </button>
              <Pill tone="primary">products workspace v3</Pill>
            </div>
          }
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

        {!editorOpen ? (
          <div className="vendor-products-workspace-grid">
            <SectionCard
              eyebrow="جدول محصولات"
              title="لیست محصولات قابل اسکن"
              description="فروشنده باید بتواند سریع ببیند کدام محصول نیاز به تامین، تخفیف یا بازنویسی محتوایی دارد."
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

            <SectionCard
              eyebrow="محصول انتخاب‌شده"
              title={selectedProduct ? getProductName(selectedProduct) : 'محصولی انتخاب نشده'}
              description="از اینجا فقط quick context و actionهای اصلی را می‌بینی؛ ویرایش کامل در workspace جدا انجام می‌شود."
              actions={
                <div className="vendor-products-actions">
                  <Pill tone="warning">{selectedProduct ? getInventoryState(selectedProduct) : 'بدون انتخاب'}</Pill>
                  <button className="fm-button fm-button--secondary" disabled={!selectedProduct} onClick={openEditEditor} type="button">
                    ویرایش کامل
                  </button>
                </div>
              }
            >
              {selectedSummary.length ? (
                <div className="vendor-products-summary-grid">
                  {selectedSummary.map((item) => (
                    <article className="vendor-products-summary-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="vendor-note-card">هنوز محصولی برای نمایش جزئیات انتخاب نشده است.</div>
              )}
            </SectionCard>
          </div>
        ) : null}

        {editorOpen ? (
          <SectionCard
            eyebrow={editingProductId ? 'ویرایش محصول' : 'ایجاد محصول'}
            title={editingProductId ? `ویرایش ${form.name || 'محصول انتخاب‌شده'}` : 'ایجاد محصول جدید'}
            description="این workspace برای مدیریت کامل اطلاعات، رسانه، توضیحات، سئو و محتوای محصول ساخته شده و عمداً از لیست جدا است تا clutter ایجاد نشود."
            actions={
              <div className="vendor-products-actions">
                <button className="fm-button fm-button--ghost" onClick={closeEditor} type="button">
                  بازگشت به لیست
                </button>
                {editingProductId ? (
                  <button className="fm-button fm-button--secondary" disabled={saving} onClick={handleDelete} type="button">
                    حذف محصول
                  </button>
                ) : null}
                <button className="fm-button fm-button--primary" disabled={saving} onClick={handleSubmit} type="button">
                  {saving ? 'در حال ذخیره...' : editingProductId ? 'ذخیره تغییرات' : 'ایجاد محصول'}
                </button>
              </div>
            }
          >
            <div className="vendor-product-editor-shell">
              <section className="vendor-product-editor-main">
                <div className="vendor-product-editor-grid">
                  <article className="vendor-product-editor-panel">
                    <div className="vendor-product-editor-panel-head">
                      <strong>اطلاعات پایه</strong>
                      <span>نام، دسته، نوع و وضعیت موجودی محصول</span>
                    </div>

                    <div className="vendor-product-editor-fields">
                      <div className="fm-field">
                        <label htmlFor="product-name">نام محصول</label>
                        <input
                          id="product-name"
                          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                          placeholder="مثلا باکس رز سفید"
                          value={form.name}
                        />
                      </div>

                      <div className="fm-field">
                        <label htmlFor="product-quantity">موجودی</label>
                        <input
                          id="product-quantity"
                          inputMode="numeric"
                          onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                          placeholder="مثلا ۱۲"
                          value={form.quantity}
                        />
                      </div>

                      <div className="fm-field">
                        <label htmlFor="product-category">دسته‌بندی</label>
                        <select
                          id="product-category"
                          onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                          value={form.categoryId}
                        >
                          {!categoryOptions.length ? <option value="">دسته‌بندی در دسترس نیست</option> : null}
                          {categoryOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="fm-field">
                        <label htmlFor="product-type">نوع محصول</label>
                        <select
                          id="product-type"
                          onChange={(event) => setForm((current) => ({ ...current, productTypeId: event.target.value }))}
                          value={form.productTypeId}
                        >
                          {!productTypeOptions.length ? <option value="">نوع محصول در دسترس نیست</option> : null}
                          {productTypeOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="fm-field">
                        <label htmlFor="product-price">قیمت پایه</label>
                        <input
                          id="product-price"
                          inputMode="decimal"
                          onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                          placeholder="مثلا ۵۵۰۰۰۰"
                          value={form.price}
                        />
                      </div>

                      <div className="fm-field">
                        <label htmlFor="product-discount-price">قیمت با تخفیف</label>
                        <input
                          id="product-discount-price"
                          inputMode="decimal"
                          onChange={(event) => setForm((current) => ({ ...current, discountPrice: event.target.value }))}
                          placeholder="اختیاری"
                          value={form.discountPrice}
                        />
                      </div>
                    </div>
                  </article>

                  <article className="vendor-product-editor-panel">
                    <div className="vendor-product-editor-panel-head">
                      <strong>رسانه و assetها</strong>
                      <span>آپلود مستقیم برای تصویرها و لینک برای ویدیو</span>
                    </div>

                    <div className="vendor-product-editor-fields">
                      <div className="fm-field vendor-product-editor-wide">
                        <label htmlFor="product-main-image">تصویر اصلی</label>
                        <div className="vendor-products-upload-card">
                          <div className="vendor-products-upload-actions">
                            <button
                              className="fm-button fm-button--secondary"
                              disabled={uploadingMainImage}
                              onClick={() => mainImageInputRef.current?.click()}
                              type="button"
                            >
                              {uploadingMainImage ? 'در حال آپلود...' : 'انتخاب تصویر اصلی'}
                            </button>
                            <input
                              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                              className="vendor-products-file-input"
                              onChange={(event) => void handleMainImageChoose(event.target.files)}
                              ref={mainImageInputRef}
                              type="file"
                            />
                            <span className="vendor-products-upload-hint">تصویر را انتخاب کن تا URL نهایی خودکار در فرم بنشیند.</span>
                          </div>

                          <input
                            id="product-main-image"
                            onChange={(event) => setForm((current) => ({ ...current, mainImage: event.target.value }))}
                            placeholder="https://..."
                            value={form.mainImage}
                          />

                          {form.mainImage ? (
                            <div className="vendor-products-image-preview">
                              <img alt="پیش‌نمایش تصویر اصلی محصول" src={form.mainImage} />
                            </div>
                          ) : null}

                          <input
                            onChange={(event) => setForm((current) => ({ ...current, mainImageAlt: event.target.value }))}
                            placeholder="متن جایگزین تصویر اصلی"
                            value={form.mainImageAlt}
                          />
                        </div>
                      </div>

                      <div className="fm-field vendor-product-editor-wide">
                        <label htmlFor="product-images">تصاویر گالری</label>
                        <div className="vendor-products-upload-card">
                          <div className="vendor-products-upload-actions">
                            <button
                              className="fm-button fm-button--secondary"
                              disabled={uploadingGallery}
                              onClick={() => galleryInputRef.current?.click()}
                              type="button"
                            >
                              {uploadingGallery ? 'در حال آپلود...' : 'انتخاب تصاویر گالری'}
                            </button>
                            <input
                              multiple
                              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                              className="vendor-products-file-input"
                              onChange={(event) => void handleGalleryChoose(event.target.files)}
                              ref={galleryInputRef}
                              type="file"
                            />
                            <span className="vendor-products-upload-hint">چند تصویر را یکجا انتخاب کن تا به گالری این محصول اضافه شوند.</span>
                          </div>

                          <textarea
                            id="product-images"
                            onChange={(event) => setForm((current) => ({ ...current, imagesText: event.target.value }))}
                            placeholder="هر URL در یک خط"
                            rows={4}
                            value={form.imagesText}
                          />

                          {galleryImages.length ? (
                            <div className="vendor-products-gallery-preview">
                              {galleryImages.map((url, index) => (
                                <article className="vendor-products-gallery-item" key={url}>
                                  <img alt={galleryAltItems[index] || 'پیش‌نمایش گالری محصول'} src={url} />
                                  <span>{galleryAltItems[index] || url}</span>
                                </article>
                              ))}
                            </div>
                          ) : null}

                          <textarea
                            onChange={(event) => setForm((current) => ({ ...current, galleryAltText: event.target.value }))}
                            placeholder="هر خط ALT متناظر با تصویر گالری در همان ترتیب"
                            rows={4}
                            value={form.galleryAltText}
                          />
                        </div>
                      </div>

                      <div className="fm-field vendor-product-editor-wide">
                        <label htmlFor="product-video">ویدیو</label>
                        <input
                          id="product-video"
                          onChange={(event) => setForm((current) => ({ ...current, videoUrl: event.target.value }))}
                          placeholder="https://..."
                          value={form.videoUrl}
                        />
                        <small className="vendor-products-upload-hint">backend فعلاً برای ویدیو فیلد `videoUrl` دارد؛ پس در این مرحله لینک ویدیو وارد می‌شود.</small>
                      </div>
                    </div>
                  </article>

                  <article className="vendor-product-editor-panel vendor-product-editor-panel--full">
                    <div className="vendor-product-editor-panel-head">
                      <strong>محتوای کوتاه و توضیح اصلی</strong>
                      <span>ویرایشگر کامل برای heading، link، image و ساختار سئو</span>
                    </div>

                    <div className="vendor-product-editor-stack">
                      <div className="fm-field">
                        <label htmlFor="product-short-description">توضیح کوتاه</label>
                        <RichTextEditor
                          id="product-short-description"
                          onChange={(nextValue) => setForm((current) => ({ ...current, shortDescription: nextValue }))}
                          placeholder="خلاصه کوتاه برای vitrine یا کارت محصول"
                          rows={6}
                          value={form.shortDescription}
                        />
                      </div>

                      <div className="fm-field">
                        <label htmlFor="product-description">توضیح کامل</label>
                        <RichTextEditor
                          id="product-description"
                          onChange={(nextValue) => setForm((current) => ({ ...current, description: nextValue }))}
                          placeholder="توضیح کامل، ساختار مقاله‌مانند، لینک‌دهی داخلی و محتوای SEO-friendly را اینجا بساز"
                          rows={12}
                          value={form.description}
                        />
                      </div>
                    </div>
                  </article>

                  <article className="vendor-product-editor-panel vendor-product-editor-panel--full">
                    <div className="vendor-product-editor-panel-head">
                      <strong>SEO و metadata</strong>
                      <span>متای اصلی برای indexability، CTR و preview بهتر</span>
                    </div>

                    <div className="vendor-product-editor-fields">
                      <div className="fm-field">
                        <label htmlFor="product-meta-title">meta title</label>
                        <input
                          id="product-meta-title"
                          onChange={(event) => setForm((current) => ({ ...current, metaTitle: event.target.value }))}
                          placeholder="اختیاری"
                          value={form.metaTitle}
                        />
                      </div>

                      <div className="fm-field vendor-product-editor-wide">
                        <label htmlFor="product-meta-description">meta description</label>
                        <textarea
                          id="product-meta-description"
                          onChange={(event) => setForm((current) => ({ ...current, metaDescription: event.target.value }))}
                          placeholder="اختیاری"
                          rows={4}
                          value={form.metaDescription}
                        />
                      </div>
                    </div>
                  </article>

                  <article className="vendor-product-editor-panel vendor-product-editor-panel--full">
                    <div className="vendor-product-editor-panel-head">
                      <strong>ترکیبات محصول</strong>
                      <span>مشخص کن در این دسته گل یا محصول دقیقاً چه المان‌هایی با چه تعداد استفاده شده‌اند.</span>
                    </div>

                    <div className="vendor-product-editor-stack">
                      <div className="vendor-products-actions">
                        <button className="fm-button fm-button--secondary" onClick={addCompositionRow} type="button">
                          افزودن جزء
                        </button>
                      </div>

                      {form.compositions.length ? (
                        <div className="vendor-product-composition-list">
                          {form.compositions.map((item, index) => (
                            <article className="vendor-product-composition-item" key={`${item.elementId}-${index}`}>
                              <div className="fm-field">
                                <label>{`جزء ${formatFaNumber(index + 1)}`}</label>
                                <select
                                  onChange={(event) => {
                                    const selectedElement = elements.find((entry) => readText(entry, ['id'], '') === event.target.value) ?? {}
                                    updateCompositionRow(index, {
                                      elementId: event.target.value,
                                      elementType: readText(selectedElement, ['type'], item.elementType || 'FLOWER'),
                                    })
                                  }}
                                  value={item.elementId}
                                >
                                  {!elements.length ? <option value="">المانی در دسترس نیست</option> : null}
                                  {elements.map((entry) => (
                                    <option key={readText(entry, ['id'], '')} value={readText(entry, ['id'], '')}>
                                      {`${readText(entry, ['name'], 'المان')} · ${readText(entry, ['type'], '—')}`}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="fm-field">
                                <label>تعداد</label>
                                <input
                                  inputMode="numeric"
                                  onChange={(event) => updateCompositionRow(index, { quantity: event.target.value })}
                                  placeholder="مثلاً ۳"
                                  value={item.quantity}
                                />
                              </div>

                              <div className="fm-field">
                                <label>نوع جزء</label>
                                <select
                                  onChange={(event) => updateCompositionRow(index, { elementType: event.target.value })}
                                  value={item.elementType}
                                >
                                  {['FLOWER', 'FILLER', 'BASE', 'ACCESSORY'].map((type) => (
                                    <option key={type} value={type}>
                                      {type}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="vendor-products-actions">
                                <button className="fm-button fm-button--ghost" onClick={() => removeCompositionRow(index)} type="button">
                                  حذف جزء
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="vendor-note-card">هنوز ترکیبی ثبت نشده. اگر این محصول دسته گل یا ترکیبی است، جزءها را از اینجا اضافه کن.</div>
                      )}
                    </div>
                  </article>
                </div>

                <div className="vendor-product-editor-footer">
                  <article className="vendor-product-editor-sidecard">
                    <strong>خلاصه سریع</strong>
                    <div className="vendor-product-editor-sidegrid">
                      <span>وضعیت</span>
                      <strong>{form.quantity.trim() ? (Number(form.quantity) <= 0 ? 'ناموجود' : Number(form.quantity) <= 5 ? 'کم‌موجودی' : 'عادی') : 'نامشخص'}</strong>
                      <span>انتشار</span>
                      <strong>{form.publicationStatus || 'DRAFT'}</strong>
                      <span>خرید</span>
                      <strong>{form.isPurchasable ? 'فعال' : 'غیرفعال'}</strong>
                      <span>گالری</span>
                      <strong>{formatFaNumber(galleryImages.length)}</strong>
                      <span>دسته</span>
                      <strong>{categoryOptions.find((item) => item.id === form.categoryId)?.label || '—'}</strong>
                      <span>نوع</span>
                      <strong>{productTypeOptions.find((item) => item.id === form.productTypeId)?.label || '—'}</strong>
                      <span>ترکیبات</span>
                      <strong>{formatFaNumber(form.compositions.length)}</strong>
                    </div>
                  </article>

                  <article className="vendor-product-editor-sidecard">
                    <strong>راهنمای نظم صفحه</strong>
                    <p>
                      لیست و ویرایش از هم جدا شده‌اند تا بعداً همین الگو برای مقالات، دسته‌بندی‌ها، تگ‌ها و typeها هم بدون شلوغی تکرار شود.
                    </p>
                    <p>{form.reviewNote || 'اگر ادمین محصول را برای اصلاح برگرداند، یادداشت بازبینی در همین بخش دیده می‌شود.'}</p>
                  </article>
                </div>

                {formMessage ? <div className="fm-message fm-message--success">{formMessage}</div> : null}
                {formError ? <div className="fm-message fm-message--danger">{formError}</div> : null}
              </section>
            </div>
          </SectionCard>
        ) : null}
      </LoadableState>

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
                <strong>{cropState.target === 'main' ? 'تنظیم قاب تصویر اصلی' : 'تنظیم قاب گالری'}</strong>
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

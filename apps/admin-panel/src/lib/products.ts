import { readNumber, readText, toArray } from './normalize'

export type ProductRecord = Record<string, unknown>

export function toProductRecord(value: unknown): ProductRecord {
  return typeof value === 'object' && value !== null ? (value as ProductRecord) : {}
}

export function formatPersianNumber(value: number | string | null | undefined) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(numeric)) {
    return value === null || value === undefined || value === '' ? '—' : String(value)
  }

  return new Intl.NumberFormat('fa-IR').format(numeric)
}

export function formatCurrency(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(numeric)) return '—'
  return `${new Intl.NumberFormat('fa-IR').format(numeric)} تومان`
}

export function formatJalaliDate(value: unknown, withTime = false) {
  if (typeof value !== 'string' || !value) return '—'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'

  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(parsed)
}

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function getProductName(record: ProductRecord) {
  return readText(record, ['name'], 'محصول بدون نام')
}

export function getProductSlug(record: ProductRecord) {
  return readText(record, ['slug'], '—')
}

export function getProductStore(record: ProductRecord) {
  const store = toProductRecord(record.store)
  return readText(store, ['name', 'slug'], readText(record, ['storeId'], '—'))
}

export function getProductCategory(record: ProductRecord) {
  const category = toProductRecord(record.category)
  return readText(category, ['name', 'title', 'slug'], readText(record, ['categoryId'], '—'))
}

export function getProductType(record: ProductRecord) {
  const productType = toProductRecord(record.productType)
  return readText(productType, ['name', 'slug'], readText(record, ['productTypeId'], '—'))
}

export function getProductQuantity(record: ProductRecord) {
  return readNumber(record, ['quantity'], 0)
}

export function getProductPrice(record: ProductRecord) {
  return readNumber(record, ['price'], 0)
}

export function getProductDiscountPrice(record: ProductRecord) {
  return readNumber(record, ['discountPrice'], 0)
}

export function getProductStatusLabel(record: ProductRecord) {
  const quantity = getProductQuantity(record)
  if (quantity <= 0) return 'ناموجود'
  if (quantity < 5) return 'کم موجودی'
  return 'آماده فروش'
}

export function getContentReadinessLabel(record: ProductRecord) {
  const hasShort = Boolean(readText(record, ['shortDescription'], '').trim())
  const hasDescription = Boolean(readText(record, ['description'], '').trim())
  const hasMainImage = Boolean(readText(record, ['mainImage'], '').trim())

  if (hasShort && hasDescription && hasMainImage) return 'آماده'
  if (hasShort || hasDescription || hasMainImage) return 'ناقص'
  return 'شروع نشده'
}

export function getProductSeoReadinessLabel(record: ProductRecord) {
  const hasMetaTitle = Boolean(readText(record, ['metaTitle'], '').trim())
  const hasMetaDescription = Boolean(readText(record, ['metaDescription'], '').trim())
  const hasSlug = Boolean(readText(record, ['slug'], '').trim())

  if (hasMetaTitle && hasMetaDescription && hasSlug) return 'آماده'
  if (hasMetaTitle || hasMetaDescription || hasSlug) return 'نیازمند تکمیل'
  return 'شروع نشده'
}

export function getProductImageCount(record: ProductRecord) {
  const images = record.images
  if (!Array.isArray(images)) return 0
  return images.length
}

export function getProductCompositions(record: ProductRecord) {
  return toArray(record.composition)
}

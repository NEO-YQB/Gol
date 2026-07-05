import type { Metadata } from 'next'
import { cache } from 'react'

const SITE_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'https://golino.shop'

export function buildAbsoluteUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  return `${SITE_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function buildCanonicalUrl(path: string) {
  return buildAbsoluteUrl(path)
}


export type SeoSettings = {
  siteUrl: string
  siteName: string
  googleSearchConsoleVerification: string
  googleTagManagerId: string
  googleAnalyticsId: string
  robotsTxt: string
  sitemapEnabled: boolean
  sitemapChangeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  sitemapPriority: string
}

export type StorefrontSeo = {
  metaTitle?: string | null
  metaDescription?: string | null
  keywords?: string[]
  ogImage?: string | null
  canonicalUrl?: string | null
  noIndex?: boolean
}

export type StorefrontInfoPagesSettings = {
  about: {
    enabled: boolean
    heroTitle: string
    heroSubtitle: string
    desktopHeroImageUrl: string
    mobileHeroImageUrl: string
    introTitle: string
    introHtml: string
    storyTitle: string
    storyHtml: string
    valuesTitle: string
    valuesHtml: string
  }
  contact: {
    enabled: boolean
    heroTitle: string
    heroSubtitle: string
    desktopHeroImageUrl: string
    mobileHeroImageUrl: string
    phone: string
    email: string
    address: string
    workingHours: string
    mapEmbedHtml: string
    contactIntroHtml: string
  }
  terms: {
    enabled: boolean
    heroTitle: string
    heroSubtitle: string
    desktopHeroImageUrl: string
    mobileHeroImageUrl: string
    bodyHtml: string
    updatedAtLabel: string
  }
}

export type StorefrontPage = {
  id: string
  title: string
  slug: string
  pageType: 'HOME' | 'LANDING' | 'CAMPAIGN' | 'STATIC'
  cacheEnabled?: boolean
  headerConfig?: Record<string, unknown> | null
  footerConfig?: Record<string, unknown> | null
  seo: StorefrontSeo
  blocks: Array<Record<string, unknown>>
  updatedAt?: string
  publishedAt?: string | null
}

export type CategorySummary = {
  id: number
  name: string
  slug: string
  description?: string | null
  image?: string | null
  imageAlt?: string | null
  thumbnailUrl?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  isIndexed?: boolean | null
  children?: CategorySummary[]
}

export type ProductSummary = {
  id: number
  name: string
  slug: string
  mainImage: string
  mainImageAlt?: string | null
  price: number
  discountPrice?: number | null
  effectivePrice?: number
  effectiveDiscountPrice?: number | null
  pricing?: {
    basePrice: number
    finalPrice: number
    discountAmount: number
    hasDiscount: boolean
    legacyDiscountApplied?: boolean
    appliedRules?: Array<{
      sourceType: 'vendor' | 'promotion'
      sourceId: number
      title: string
      valueType: 'PERCENTAGE' | 'FIXED'
      value: number
      priority: number
      allowCouponStacking: boolean
      discountAmount: number
    }>
  }
  description?: string | null
  shortDescription?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  aerialDistanceKm?: number
  isPurchasable?: boolean
  isArchived?: boolean
  publicationStatus?: string
  category?: {
    id: number
    name: string
    slug?: string
  } | null
  store?: {
    id: number
    name: string
    slug: string
  } | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type ProductTypeSummary = {
  id: number
  name: string
  slug: string
  description?: string | null
  image?: string | null
  imageAlt?: string | null
  thumbnailUrl?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  isIndexed?: boolean | null
}

type PaginatedResponse<T> = {
  data?: T[]
  meta?: {
    total?: number
    page?: number
    lastPage?: number
    minPrice?: number | null
    maxPrice?: number | null
  }
}

export type StorefrontProductDetail = ProductSummary & {
  description?: string | null
  shortDescription?: string | null
  gallery?: Array<{ url: string; alt?: string | null }>
  productType?: ProductTypeSummary | null
  store?: {
    id: number
    name: string
    slug: string
    sameDayDelivery?: boolean
    customerRatingAverage?: string | number | null
    customerRatingCount?: number | null
  } | null
  composition?: Array<{
    id: number
    quantity: number
    elementType: string
    element?: {
      id: number
      name: string
      unit?: string | null
    } | null
  }>
}

export type StoreSummary = {
  id: number
  name: string
  slug: string
  logo?: string | null
  description?: string | null
  address?: string | null
  isVerified?: boolean
  sameDayDelivery?: boolean
  hasExpressDelivery?: boolean
  minDeliveryHours?: number | null
  maxDeliveryHours?: number | null
  expressDeliveryHours?: number | null
  deliveryWindows?: Array<{
    key: string
    label: string
    startTime?: string
    endTime?: string
  }> | null
  customerRatingAverage?: string | number
  customerRatingCount?: number
  products?: ProductSummary[]
  _count?: {
    products?: number
  }
}

type MetadataInput = {
  title: string
  description: string
  path: string
  image?: string | null
  indexable?: boolean | null
  keywords?: string[]
  type?: 'website' | 'article'
}

export type ArticleSummary = {
  id: number
  title: string
  slug: string
  excerpt?: string | null
  coverImage?: string | null
  publishedAt?: string | null
  updatedAt?: string | null
  createdAt?: string | null
  readingTimeMinutes?: number | null
  category?: {
    id: number
    title: string
    slug: string
  } | null
}

export type ArticleCategorySummary = {
  id: number
  title: string
  slug: string
  parentId?: number | null
  description?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  canonicalUrl?: string | null
  robotsIndex?: boolean
  robotsFollow?: boolean
  redirectFromSlug?: string | null
  _count?: {
    articles?: number
  }
}

export type PublicArticleDetail = {
  article: {
    id: number
    title: string
    slug: string
    excerpt?: string | null
    coverImage?: string | null
    content: string
    focusKeyword?: string | null
    readingTimeMinutes?: number | null
    tableOfContents?: Array<{ level: number; text: string }> | null
    publishedAt?: string | null
    updatedAt?: string | null
    metaTitle?: string | null
    metaDescription?: string | null
    canonicalUrl?: string | null
    robotsIndex?: boolean
    robotsFollow?: boolean
    ogTitle?: string | null
    ogDescription?: string | null
    ogImage?: string | null
    author: {
      id: number
      name: string
      slug: string
      bio?: string | null
      seoBio?: string | null
      avatarImage?: string | null
    }
    category: {
      id: number
      title: string
      slug: string
    }
    tags: Array<{
      tag: {
        id: number
        title: string
        slug: string
      }
    }>
  }
  seo: {
    canonicalUrl?: string | null
    robotsIndex?: boolean
    robotsFollow?: boolean
    metaTitle?: string | null
    metaDescription?: string | null
    ogTitle?: string | null
    ogDescription?: string | null
    ogImage?: string | null
  }
  breadcrumbs?: {
    items?: Array<{ position: number; name: string; slug: string }>
  }
  structuredData?: Record<string, unknown>
}

export type PublicArticleListing = {
  data: ArticleSummary[]
  meta: {
    total: number
    page: number
    lastPage: number
  }
}

export type PublicCategoryArticleListing = PublicArticleListing & {
  category: ArticleCategorySummary
}

export type EnrichedBlock = Record<string, unknown> & {
  id: string
  type: string
  loadingMode?: 'eager' | 'lazy' | 'viewport'
  data: Record<string, unknown>
  categories?: CategorySummary[]
  productTypes?: ProductTypeSummary[]
  products?: ProductSummary[]
  vendors?: StoreSummary[]
  articles?: ArticleSummary[]
}

export type EnrichedStorefrontPage = Omit<StorefrontPage, 'blocks'> & {
  blocks: EnrichedBlock[]
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  'http://localhost:3000/v1'

export function getStorefrontApiBaseUrl() {
  return API_BASE_URL
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[]
  }

  const record = toRecord(value)
  return Array.isArray(record.data) ? (record.data as T[]) : []
}

function flattenCategories(categories: CategorySummary[], depth = 0): Array<CategorySummary & { depth: number }> {
  return categories.flatMap((category) => {
    const children = Array.isArray(category.children) ? category.children : []
    return [{ ...category, depth }, ...flattenCategories(children, depth + 1)]
  })
}

function collectCategoryIds(categories: CategorySummary[], targetId: string): string[] {
  for (const category of categories) {
    if (String(category.id) === targetId) {
      return flattenCategories([category]).map((item) => String(item.id))
    }

    const nested = Array.isArray(category.children) ? collectCategoryIds(category.children, targetId) : []
    if (nested.length) {
      return nested
    }
  }

  return targetId ? [targetId] : []
}

function filterEligibleProducts(products: ProductSummary[]) {
  return products.filter(
    (product) =>
      product.publicationStatus === 'PUBLISHED' &&
      product.isPurchasable === true &&
      product.isArchived !== true,
  )
}

function toPageSlug(slugSegments?: string[]) {
  if (!slugSegments || slugSegments.length === 0) return '/'
  return slugSegments.join('/')
}

function resolveAssetUrl(path: string | null | undefined) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const origin = new URL(API_BASE_URL).origin
  return `${origin}${path}`
}

type NextRequestInit = RequestInit & {
  next?: {
    revalidate?: number
  }
}

async function request<T>(path: string, init?: NextRequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

function requestCached<T>(path: string): Promise<T> {
  return request<T>(path, {
    next: {
      revalidate: 60,
    },
  })
}

function requestNoStore<T>(path: string): Promise<T> {
  return request<T>(path, {
    cache: 'no-store',
  })
}

export const getCategories = cache(async (): Promise<CategorySummary[]> => {
  return requestCached<CategorySummary[]>('/categories')
})

export const getStores = cache(async (): Promise<StoreSummary[]> => {
  return requestCached<StoreSummary[]>('/stores')
})

export const getProductTypes = cache(async (): Promise<ProductTypeSummary[]> => {
  return requestCached<ProductTypeSummary[]>('/product-types')
})

const getProductElements = cache(async (): Promise<StorefrontProductElement[]> => {
  return requestCached<StorefrontProductElement[]>('/products/elements')
})

export async function getStorefrontCategories(): Promise<CategorySummary[]> {
  return getCategories()
}

export async function getStorefrontProductTypes(): Promise<ProductTypeSummary[]> {
  return getProductTypes()
}

const getArticles = cache(async (limit: number): Promise<ArticleSummary[]> => {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  params.set('page', '1')
  params.set('sort', 'NEWEST')

  const payload = await requestCached<{ data?: ArticleSummary[] } | ArticleSummary[]>(`/content/public/articles?${params.toString()}`)
  return toArray<ArticleSummary>(payload)
})

const getArticleCategories = cache(async (): Promise<ArticleCategorySummary[]> => {
  const payload = await requestCached<{ data?: ArticleCategorySummary[] } | ArticleCategorySummary[]>(
    '/content/public/categories?limit=100&page=1',
  )
  return toArray<ArticleCategorySummary>(payload)
})

export async function getStorefrontLatestArticles(limit = 5): Promise<ArticleSummary[]> {
  return getArticles(limit)
}

export async function getStorefrontArticleCategories(): Promise<ArticleCategorySummary[]> {
  return getArticleCategories()
}

export function resolveArticleCategoryPath(
  categories: ArticleCategorySummary[],
  categoryOrSlug: ArticleCategorySummary | string,
) {
  const slug = typeof categoryOrSlug === 'string' ? categoryOrSlug : categoryOrSlug.slug
  const bySlug = categories.find((item) => item.slug === slug)
  if (!bySlug) {
    return slug
  }

  const chain: string[] = [bySlug.slug]
  let currentParentId = bySlug.parentId ?? null

  while (currentParentId) {
    const parent = categories.find((item) => item.id === currentParentId)
    if (!parent) break
    chain.unshift(parent.slug)
    currentParentId = parent.parentId ?? null
  }

  return chain.join('/')
}

export async function getStorefrontArticleArchive({
  page = 1,
  limit = 12,
  search = '',
  sort = 'NEWEST',
}: {
  page?: number
  limit?: number
  search?: string
  sort?: 'NEWEST' | 'OLDEST'
}): Promise<PublicArticleListing> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  params.set('sort', sort)
  if (search.trim()) params.set('search', search.trim())

  return requestNoStore<PublicArticleListing>(`/content/public/articles?${params.toString()}`)
}

export async function getStorefrontArticleBySlug(slug: string): Promise<PublicArticleDetail | null> {
  try {
    return await requestNoStore<PublicArticleDetail>(`/content/public/articles/${slug}`)
  } catch {
    return null
  }
}

export async function getStorefrontArticleCategoryArchive({
  slug,
  page = 1,
  limit = 12,
  search = '',
  sort = 'NEWEST',
}: {
  slug: string
  page?: number
  limit?: number
  search?: string
  sort?: 'NEWEST' | 'OLDEST'
}): Promise<PublicCategoryArticleListing | null> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  params.set('sort', sort)
  if (search.trim()) params.set('search', search.trim())

  try {
    return await requestNoStore<PublicCategoryArticleListing>(
      `/content/public/categories/${slug}?${params.toString()}`,
    )
  } catch {
    return null
  }
}

export type StorefrontElementType = 'BASE' | 'FLOWER' | 'FILLER' | 'ACCESSORY'

export type StorefrontProductElement = {
  id: number
  name: string
  type: StorefrontElementType
  unit?: string | null
  image?: string | null
}

type ProductQuery = {
  page?: number
  limit?: number
  categoryId?: string
  categoryIds?: string[]
  storeId?: string
  productTypeId?: string
  ids?: string[]
  search?: string
  sortBy?: 'newest' | 'most_sold' | 'instant_delivery' | 'nearest'
  userLat?: number
  userLng?: number
  minPrice?: number
  maxPrice?: number
  elementIds?: number[]
}

const getProducts = cache(async (_queryKey: string, query: ProductQuery): Promise<ProductSummary[]> => {
  const params = new URLSearchParams()

  params.set('publicationStatus', 'PUBLISHED')
  params.set('page', String(query.page ?? 1))
  params.set('limit', String(query.limit ?? 8))

  if (query.categoryId) params.set('categoryId', query.categoryId)
  if (query.categoryIds?.length) params.set('categoryIds', query.categoryIds.join(','))
  if (query.storeId) params.set('storeId', query.storeId)
  if (query.productTypeId) params.set('productTypeId', query.productTypeId)
  if (query.ids?.length) params.set('ids', query.ids.join(','))
  if (query.search) params.set('search', query.search)
  if (typeof query.minPrice === 'number') params.set('minPrice', String(query.minPrice))
  if (typeof query.maxPrice === 'number') params.set('maxPrice', String(query.maxPrice))
  if (query.elementIds?.length) params.set('elementIds', query.elementIds.join(','))
  if (query.sortBy) params.set('sortBy', query.sortBy)
  if (typeof query.userLat === 'number') params.set('userLat', String(query.userLat))
  if (typeof query.userLng === 'number') params.set('userLng', String(query.userLng))

  const payload = await requestCached<{ data?: ProductSummary[] } | ProductSummary[]>(`/products?${params.toString()}`)
  const products = filterEligibleProducts(toArray<ProductSummary>(payload))

  const ids = query.ids ?? []

  if (!ids.length) {
    return products
  }

  const order = new Map(ids.map((id, index) => [Number(id), index]))
  return [...products].sort((left, right) => (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999))
})

const getStorefrontPage = cache(async (slug: string): Promise<StorefrontPage | null> => {
  const params = new URLSearchParams({ slug })

  try {
    return await requestCached<StorefrontPage>(`/pages/by-slug?${params.toString()}`)
  } catch {
    return null
  }
})

async function getProductsNoStore(query: ProductQuery): Promise<ProductSummary[]> {
  const params = new URLSearchParams()

  params.set('publicationStatus', 'PUBLISHED')
  params.set('page', String(query.page ?? 1))
  params.set('limit', String(query.limit ?? 8))

  if (query.categoryId) params.set('categoryId', query.categoryId)
  if (query.categoryIds?.length) params.set('categoryIds', query.categoryIds.join(','))
  if (query.storeId) params.set('storeId', query.storeId)
  if (query.productTypeId) params.set('productTypeId', query.productTypeId)
  if (query.ids?.length) params.set('ids', query.ids.join(','))
  if (query.search) params.set('search', query.search)
  if (typeof query.minPrice === 'number') params.set('minPrice', String(query.minPrice))
  if (typeof query.maxPrice === 'number') params.set('maxPrice', String(query.maxPrice))
  if (query.elementIds?.length) params.set('elementIds', query.elementIds.join(','))
  if (query.sortBy) params.set('sortBy', query.sortBy)
  if (typeof query.userLat === 'number') params.set('userLat', String(query.userLat))
  if (typeof query.userLng === 'number') params.set('userLng', String(query.userLng))

  const payload = await requestNoStore<PaginatedResponse<ProductSummary> | ProductSummary[]>(`/products?${params.toString()}`)
  const products = filterEligibleProducts(toArray<ProductSummary>(payload))

  const ids = query.ids ?? []

  if (!ids.length) {
    return products
  }

  const order = new Map(ids.map((id, index) => [Number(id), index]))
  return [...products].sort((left, right) => (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999))
}

async function getProductsNoStoreWithMeta(query: ProductQuery): Promise<{
  products: ProductSummary[]
  total: number
  page: number
  lastPage: number
  minPrice: number | null
  maxPrice: number | null
}> {
  const params = new URLSearchParams()

  params.set('publicationStatus', 'PUBLISHED')
  params.set('page', String(query.page ?? 1))
  params.set('limit', String(query.limit ?? 8))

  if (query.categoryId) params.set('categoryId', query.categoryId)
  if (query.categoryIds?.length) params.set('categoryIds', query.categoryIds.join(','))
  if (query.storeId) params.set('storeId', query.storeId)
  if (query.productTypeId) params.set('productTypeId', query.productTypeId)
  if (query.ids?.length) params.set('ids', query.ids.join(','))
  if (query.search) params.set('search', query.search)
  if (typeof query.minPrice === 'number') params.set('minPrice', String(query.minPrice))
  if (typeof query.maxPrice === 'number') params.set('maxPrice', String(query.maxPrice))
  if (query.elementIds?.length) params.set('elementIds', query.elementIds.join(','))
  if (query.sortBy) params.set('sortBy', query.sortBy)
  if (typeof query.userLat === 'number') params.set('userLat', String(query.userLat))
  if (typeof query.userLng === 'number') params.set('userLng', String(query.userLng))

  const payload = await requestNoStore<PaginatedResponse<ProductSummary> | ProductSummary[]>(`/products?${params.toString()}`)
  const products = filterEligibleProducts(toArray<ProductSummary>(payload))
  const total =
    !Array.isArray(payload) && payload.meta && typeof payload.meta.total === 'number'
      ? payload.meta.total
      : products.length
  const page =
    !Array.isArray(payload) && payload.meta && typeof payload.meta.page === 'number'
      ? payload.meta.page
      : query.page ?? 1
  const lastPage =
    !Array.isArray(payload) && payload.meta && typeof payload.meta.lastPage === 'number'
      ? payload.meta.lastPage
      : 1
  const minPrice =
    !Array.isArray(payload) && payload.meta && typeof payload.meta.minPrice === 'number'
      ? payload.meta.minPrice
      : null
  const maxPrice =
    !Array.isArray(payload) && payload.meta && typeof payload.meta.maxPrice === 'number'
      ? payload.meta.maxPrice
      : null

  const ids = query.ids ?? []

  if (!ids.length) {
    return { products, total, page, lastPage, minPrice, maxPrice }
  }

  const order = new Map(ids.map((id, index) => [Number(id), index]))
  return {
    products: [...products].sort((left, right) => (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999)),
    total,
    page,
    lastPage,
    minPrice,
    maxPrice,
  }
}


export async function getAllStorefrontProductsForSitemap(limit = 100): Promise<ProductSummary[]> {
  const firstPage = await getProductsNoStoreWithMeta({ page: 1, limit, sortBy: 'newest' })
  const products = [...firstPage.products]

  for (let page = 2; page <= firstPage.lastPage; page += 1) {
    const nextPage = await getProductsNoStoreWithMeta({ page, limit, sortBy: 'newest' })
    products.push(...nextPage.products)
  }

  const seen = new Set<number>()
  return products.filter((product) => {
    if (seen.has(product.id)) return false
    seen.add(product.id)
    return true
  })
}

export async function getStorefrontProductBySlug(slug: string): Promise<StorefrontProductDetail | null> {
  try {
    return await requestNoStore<StorefrontProductDetail>(`/products/${slug}`)
  } catch {
    return null
  }
}

export async function getStorefrontCategoryBySlug(slug: string): Promise<CategorySummary | null> {
  const categories = await getCategories()
  const all = flattenCategories(categories)
  return all.find((item) => item.slug === slug) || null
}

export async function getStorefrontProductTypeBySlug(slug: string): Promise<ProductTypeSummary | null> {
  const productTypes = await getProductTypes()
  return productTypes.find((item) => item.slug === slug) || null
}

export async function getStorefrontStoreBySlug(slug: string): Promise<StoreSummary | null> {
  try {
    return await requestNoStore<StoreSummary>(`/stores/${slug}`)
  } catch {
    return null
  }
}

export async function getStorefrontCatalogData({
  search,
  sort,
  page,
  userLat,
  userLng,
  categorySlug,
  productTypeSlug,
  minPrice,
  maxPrice,
  elementIds,
}: {
  search?: string
  sort?: string
  page?: number
  userLat?: number
  userLng?: number
  categorySlug?: string
  productTypeSlug?: string
  minPrice?: number
  maxPrice?: number
  elementIds?: number[]
}): Promise<{
  products: ProductSummary[]
  total: number
  page: number
  lastPage: number
  minPrice: number | null
  maxPrice: number | null
  search: string
  activeSort: 'newest' | 'most_sold' | 'instant_delivery' | 'nearest'
  categories: CategorySummary[]
  productTypes: ProductTypeSummary[]
  resolvedCategory: CategorySummary | null
  resolvedProductType: ProductTypeSummary | null
  productElements: StorefrontProductElement[]
}> {
  const categories = await getCategories()
  const productTypes = await getProductTypes()
  const productElements = await getProductElements()

  const resolvedCategory = categorySlug ? await getStorefrontCategoryBySlug(categorySlug) : null
  const resolvedProductType = productTypeSlug ? await getStorefrontProductTypeBySlug(productTypeSlug) : null
  const categoryIds = resolvedCategory ? collectCategoryIds(categories, String(resolvedCategory.id)) : []

  const activeSort: 'newest' | 'most_sold' | 'instant_delivery' | 'nearest' =
    sort === 'most_sold' || sort === 'instant_delivery' || sort === 'newest' || sort === 'nearest'
      ? sort
      : 'newest'

  const { products, total, page: currentPage, lastPage, minPrice: resolvedMinPrice, maxPrice: resolvedMaxPrice } = await getProductsNoStoreWithMeta({
    search: search?.trim() || undefined,
    sortBy: activeSort,
    page,
    userLat,
    userLng,
    minPrice,
    maxPrice,
    elementIds,
    categoryIds: categoryIds.length > 1 ? categoryIds : undefined,
    categoryId: categoryIds.length === 1 ? categoryIds[0] : undefined,
    productTypeId: resolvedProductType ? String(resolvedProductType.id) : undefined,
    limit: 24,
  })

  return {
    products,
    total,
    page: currentPage,
    lastPage,
    minPrice: resolvedMinPrice,
    maxPrice: resolvedMaxPrice,
    search: search?.trim() || '',
    activeSort,
    categories,
    productTypes,
    productElements,
    resolvedCategory,
    resolvedProductType,
  }
}


export async function getStorefrontStorePageData({
  slug,
  search,
  sort,
  page,
  userLat,
  userLng,
  categorySlug,
  productTypeSlug,
  minPrice,
  maxPrice,
  elementIds,
}: {
  slug: string
  search?: string
  sort?: string
  page?: number
  userLat?: number
  userLng?: number
  categorySlug?: string
  productTypeSlug?: string
  minPrice?: number
  maxPrice?: number
  elementIds?: number[]
}): Promise<{
  store: StoreSummary | null
  products: ProductSummary[]
  total: number
  page: number
  lastPage: number
  minPrice: number | null
  maxPrice: number | null
  search: string
  activeSort: 'newest' | 'most_sold' | 'instant_delivery' | 'nearest'
  categories: CategorySummary[]
  productTypes: ProductTypeSummary[]
  resolvedCategory: CategorySummary | null
  resolvedProductType: ProductTypeSummary | null
  productElements: StorefrontProductElement[]
}> {
  const store = await getStorefrontStoreBySlug(slug)

  if (!store) {
    return {
      store: null,
      products: [],
      total: 0,
      page: 1,
      lastPage: 1,
      minPrice: null,
      maxPrice: null,
      search: search?.trim() || '',
      activeSort: 'newest',
      categories: [],
      productTypes: [],
      resolvedCategory: null,
      resolvedProductType: null,
      productElements: [],
    }
  }

  const categories = await getCategories()
  const productTypes = await getProductTypes()
  const productElements = await getProductElements()
  const resolvedCategory = categorySlug ? await getStorefrontCategoryBySlug(categorySlug) : null
  const resolvedProductType = productTypeSlug ? await getStorefrontProductTypeBySlug(productTypeSlug) : null
  const categoryIds = resolvedCategory ? collectCategoryIds(categories, String(resolvedCategory.id)) : []
  const activeSort: 'newest' | 'most_sold' | 'instant_delivery' | 'nearest' =
    sort === 'most_sold' || sort === 'instant_delivery' || sort === 'newest' || sort === 'nearest'
      ? sort
      : 'newest'

  const { products, total, page: currentPage, lastPage, minPrice: resolvedMinPrice, maxPrice: resolvedMaxPrice } =
    await getProductsNoStoreWithMeta({
      search: search?.trim() || undefined,
      sortBy: activeSort,
      page,
      userLat,
      userLng,
      minPrice,
      maxPrice,
      elementIds,
      storeId: String(store.id),
      categoryIds: categoryIds.length > 1 ? categoryIds : undefined,
      categoryId: categoryIds.length === 1 ? categoryIds[0] : undefined,
      productTypeId: resolvedProductType ? String(resolvedProductType.id) : undefined,
      limit: 24,
    })

  return {
    store,
    products,
    total,
    page: currentPage,
    lastPage,
    minPrice: resolvedMinPrice,
    maxPrice: resolvedMaxPrice,
    search: search?.trim() || '',
    activeSort,
    categories,
    productTypes,
    resolvedCategory,
    resolvedProductType,
    productElements,
  }
}

async function getStorefrontPageNoStore(slug: string): Promise<StorefrontPage | null> {
  const params = new URLSearchParams({ slug })

  try {
    return await requestNoStore<StorefrontPage>(`/pages/by-slug?${params.toString()}`)
  } catch {
    return null
  }
}

async function enrichBlock(
  block: Record<string, unknown>,
  cacheEnabled: boolean,
): Promise<EnrichedBlock> {
  const normalizedBlock: EnrichedBlock = {
    id: String(block.id ?? ''),
    type: String(block.type ?? ''),
    data:
      typeof block.data === 'object' && block.data !== null
        ? (block.data as Record<string, unknown>)
        : {},
  }

  if (normalizedBlock.type === 'CATEGORY_CIRCLES') {
    const categoryTree = cacheEnabled ? await getCategories() : await requestNoStore<CategorySummary[]>('/categories')
    const categories = flattenCategories(categoryTree)
    const categoryIds = Array.isArray(normalizedBlock.data.categoryIds)
      ? normalizedBlock.data.categoryIds.map((item) => String(item))
      : []
    const productTypeIds = Array.isArray(normalizedBlock.data.productTypeIds)
      ? normalizedBlock.data.productTypeIds.map((item) => String(item))
      : []

    const allProductTypes = cacheEnabled ? await getProductTypes() : await requestNoStore<ProductTypeSummary[]>('/product-types')

    return {
      ...normalizedBlock,
      categories: categories.filter((category) => categoryIds.includes(String(category.id))),
      productTypes: allProductTypes.filter((pt) => productTypeIds.includes(String(pt.id))),
    }
  }

  if (normalizedBlock.type === 'PRODUCT_CAROUSEL') {
    const filterType = String(normalizedBlock.data.filterType ?? 'category')
    const sortBy = String(normalizedBlock.data.sortBy ?? 'newest') as ProductQuery['sortBy']
    const limit = Number(normalizedBlock.data.limit ?? 8) || 8
    const filterValue = normalizedBlock.data.filterValue

    let products: ProductSummary[] = []

    if (filterType === 'category') {
      const categoryIds = collectCategoryIds(
        cacheEnabled ? await getCategories() : await requestNoStore<CategorySummary[]>('/categories'),
        String(filterValue ?? ''),
      )

      products = await (cacheEnabled
        ? getProducts(
            `category:${String(filterValue)}:${sortBy}:${limit}:${categoryIds.join(',')}`,
            categoryIds.length <= 1
              ? {
                  categoryId: categoryIds[0],
                  sortBy,
                  limit,
                }
              : {
                  categoryIds,
                  sortBy,
                  limit,
                },
          )
        : getProductsNoStore(
            categoryIds.length <= 1
              ? {
                  categoryId: categoryIds[0],
                  sortBy,
                  limit,
                }
              : {
                  categoryIds,
                  sortBy,
                  limit,
                },
          ))
    } else if (filterType === 'productType') {
      products = await (cacheEnabled ? getProducts(`productType:${String(filterValue)}:${sortBy}:${limit}`, {
        productTypeId: String(filterValue ?? ''),
        sortBy,
        limit,
      }) : getProductsNoStore({
        productTypeId: String(filterValue ?? ''),
        sortBy,
        limit,
      }))
    } else if (filterType === 'custom_list') {
      const ids = Array.isArray(filterValue) ? filterValue.map((item) => String(item)) : []
      products = await (cacheEnabled ? getProducts(`ids:${ids.join(',')}:${sortBy}:${limit}`, {
        ids,
        sortBy,
        limit,
      }) : getProductsNoStore({
        ids,
        sortBy,
        limit,
      }))
    } else {
      products = await (cacheEnabled ? getProducts(`search:${String(filterValue)}:${sortBy}:${limit}`, {
        search: String(filterValue ?? ''),
        sortBy,
        limit,
      }) : getProductsNoStore({
        search: String(filterValue ?? ''),
        sortBy,
        limit,
      }))
    }

    return {
      ...normalizedBlock,
      products: products.slice(0, limit),
    }
  }

  if (normalizedBlock.type === 'VENDOR_CAROUSEL') {
    const stores = cacheEnabled ? await getStores() : await requestNoStore<StoreSummary[]>('/stores')
    const filterType = String(normalizedBlock.data.filterType ?? 'top_rated')
    const vendorIds = Array.isArray(normalizedBlock.data.vendorIds)
      ? normalizedBlock.data.vendorIds.map((item) => Number(item))
      : []

    let vendors = [...stores]

    if (filterType === 'handpicked') {
      vendors = vendors.filter((store) => vendorIds.includes(store.id))
      const order = new Map(vendorIds.map((id, index) => [id, index]))
      vendors.sort((left, right) => (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999))
    } else {
      vendors.sort((left, right) => {
        const leftRating = Number(left.customerRatingAverage ?? 0)
        const rightRating = Number(right.customerRatingAverage ?? 0)
        if (rightRating !== leftRating) return rightRating - leftRating

        const leftPriority = left.sameDayDelivery ? 1 : 0
        const rightPriority = right.sameDayDelivery ? 1 : 0
        return rightPriority - leftPriority
      })
    }

    return {
      ...normalizedBlock,
      vendors: vendors.slice(0, 8),
    }
  }

  if (normalizedBlock.type === 'LATEST_ARTICLES_SHOWCASE') {
    const limit = Math.min(Math.max(Number(normalizedBlock.data.limit ?? 5) || 5, 2), 10)
    const articles = cacheEnabled
      ? await getArticles(limit)
      : toArray<ArticleSummary>(await requestNoStore<{ data?: ArticleSummary[] } | ArticleSummary[]>(`/content/public/articles?limit=${limit}&page=1&sort=NEWEST`))

    return {
      ...normalizedBlock,
      articles: articles.slice(0, limit),
    }
  }

  return normalizedBlock
}

async function enrichBlockSafely(
  block: Record<string, unknown>,
  cacheEnabled: boolean,
): Promise<EnrichedBlock> {
  const fallbackBlock: EnrichedBlock = {
    id: String(block.id ?? ''),
    type: String(block.type ?? ''),
    data:
      typeof block.data === 'object' && block.data !== null
        ? (block.data as Record<string, unknown>)
        : {},
  }

  try {
    return await enrichBlock(block, cacheEnabled)
  } catch {
    if (fallbackBlock.type === 'CATEGORY_CIRCLES') {
      return {
        ...fallbackBlock,
        categories: [],
        productTypes: [],
      }
    }

    if (fallbackBlock.type === 'PRODUCT_CAROUSEL') {
      return {
        ...fallbackBlock,
        products: [],
      }
    }

    if (fallbackBlock.type === 'VENDOR_CAROUSEL') {
      return {
        ...fallbackBlock,
        vendors: [],
      }
    }

    if (fallbackBlock.type === 'LATEST_ARTICLES_SHOWCASE') {
      return {
        ...fallbackBlock,
        articles: [],
      }
    }

    return fallbackBlock
  }
}

export async function getEnrichedStorefrontPage(
  slugSegments?: string[],
): Promise<EnrichedStorefrontPage | null> {
  const page = await getStorefrontPageNoStore(toPageSlug(slugSegments))
  if (!page) return null
  const cacheEnabled = page.cacheEnabled !== false

  const blocks = await Promise.all((page.blocks ?? []).map((block) => enrichBlockSafely(block, cacheEnabled)))

  return {
    ...page,
    blocks,
  }
}

export async function getStorefrontMetadata(slugSegments?: string[]): Promise<Metadata> {
  const page = await getEnrichedStorefrontPage(slugSegments)

  if (!page) {
    return {
      title: 'صفحه پیدا نشد | گلینو',
      description: 'این صفحه در فروشگاه در دسترس نیست.',
    }
  }

  const seo = page.seo ?? {}
  const title = seo.metaTitle || page.title
  const description = seo.metaDescription || 'خرید آنلاین گل و هدایای خاص از فروشگاه‌های منتخب.'
  const canonical = seo.canonicalUrl || (page.slug === '/' ? '/' : `/${page.slug}`)
  const image = resolveAssetUrl(seo.ogImage)

  return {
    title,
    description,
    keywords: seo.keywords,
    alternates: {
      canonical,
    },
    robots: {
      index: !seo.noIndex,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      images: image ? [{ url: image }] : undefined,
    },
  }
}

export function buildArchiveMetadata({
  title,
  description,
  path,
  image,
  indexable,
  keywords,
  type = 'website',
}: {
  title: string
  description: string
  path: string
  image?: string | null
  indexable?: boolean | null
  keywords?: string[]
  type?: 'website' | 'article'
}): Metadata {
  return buildRichMetadata({
    title,
    description,
    path,
    image,
    indexable,
    keywords,
    type,
  })
}

export function buildRichMetadata({
  title,
  description,
  path,
  image,
  indexable,
  keywords,
  type = 'website',
}: MetadataInput): Metadata {
  const resolvedImage = resolveAssetUrl(image)

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: buildCanonicalUrl(path),
    },
    robots: {
      index: indexable !== false,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: buildCanonicalUrl(path),
      type,
      images: resolvedImage ? [{ url: resolvedImage }] : undefined,
    },
    twitter: {
      card: resolvedImage ? 'summary_large_image' : 'summary',
      title,
      description,
      images: resolvedImage ? [resolvedImage] : undefined,
    },
  }
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: buildAbsoluteUrl(item.path),
    })),
  }
}

export function buildCollectionPageJsonLd({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: buildCanonicalUrl(path),
  }
}

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'گلینو',
    url: buildCanonicalUrl('/'),
    logo: buildCanonicalUrl('/logo.png'),
  }
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'گلینو',
    url: buildCanonicalUrl('/'),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${buildCanonicalUrl('/shop')}?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

export function buildItemListJsonLd(items: ProductSummary[], path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    url: buildCanonicalUrl(path),
    numberOfItems: items.length,
    itemListElement: items.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: buildCanonicalUrl(`/products/${product.slug}`),
      item: {
        '@type': 'Product',
        name: product.name,
        image: product.mainImage ? resolveAssetUrl(product.mainImage) : undefined,
        url: buildCanonicalUrl(`/products/${product.slug}`),
        offers: {
          '@type': 'Offer',
          priceCurrency: 'IRR',
          price: typeof product.effectiveDiscountPrice === 'number' && product.effectiveDiscountPrice > 0
            ? product.effectiveDiscountPrice
            : product.effectivePrice ?? product.discountPrice ?? product.price,
          availability: product.isPurchasable === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        },
      },
    })),
  }
}

export function buildArticleJsonLd(article: PublicArticleDetail['article']) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.metaTitle || article.title,
    description: article.metaDescription || article.excerpt || undefined,
    image: article.ogImage ? [resolveAssetUrl(article.ogImage)] : article.coverImage ? [resolveAssetUrl(article.coverImage)] : undefined,
    datePublished: article.publishedAt || undefined,
    dateModified: article.updatedAt || undefined,
    mainEntityOfPage: buildCanonicalUrl(`/mag/${article.slug}`),
    author: {
      '@type': 'Person',
      name: article.author.name,
    },
    articleSection: article.category?.title || undefined,
    keywords: article.focusKeyword || undefined,
  }
}

export function buildStoreJsonLd(store: StoreSummary, productCount?: number) {
  const ratingValue = Number(store.customerRatingAverage ?? 0)
  const reviewCount = Number(store.customerRatingCount ?? 0)

  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: store.name,
    description: store.description || undefined,
    image: store.logo ? [resolveAssetUrl(store.logo)] : undefined,
    url: buildCanonicalUrl(`/stores/${store.slug}`),
    address: store.address || undefined,
    aggregateRating:
      ratingValue > 0 && reviewCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue,
            reviewCount,
          }
        : undefined,
    makesOffer:
      typeof productCount === 'number' && productCount > 0
        ? {
            '@type': 'OfferCatalog',
            name: `محصولات ${store.name}`,
            numberOfItems: productCount,
          }
        : undefined,
  }
}

export function buildProductJsonLd(product: StorefrontProductDetail) {
  const imageUrls = [
    resolveAssetUrl(product.mainImage),
    ...(Array.isArray(product.gallery) ? product.gallery.map((item) => resolveAssetUrl(item.url)) : []),
  ].filter(Boolean)

  const resolvedBasePrice = typeof product.effectivePrice === 'number' ? product.effectivePrice : product.price
  const resolvedDiscountPrice =
    typeof product.effectiveDiscountPrice === 'number' ? product.effectiveDiscountPrice : product.discountPrice
  const hasDiscount =
    typeof resolvedDiscountPrice === 'number' &&
    resolvedDiscountPrice > 0 &&
    resolvedDiscountPrice < resolvedBasePrice

  const price = hasDiscount ? Number(resolvedDiscountPrice) : resolvedBasePrice
  const ratingValue = Number(product.store?.customerRatingAverage ?? 0)
  const reviewCount = Number(product.store?.customerRatingCount ?? 0)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.metaTitle || product.name,
    description:
      product.metaDescription ||
      product.shortDescription ||
      product.description ||
      `جزئیات محصول ${product.name}`,
    image: imageUrls,
    sku: String(product.id),
    category: product.category?.name,
    brand: product.store?.name
      ? {
          '@type': 'Brand',
          name: product.store.name,
        }
      : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'IRR',
      price,
      availability: product.isPurchasable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: buildCanonicalUrl(`/products/${product.slug}`),
      seller: product.store?.name
        ? {
            '@type': 'Organization',
            name: product.store.name,
          }
        : undefined,
    },
    aggregateRating:
      ratingValue > 0 && reviewCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue,
            reviewCount,
          }
        : undefined,
  }
}

export async function getStorefrontSeoSettings(): Promise<SeoSettings | null> {
  try {
    return await requestNoStore<SeoSettings>('/settings/seo')
  } catch {
    return null
  }
}

export type SeoLandingMatch = {
  id: number
  internalName: string
  slug: string
  categoryId: number
  filterConfig: Array<{ type: string; valueId: number; label?: string }>
  isActive: boolean
  metaTitle?: string | null
  metaDescription?: string | null
  h1Tag?: string | null
  seoContent?: string | null
  category: {
    id: number
    name: string
    slug: string
  }
}

export async function matchSeoLanding(
  categoryId: number,
  filterIds: number[],
): Promise<SeoLandingMatch | null> {
  const filterIdsStr = filterIds.length > 0 ? filterIds.join(',') : ''
  const params = new URLSearchParams({
    categoryId: String(categoryId),
    filterIds: filterIdsStr,
  })

  try {
    const result = await requestCached<SeoLandingMatch | null>(
      `/seo-landings/match?${params.toString()}`,
    )
    return result ?? null
  } catch {
    return null
  }
}

export async function getSeoLandingsForSitemap(): Promise<SeoLandingMatch[]> {
  try {
    return await requestCached<SeoLandingMatch[]>('/seo-landings')
  } catch {
    return []
  }
}

export async function getStorefrontInfoPagesSettings(): Promise<StorefrontInfoPagesSettings | null> {
  try {
    return await requestNoStore<StorefrontInfoPagesSettings>('/settings/storefront-info-pages')
  } catch {
    return null
  }
}

export { resolveAssetUrl }

import type { Metadata } from 'next'
import { cache } from 'react'

export type StorefrontSeo = {
  metaTitle?: string | null
  metaDescription?: string | null
  keywords?: string[]
  ogImage?: string | null
  canonicalUrl?: string | null
  noIndex?: boolean
}

export type StorefrontPage = {
  id: string
  title: string
  slug: string
  pageType: 'HOME' | 'LANDING' | 'CAMPAIGN' | 'STATIC'
  cacheEnabled?: boolean
  seo: StorefrontSeo
  blocks: Array<Record<string, unknown>>
  updatedAt?: string
  publishedAt?: string | null
}

export type CategorySummary = {
  id: number
  name: string
  slug: string
  image?: string | null
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
  isPurchasable?: boolean
  isArchived?: boolean
  publicationStatus?: string
  category?: {
    id: number
    name: string
  } | null
  store?: {
    id: number
    name: string
    slug: string
  } | null
}

export type StoreSummary = {
  id: number
  name: string
  slug: string
  logo?: string | null
  sameDayDelivery?: boolean
  customerRatingAverage?: string | number
  customerRatingCount?: number
}

export type EnrichedBlock = Record<string, unknown> & {
  id: string
  type: string
  data: Record<string, unknown>
  categories?: CategorySummary[]
  products?: ProductSummary[]
  vendors?: StoreSummary[]
}

export type EnrichedStorefrontPage = Omit<StorefrontPage, 'blocks'> & {
  blocks: EnrichedBlock[]
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  'http://localhost:3000/v1'

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

const getCategories = cache(async (): Promise<CategorySummary[]> => {
  return requestCached<CategorySummary[]>('/categories')
})

const getStores = cache(async (): Promise<StoreSummary[]> => {
  return requestCached<StoreSummary[]>('/stores')
})

type ProductQuery = {
  limit?: number
  categoryId?: string
  categoryIds?: string[]
  productTypeId?: string
  ids?: string[]
  search?: string
  sortBy?: 'newest' | 'most_sold' | 'instant_delivery'
}

const getProducts = cache(async (_queryKey: string, query: ProductQuery): Promise<ProductSummary[]> => {
  const params = new URLSearchParams()

  params.set('publicationStatus', 'PUBLISHED')
  params.set('limit', String(query.limit ?? 8))

  if (query.categoryId) params.set('categoryId', query.categoryId)
  if (query.categoryIds?.length) params.set('categoryIds', query.categoryIds.join(','))
  if (query.productTypeId) params.set('productTypeId', query.productTypeId)
  if (query.ids?.length) params.set('ids', query.ids.join(','))
  if (query.search) params.set('search', query.search)
  if (query.sortBy) params.set('sortBy', query.sortBy)

  const payload = await requestCached<{ data?: ProductSummary[] } | ProductSummary[]>(`/products?${params.toString()}`)
  const products = filterEligibleProducts(toArray<ProductSummary>(payload))

  if (!query.ids?.length) {
    return products
  }

  const order = new Map(query.ids.map((id, index) => [Number(id), index]))
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
  params.set('limit', String(query.limit ?? 8))

  if (query.categoryId) params.set('categoryId', query.categoryId)
  if (query.categoryIds?.length) params.set('categoryIds', query.categoryIds.join(','))
  if (query.productTypeId) params.set('productTypeId', query.productTypeId)
  if (query.ids?.length) params.set('ids', query.ids.join(','))
  if (query.search) params.set('search', query.search)
  if (query.sortBy) params.set('sortBy', query.sortBy)

  const payload = await requestNoStore<{ data?: ProductSummary[] } | ProductSummary[]>(`/products?${params.toString()}`)
  const products = filterEligibleProducts(toArray<ProductSummary>(payload))

  if (!query.ids?.length) {
    return products
  }

  const order = new Map(query.ids.map((id, index) => [Number(id), index]))
  return [...products].sort((left, right) => (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999))
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

    return {
      ...normalizedBlock,
      categories: categories.filter((category) => categoryIds.includes(String(category.id))),
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

export { resolveAssetUrl }

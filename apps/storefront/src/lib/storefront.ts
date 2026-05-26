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
  seo: StorefrontSeo
  blocks: StorefrontBlock[]
  updatedAt?: string
  publishedAt?: string | null
}

export type StorefrontBlock = {
  id: string
  type:
    | 'HERO_HEADER'
    | 'CATEGORY_CIRCLES'
    | 'PRODUCT_CAROUSEL'
    | 'EDITORIAL_RICH_BLOCK'
    | 'VENDOR_CAROUSEL'
    | 'CAMPAIGN_GRID'
  data: Record<string, unknown>
}

export type CategorySummary = {
  id: number
  name: string
  slug: string
  image?: string | null
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

type HeroHeaderBlock = StorefrontBlock & {
  type: 'HERO_HEADER'
}

type CategoryCirclesBlock = StorefrontBlock & {
  type: 'CATEGORY_CIRCLES'
  categories: CategorySummary[]
}

type ProductCarouselBlock = StorefrontBlock & {
  type: 'PRODUCT_CAROUSEL'
  products: ProductSummary[]
}

type EditorialRichBlock = StorefrontBlock & {
  type: 'EDITORIAL_RICH_BLOCK'
}

type VendorCarouselBlock = StorefrontBlock & {
  type: 'VENDOR_CAROUSEL'
  vendors: StoreSummary[]
}

type CampaignGridBlock = StorefrontBlock & {
  type: 'CAMPAIGN_GRID'
}

export type EnrichedBlock =
  | HeroHeaderBlock
  | CategoryCirclesBlock
  | ProductCarouselBlock
  | EditorialRichBlock
  | VendorCarouselBlock
  | CampaignGridBlock

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
    next: {
      revalidate: 60,
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

const getCategories = cache(async (): Promise<CategorySummary[]> => {
  return request<CategorySummary[]>('/categories')
})

const getStores = cache(async (): Promise<StoreSummary[]> => {
  return request<StoreSummary[]>('/stores')
})

type ProductQuery = {
  limit?: number
  categoryId?: string
  productTypeId?: string
  ids?: string[]
  search?: string
  sortBy?: 'newest' | 'most_sold' | 'instant_delivery'
}

const getProducts = cache(async (_queryKey: string, query: ProductQuery): Promise<ProductSummary[]> => {
  const params = new URLSearchParams()

  params.set('publicationStatus', 'PUBLISHED')
  params.set('isArchived', 'false')
  params.set('isPurchasable', 'true')
  params.set('limit', String(query.limit ?? 8))

  if (query.categoryId) params.set('categoryId', query.categoryId)
  if (query.productTypeId) params.set('productTypeId', query.productTypeId)
  if (query.ids?.length) params.set('ids', query.ids.join(','))
  if (query.search) params.set('search', query.search)
  if (query.sortBy) params.set('sortBy', query.sortBy)

  const payload = await request<{ data?: ProductSummary[] } | ProductSummary[]>(`/products?${params.toString()}`)
  const products = toArray<ProductSummary>(payload)

  if (!query.ids?.length) {
    return products
  }

  const order = new Map(query.ids.map((id, index) => [Number(id), index]))
  return [...products].sort((left, right) => (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999))
})

const getStorefrontPage = cache(async (slug: string): Promise<StorefrontPage | null> => {
  const params = new URLSearchParams({ slug })

  try {
    return await request<StorefrontPage>(`/pages/by-slug?${params.toString()}`)
  } catch {
    return null
  }
})

async function enrichBlock(block: StorefrontBlock): Promise<EnrichedBlock> {
  if (block.type === 'CATEGORY_CIRCLES') {
    const categories = await getCategories()
    const categoryIds = Array.isArray(block.data.categoryIds) ? block.data.categoryIds.map((item) => String(item)) : []

    return {
      ...block,
      categories: categories.filter((category) => categoryIds.includes(String(category.id))),
    }
  }

  if (block.type === 'PRODUCT_CAROUSEL') {
    const filterType = String(block.data.filterType ?? 'category')
    const sortBy = String(block.data.sortBy ?? 'newest') as ProductQuery['sortBy']
    const limit = Number(block.data.limit ?? 8) || 8
    const filterValue = block.data.filterValue

    let products: ProductSummary[] = []

    if (filterType === 'category') {
      products = await getProducts(`category:${String(filterValue)}:${sortBy}:${limit}`, {
        categoryId: String(filterValue ?? ''),
        sortBy,
        limit,
      })
    } else if (filterType === 'productType') {
      products = await getProducts(`productType:${String(filterValue)}:${sortBy}:${limit}`, {
        productTypeId: String(filterValue ?? ''),
        sortBy,
        limit,
      })
    } else if (filterType === 'custom_list') {
      const ids = Array.isArray(filterValue) ? filterValue.map((item) => String(item)) : []
      products = await getProducts(`ids:${ids.join(',')}:${sortBy}:${limit}`, {
        ids,
        sortBy,
        limit,
      })
    } else {
      products = await getProducts(`search:${String(filterValue)}:${sortBy}:${limit}`, {
        search: String(filterValue ?? ''),
        sortBy,
        limit,
      })
    }

    return {
      ...block,
      products: products.slice(0, limit),
    }
  }

  if (block.type === 'VENDOR_CAROUSEL') {
    const stores = await getStores()
    const filterType = String(block.data.filterType ?? 'top_rated')
    const vendorIds = Array.isArray(block.data.vendorIds) ? block.data.vendorIds.map((item) => Number(item)) : []

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
      ...block,
      vendors: vendors.slice(0, 8),
    }
  }

  return block
}

export const getEnrichedStorefrontPage = cache(
  async (slugSegments?: string[]): Promise<EnrichedStorefrontPage | null> => {
    const page = await getStorefrontPage(toPageSlug(slugSegments))
    if (!page) return null

    const blocks = await Promise.all((page.blocks ?? []).map((block) => enrichBlock(block)))

    return {
      ...page,
      blocks,
    }
  },
)

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

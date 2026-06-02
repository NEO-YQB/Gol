import { Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type PageBuilderWorkspacePageProps = {
  session: AuthSession
  mode: 'create' | 'edit'
  pageId: string | null
  onBack: () => void
}

type StorefrontPageType = 'HOME' | 'LANDING' | 'CAMPAIGN' | 'STATIC'
type PageBlockType =
  | 'HERO_HEADER'
  | 'CATEGORY_CIRCLES'
  | 'PRODUCT_CAROUSEL'
  | 'EDITORIAL_RICH_BLOCK'
  | 'VENDOR_CAROUSEL'
  | 'CAMPAIGN_GRID'
  | 'LATEST_ARTICLES_SHOWCASE'

type ProductFilterType = 'category' | 'tag' | 'productType' | 'custom_list'
type ProductSortBy = 'newest' | 'most_sold' | 'instant_delivery'
type VendorFilterType = 'top_rated' | 'nearest_to_user' | 'handpicked'
type BlockLoadingMode = 'eager' | 'lazy' | 'viewport'

type BlockForm = {
  id: string
  type: PageBlockType
  loadingMode: BlockLoadingMode
  data: Record<string, unknown>
}

type PreviewRecord = Record<string, unknown>
type CategoryOption = PreviewRecord & { depth: number }
type ProductPreviewState = {
  items: PreviewRecord[]
  error?: string
}

type FooterLinkItemForm = {
  label: string
  href: string
}

type FooterLinkColumnForm = {
  enabled: boolean
  title: string
  items: FooterLinkItemForm[]
}

type FooterBadgeForm = {
  enabled: boolean
  title: string
  imageUrl: string
  href: string
}

type FooterSocialForm = {
  enabled: boolean
  label: string
  imageUrl: string
  href: string
}

type ColorFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
  hint?: string
  pickerFallback?: string
}

type BuilderPanelKey = 'pageSettings' | 'header' | 'footer' | 'seo' | 'blocks'

type CollapsibleSectionCardProps = {
  eyebrow: string
  title: string
  description: string
  open: boolean
  onToggle: () => void
  actions?: ReactNode
  children: ReactNode
}

type PageForm = {
  title: string
  slug: string
  pageType: StorefrontPageType
  isActive: boolean
  cacheEnabled: boolean
  headerEnabled: boolean
  headerTransparentOnTop: boolean
  headerStickyVariant: 'full' | 'floating'
  headerBrandLabel: string
  headerBrandHref: string
  headerLogoImageUrl: string
  headerTextColor: string
  headerMutedTextColor: string
  headerGlassBackgroundColor: string
  headerGlassBorderColor: string
  headerActionBackgroundColor: string
  headerActionTextColor: string
  headerAuthPreviewMode: 'guest' | 'authenticated'
  headerAuthPreviewName: string
  headerMenuItems: Array<{ label: string; href: string; highlighted: boolean; textColor: string; backgroundColor: string }>
  footerEnabled: boolean
  footerBackgroundColor: string
  footerTextColor: string
  footerMutedTextColor: string
  footerAccentColor: string
  footerBorderColor: string
  footerBrandEnabled: boolean
  footerBrandWidthPercent: string
  footerBrandLogoImageUrl: string
  footerBrandLogoHref: string
  footerBrandDescription: string
  footerLinksEnabled: boolean
  footerLinksWidthPercent: string
  footerLinkColumns: FooterLinkColumnForm[]
  footerTrustEnabled: boolean
  footerTrustWidthPercent: string
  footerTrustTitle: string
  footerBadges: FooterBadgeForm[]
  footerSocials: FooterSocialForm[]
  footerLegalEnabled: boolean
  footerLegalText: string
  metaTitle: string
  metaDescription: string
  keywords: string
  ogImage: string
  canonicalUrl: string
  noIndex: boolean
  blocks: BlockForm[]
}

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `block-${Math.random().toString(36).slice(2, 10)}`
}

function getDefaultBlockData(type: PageBlockType): Record<string, unknown> {
  switch (type) {
    case 'CATEGORY_CIRCLES':
      return {
        categoryIds: [],
        showTitles: true,
      }
    case 'PRODUCT_CAROUSEL':
      return {
        title: '',
        filterType: 'category',
        filterValue: '',
        sortBy: 'newest',
        limit: 8,
      }
    case 'EDITORIAL_RICH_BLOCK':
      return {
        title: '',
        description: '',
        imageUrl: '',
        imagePosition: 'right',
        buttonText: '',
        buttonLink: '',
        backgroundColor: '',
        descriptionColor: '',
        imageWidthPercent: 25,
      }
    case 'VENDOR_CAROUSEL':
      return {
        title: '',
        filterType: 'top_rated',
        vendorIds: [],
      }
    case 'CAMPAIGN_GRID':
      return {
        title: '',
        backgroundColor: '',
        banners: [
          {
            imageUrl: '',
            link: '',
            colSpan: 1,
          },
        ],
      }
    case 'LATEST_ARTICLES_SHOWCASE':
      return {
        title: '',
        subtitle: '',
        limit: 5,
        articleBasePath: '/mag/articles',
        ctaText: 'مشاهده همه مقاله‌ها',
        ctaLink: '/mag',
      }
    case 'HERO_HEADER':
    default:
      return {
        title: '',
        subtitle: '',
        imageUrl: '',
        mobileImageUrl: '',
        ctaText: '',
        ctaLink: '',
        textColor: '',
        imageFit: 'cover',
        imagePosition: 'center',
      }
  }
}

function createBlock(type: PageBlockType = 'HERO_HEADER'): BlockForm {
  return {
    id: makeId(),
    type,
    loadingMode: getDefaultLoadingMode(type),
    data: getDefaultBlockData(type),
  }
}

function getDefaultLoadingMode(type: PageBlockType): BlockLoadingMode {
  if (type === 'HERO_HEADER' || type === 'CATEGORY_CIRCLES') {
    return 'eager'
  }

  return 'viewport'
}

function createEmptyForm(): PageForm {
  return {
    title: '',
    slug: '/',
    pageType: 'HOME',
    isActive: false,
    cacheEnabled: false,
    headerEnabled: true,
    headerTransparentOnTop: true,
    headerStickyVariant: 'floating',
    headerBrandLabel: 'گلینو',
    headerBrandHref: '/',
    headerLogoImageUrl: '',
    headerTextColor: '#173126',
    headerMutedTextColor: '#6e6152',
    headerGlassBackgroundColor: 'rgba(255,251,245,0.42)',
    headerGlassBorderColor: 'rgba(255,255,255,0.2)',
    headerActionBackgroundColor: '#1f6a52',
    headerActionTextColor: '#ffffff',
    headerAuthPreviewMode: 'guest',
    headerAuthPreviewName: '',
    headerMenuItems: [],
    footerEnabled: true,
    footerBackgroundColor: '#173126',
    footerTextColor: '#f5efe4',
    footerMutedTextColor: '#d8c9b4',
    footerAccentColor: '#2a5d49',
    footerBorderColor: 'rgba(255,255,255,0.12)',
    footerBrandEnabled: true,
    footerBrandWidthPercent: '34',
    footerBrandLogoImageUrl: '',
    footerBrandLogoHref: '/',
    footerBrandDescription: '',
    footerLinksEnabled: true,
    footerLinksWidthPercent: '36',
    footerLinkColumns: [
      { enabled: true, title: '', items: [] },
      { enabled: true, title: '', items: [] },
      { enabled: false, title: '', items: [] },
    ],
    footerTrustEnabled: true,
    footerTrustWidthPercent: '30',
    footerTrustTitle: '',
    footerBadges: [],
    footerSocials: [],
    footerLegalEnabled: true,
    footerLegalText: 'تمامی حقوق برای گلینو محفوظ است',
    metaTitle: '',
    metaDescription: '',
    keywords: '',
    ogImage: '',
    canonicalUrl: '',
    noIndex: false,
    blocks: [],
  }
}

function createFooterLinkItem(): FooterLinkItemForm {
  return { label: '', href: '' }
}

function createFooterBadge(): FooterBadgeForm {
  return { enabled: true, title: '', imageUrl: '', href: '' }
}

function createFooterSocial(): FooterSocialForm {
  return { enabled: true, label: '', imageUrl: '', href: '' }
}

function normalizeColorPickerValue(value: string, fallback = '#173126') {
  const trimmed = value.trim()

  if (/^#([0-9a-f]{6})$/i.test(trimmed)) return trimmed

  const shortHexMatch = trimmed.match(/^#([0-9a-f]{3})$/i)
  if (shortHexMatch) {
    return `#${shortHexMatch[1].split('').map((char) => `${char}${char}`).join('')}`
  }

  return fallback
}

function ColorField({ label, value, onChange, className, hint, pickerFallback = '#173126' }: ColorFieldProps) {
  return (
    <label className={`fm-field${className ? ` ${className}` : ''}`}>
      <span>{label}</span>
      <div className="flex items-center gap-3">
        <input onChange={(event) => onChange(event.target.value)} type="text" value={value} />
        <input
          aria-label={`${label} color picker`}
          className="h-11 w-14 cursor-pointer rounded-xl border border-[rgba(15,23,42,0.12)] bg-white p-1"
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={normalizeColorPickerValue(value, pickerFallback)}
        />
      </div>
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}

function CollapsibleSectionCard({
  eyebrow,
  title,
  description,
  open,
  onToggle,
  actions,
  children,
}: CollapsibleSectionCardProps) {
  return (
    <SectionCard
      actions={
        <div className="page-builder-workspace__actions">
          {actions}
          <button className="fm-button fm-button--ghost" onClick={onToggle} type="button">
            {open ? 'جمع کردن' : 'باز کردن'}
          </button>
        </div>
      }
      description={description}
      eyebrow={eyebrow}
      title={title}
    >
      {open ? children : null}
    </SectionCard>
  )
}

function toTextArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item)).filter(Boolean)
}

function normalizeIdList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function flattenCategoryOptions(categories: PreviewRecord[], depth = 0): CategoryOption[] {
  return categories.flatMap((category) => {
    const children = toArray(category.children)
    return [{ ...category, depth }, ...flattenCategoryOptions(children, depth + 1)]
  })
}

function collectCategoryAndChildIds(categories: PreviewRecord[], targetId: string): string[] {
  for (const category of categories) {
    const categoryId = readText(category, ['id'], '')

    if (categoryId === targetId) {
      return flattenCategoryOptions([category]).map((item) => readText(item, ['id'], '')).filter(Boolean)
    }

    const nestedIds = collectCategoryAndChildIds(toArray(category.children), targetId)
    if (nestedIds.length) {
      return nestedIds
    }
  }

  return targetId ? [targetId] : []
}

function filterEligiblePreviewProducts(products: PreviewRecord[]) {
  return products.filter((product) => {
    const publicationStatus = readText(product, ['publicationStatus'], '')
    return publicationStatus === 'PUBLISHED' && product.isPurchasable === true && product.isArchived !== true
  })
}

function mapApiPageToForm(page: Record<string, unknown>): PageForm {
  const blocks = toArray(page.blocks).map((block) => {
    const type = readText(block, ['type'], 'HERO_HEADER') as PageBlockType
    return {
      id: readText(block, ['id'], makeId()),
      type,
      loadingMode: normalizeBlockLoadingMode(readText(block, ['loadingMode'], ''), type),
      data: typeof block.data === 'object' && block.data !== null ? (block.data as Record<string, unknown>) : getDefaultBlockData(type),
    }
  })

  const headerConfig = typeof page.headerConfig === 'object' && page.headerConfig !== null ? (page.headerConfig as Record<string, unknown>) : {}
  const footerConfig = typeof page.footerConfig === 'object' && page.footerConfig !== null ? (page.footerConfig as Record<string, unknown>) : {}
  const headerMenuItems = Array.isArray(headerConfig.menuItems)
    ? headerConfig.menuItems
        .map((item) =>
          typeof item === 'object' && item !== null
            ? {
                label: readText(item as Record<string, unknown>, ['label'], ''),
                href: readText(item as Record<string, unknown>, ['href'], ''),
                highlighted: (item as Record<string, unknown>).highlighted === true,
                textColor: readText(item as Record<string, unknown>, ['textColor'], ''),
                backgroundColor: readText(item as Record<string, unknown>, ['backgroundColor'], ''),
              }
            : null,
        )
        .filter((item): item is { label: string; href: string; highlighted: boolean; textColor: string; backgroundColor: string } => Boolean(item && item.label && item.href))
    : []

  const footerLinkColumns = Array.isArray(footerConfig.linkColumns)
    ? footerConfig.linkColumns
        .map((column) =>
          typeof column === 'object' && column !== null
            ? {
                enabled: (column as Record<string, unknown>).enabled !== false,
                title: readText(column as Record<string, unknown>, ['title'], ''),
                items: Array.isArray((column as Record<string, unknown>).items)
                  ? ((column as Record<string, unknown>).items as Array<Record<string, unknown>>).map((item) => ({
                      label: readText(item, ['label'], ''),
                      href: readText(item, ['href'], ''),
                    }))
                  : [],
              }
            : null,
        )
        .filter((column): column is FooterLinkColumnForm => Boolean(column))
    : []

  const footerBadges = Array.isArray(footerConfig.badges)
    ? footerConfig.badges
        .map((badge) =>
          typeof badge === 'object' && badge !== null
            ? {
                enabled: (badge as Record<string, unknown>).enabled !== false,
                title: readText(badge as Record<string, unknown>, ['title'], ''),
                imageUrl: readText(badge as Record<string, unknown>, ['imageUrl'], ''),
                href: readText(badge as Record<string, unknown>, ['href'], ''),
              }
            : null,
        )
        .filter((badge): badge is FooterBadgeForm => Boolean(badge))
    : []

  const footerSocials = Array.isArray(footerConfig.socials)
    ? footerConfig.socials
        .map((social) =>
          typeof social === 'object' && social !== null
            ? {
                enabled: (social as Record<string, unknown>).enabled !== false,
                label: readText(social as Record<string, unknown>, ['label'], ''),
                imageUrl: readText(social as Record<string, unknown>, ['imageUrl'], ''),
                href: readText(social as Record<string, unknown>, ['href'], ''),
              }
            : null,
        )
        .filter((social): social is FooterSocialForm => Boolean(social))
    : []

  return {
    title: readText(page, ['title'], ''),
    slug: readText(page, ['slug'], '/'),
    pageType: readText(page, ['pageType'], 'LANDING') as StorefrontPageType,
    isActive: page.isActive === true,
    cacheEnabled: page.cacheEnabled !== false,
    headerEnabled: headerConfig.enabled !== false,
    headerTransparentOnTop: headerConfig.transparentOnTop !== false,
    headerStickyVariant: readText(headerConfig, ['stickyVariant'], 'floating') === 'full' ? 'full' : 'floating',
    headerBrandLabel: readText(headerConfig, ['brandLabel'], 'گلینو'),
    headerBrandHref: readText(headerConfig, ['brandHref'], '/'),
    headerLogoImageUrl: readText(headerConfig, ['logoImageUrl'], ''),
    headerTextColor: readText(headerConfig, ['textColor'], '#173126'),
    headerMutedTextColor: readText(headerConfig, ['mutedTextColor'], '#6e6152'),
    headerGlassBackgroundColor: readText(headerConfig, ['glassBackgroundColor'], 'rgba(255,251,245,0.42)'),
    headerGlassBorderColor: readText(headerConfig, ['glassBorderColor'], 'rgba(255,255,255,0.2)'),
    headerActionBackgroundColor: readText(headerConfig, ['actionBackgroundColor'], '#1f6a52'),
    headerActionTextColor: readText(headerConfig, ['actionTextColor'], '#ffffff'),
    headerAuthPreviewMode: readText(headerConfig, ['authPreviewMode'], 'guest') === 'authenticated' ? 'authenticated' : 'guest',
    headerAuthPreviewName: readText(headerConfig, ['authPreviewName'], ''),
    headerMenuItems,
    footerEnabled: footerConfig.enabled !== false,
    footerBackgroundColor: readText(footerConfig, ['backgroundColor'], '#173126'),
    footerTextColor: readText(footerConfig, ['textColor'], '#f5efe4'),
    footerMutedTextColor: readText(footerConfig, ['mutedTextColor'], '#d8c9b4'),
    footerAccentColor: readText(footerConfig, ['accentColor'], '#2a5d49'),
    footerBorderColor: readText(footerConfig, ['borderColor'], 'rgba(255,255,255,0.12)'),
    footerBrandEnabled: footerConfig.brandEnabled !== false,
    footerBrandWidthPercent: readText(footerConfig, ['brandWidthPercent'], '34'),
    footerBrandLogoImageUrl: readText(footerConfig, ['brandLogoImageUrl'], ''),
    footerBrandLogoHref: readText(footerConfig, ['brandLogoHref'], '/'),
    footerBrandDescription: readText(footerConfig, ['brandDescription'], ''),
    footerLinksEnabled: footerConfig.linksEnabled !== false,
    footerLinksWidthPercent: readText(footerConfig, ['linksWidthPercent'], '36'),
    footerLinkColumns:
      footerLinkColumns.length > 0
        ? footerLinkColumns
        : [
            { enabled: true, title: '', items: [] },
            { enabled: true, title: '', items: [] },
            { enabled: false, title: '', items: [] },
          ],
    footerTrustEnabled: footerConfig.trustEnabled !== false,
    footerTrustWidthPercent: readText(footerConfig, ['trustWidthPercent'], '30'),
    footerTrustTitle: readText(footerConfig, ['trustTitle'], ''),
    footerBadges,
    footerSocials,
    footerLegalEnabled: footerConfig.legalEnabled !== false,
    footerLegalText: readText(footerConfig, ['legalText'], 'تمامی حقوق برای گلینو محفوظ است'),
    metaTitle: readText(page, ['metaTitle'], ''),
    metaDescription: readText(page, ['metaDescription'], ''),
    keywords: toTextArray(page.keywords).join(', '),
    ogImage: readText(page, ['ogImage'], ''),
    canonicalUrl: readText(page, ['canonicalUrl'], ''),
    noIndex: page.noIndex === true,
    blocks,
  }
}

function toOptionalText(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function normalizeBlockLoadingMode(value: string, type: PageBlockType): BlockLoadingMode {
  if (type === 'HERO_HEADER' || type === 'CATEGORY_CIRCLES') {
    return 'eager'
  }

  if (value === 'eager' || value === 'lazy' || value === 'viewport') {
    return value
  }

  return 'viewport'
}

function parseCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getBlockLabel(type: PageBlockType) {
  switch (type) {
    case 'HERO_HEADER':
      return 'هیرو هدر'
    case 'CATEGORY_CIRCLES':
      return 'دسته‌بندی دایره‌ای'
    case 'PRODUCT_CAROUSEL':
      return 'کروسل محصولات'
    case 'EDITORIAL_RICH_BLOCK':
      return 'بلوک ادیتوریال'
    case 'VENDOR_CAROUSEL':
      return 'کروسل فروشگاه‌ها'
    case 'CAMPAIGN_GRID':
      return 'گرید کمپین'
    case 'LATEST_ARTICLES_SHOWCASE':
      return 'ویترین آخرین مقالات'
  }
}

export function PageBuilderWorkspacePage({
  session,
  mode,
  pageId,
  onBack,
}: PageBuilderWorkspacePageProps) {
  const [loading, setLoading] = useState(mode === 'edit')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState<PageForm>(() => createEmptyForm())
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>(mode)
  const [currentPageId, setCurrentPageId] = useState<string | null>(pageId)
  const [uploadingImageTarget, setUploadingImageTarget] = useState<string | null>(null)
  const [referenceCategories, setReferenceCategories] = useState<PreviewRecord[]>([])
  const [referenceStores, setReferenceStores] = useState<PreviewRecord[]>([])
  const [referenceProductTypes, setReferenceProductTypes] = useState<PreviewRecord[]>([])
  const [productPreviewByBlock, setProductPreviewByBlock] = useState<Record<string, ProductPreviewState>>({})
  const [sectionOpen, setSectionOpen] = useState<Record<BuilderPanelKey, boolean>>({
    pageSettings: true,
    header: false,
    footer: false,
    seo: false,
    blocks: true,
  })
  const [blockOpenById, setBlockOpenById] = useState<Record<string, boolean>>({})
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  useNoticeEffect(error, 'error')
  useNoticeEffect(message, 'success')

  useEffect(() => {
    setEditorMode(mode)
    setCurrentPageId(pageId)
    setMessage(null)
  }, [mode, pageId])

  useEffect(() => {
    if (editorMode !== 'edit' || !currentPageId) {
      setLoading(false)
      setForm(createEmptyForm())
      return
    }

    let active = true
    const pageIdToLoad = currentPageId

    async function loadPage() {
      setLoading(true)
      setError(null)

      try {
        const payload = await adminApi.getStorefrontPageDetail(session, pageIdToLoad)
        if (!active) return
        setForm(mapApiPageToForm(payload as unknown as Record<string, unknown>))
      } catch (requestError) {
        if (!active) return
        setError(requestError instanceof Error ? requestError.message : 'بارگذاری جزئیات صفحه انجام نشد')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadPage()

    return () => {
      active = false
    }
  }, [currentPageId, editorMode, session])

  useEffect(() => {
    let active = true

    async function loadReferences() {
      try {
        const [categoriesPayload, storesPayload, productTypesPayload] = await Promise.all([
          adminApi.getCategories(session),
          adminApi.getStores(session),
          adminApi.getProductTypes(session),
        ])

        if (!active) return

        setReferenceCategories(toArray(categoriesPayload))
        setReferenceStores(toArray(storesPayload))
        setReferenceProductTypes(toArray(productTypesPayload))
      } catch {
        if (!active) return
      }
    }

    void loadReferences()

    return () => {
      active = false
    }
  }, [session])

  useEffect(() => {
    const productBlocks = form.blocks.filter((block) => block.type === 'PRODUCT_CAROUSEL')

    if (!productBlocks.length) {
      setProductPreviewByBlock({})
      return
    }

    let active = true

    async function loadProductPreviews() {
      const entries = await Promise.all(
        productBlocks.map(async (block) => {
          const filterType = String(block.data.filterType ?? 'category') as ProductFilterType
          const rawFilterValue = block.data.filterValue
          const limit = Math.min(Number(block.data.limit ?? 8) || 8, 12)

          try {
            if (filterType === 'category') {
              const selectedCategoryId = String(rawFilterValue ?? '').trim()
              if (!selectedCategoryId) return [block.id, { items: [] }] as const

              const categoryIds = collectCategoryAndChildIds(referenceCategories, selectedCategoryId)
                .map((item) => Number(item))
                .filter((item) => Number.isInteger(item) && item > 0)

              if (!categoryIds.length) return [block.id, { items: [] }] as const

              const payload = await adminApi.getProducts(
                session,
                categoryIds.length === 1
                  ? {
                      page: 1,
                      limit,
                      categoryId: categoryIds[0],
                      publicationStatus: 'PUBLISHED',
                    }
                  : {
                      page: 1,
                      limit,
                      categoryIds,
                      publicationStatus: 'PUBLISHED',
                    },
              )
              return [block.id, { items: filterEligiblePreviewProducts(toArray(payload)) }] as const
            }

            if (filterType === 'productType') {
              const productTypeId = Number(String(rawFilterValue ?? '').trim())
              if (!Number.isInteger(productTypeId) || productTypeId <= 0) return [block.id, { items: [] }] as const

              const payload = await adminApi.getProducts(session, {
                page: 1,
                limit,
                productTypeId,
                publicationStatus: 'PUBLISHED',
              })
              return [block.id, { items: filterEligiblePreviewProducts(toArray(payload)) }] as const
            }

            if (filterType === 'custom_list') {
              const ids = String(rawFilterValue ?? '')
                .split(',')
                .map((item) => Number(item.trim()))
                .filter((item) => Number.isInteger(item) && item > 0)

              if (!ids.length) return [block.id, { items: [] }] as const

              const payload = await adminApi.getProducts(session, {
                page: 1,
                limit,
                ids,
                publicationStatus: 'PUBLISHED',
              })
              return [block.id, { items: filterEligiblePreviewProducts(toArray(payload)) }] as const
            }

            const payload = await adminApi.getProducts(session, {
              page: 1,
              limit,
              search: String(rawFilterValue ?? '').trim(),
              publicationStatus: 'PUBLISHED',
            })
            return [block.id, { items: filterEligiblePreviewProducts(toArray(payload)) }] as const
          } catch (error) {
            return [block.id, { items: [], error: error instanceof Error ? error.message : 'خطا در دریافت پیش‌نمایش محصولات' }] as const
          }
        }),
      )

      if (!active) return
      setProductPreviewByBlock(Object.fromEntries(entries))
    }

    void loadProductPreviews()

    return () => {
      active = false
    }
  }, [form.blocks, referenceCategories, session])

  useEffect(() => {
    setBlockOpenById((current) => {
      const next: Record<string, boolean> = {}

      form.blocks.forEach((block, index) => {
        next[block.id] = current[block.id] ?? index === 0
      })

      return next
    })
  }, [form.blocks])

  const blockSummary = useMemo(() => {
    return form.blocks.reduce<Record<PageBlockType, number>>((acc, block) => {
      acc[block.type] = (acc[block.type] ?? 0) + 1
      return acc
    }, {
      HERO_HEADER: 0,
      CATEGORY_CIRCLES: 0,
      PRODUCT_CAROUSEL: 0,
      EDITORIAL_RICH_BLOCK: 0,
      VENDOR_CAROUSEL: 0,
      CAMPAIGN_GRID: 0,
      LATEST_ARTICLES_SHOWCASE: 0,
    })
  }, [form.blocks])

  const categoryNameById = useMemo(() => {
    const categories = flattenCategoryOptions(referenceCategories)
    return new Map(
      categories.map((category) => [readText(category, ['id'], ''), readText(category, ['name', 'title'], 'بدون نام')]),
    )
  }, [referenceCategories])

  const categoryOptions = useMemo(() => flattenCategoryOptions(referenceCategories), [referenceCategories])

  const storeNameById = useMemo(() => {
    return new Map(
      referenceStores.map((store) => [readText(store, ['id'], ''), readText(store, ['name', 'title'], 'بدون نام')]),
    )
  }, [referenceStores])

  const productTypeNameById = useMemo(() => {
    return new Map(
      referenceProductTypes.map((productType) => [readText(productType, ['id'], ''), readText(productType, ['name', 'title'], 'بدون نام')]),
    )
  }, [referenceProductTypes])

  function updateForm<K extends keyof PageForm>(key: K, value: PageForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function toggleSection(sectionKey: BuilderPanelKey) {
    setSectionOpen((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }))
  }

  function toggleBlockOpen(blockId: string) {
    setBlockOpenById((current) => ({
      ...current,
      [blockId]: !current[blockId],
    }))
  }

  function updateBlock(blockId: string, updater: (block: BlockForm) => BlockForm) {
    setForm((current) => ({
      ...current,
      blocks: current.blocks.map((block) => (block.id === blockId ? updater(block) : block)),
    }))
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    setForm((current) => {
      const index = current.blocks.findIndex((block) => block.id === blockId)
      if (index === -1) return current

      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.blocks.length) return current

      const nextBlocks = [...current.blocks]
      const [item] = nextBlocks.splice(index, 1)
      nextBlocks.splice(nextIndex, 0, item)

      return {
        ...current,
        blocks: nextBlocks,
      }
    })
  }

  function addBlock(type: PageBlockType) {
    setForm((current) => ({
      ...current,
      blocks: [...current.blocks, createBlock(type)],
    }))
  }

  function removeBlock(blockId: string) {
    setForm((current) => ({
      ...current,
      blocks: current.blocks.filter((block) => block.id !== blockId),
    }))
  }

  function changeBlockType(blockId: string, type: PageBlockType) {
    updateBlock(blockId, (block) => ({
      ...block,
      type,
      loadingMode: getDefaultLoadingMode(type),
      data: getDefaultBlockData(type),
    }))
  }

  function patchBlockData(blockId: string, key: string, value: unknown) {
    updateBlock(blockId, (block) => ({
      ...block,
      data: {
        ...block.data,
        [key]: value,
      },
    }))
  }

  function patchCampaignBanner(blockId: string, index: number, key: string, value: unknown) {
    updateBlock(blockId, (block) => {
      const currentBanners = Array.isArray(block.data.banners) ? [...(block.data.banners as Array<Record<string, unknown>>)] : []
      const currentBanner = currentBanners[index] ?? { imageUrl: '', link: '', colSpan: 1 }

      currentBanners[index] = {
        ...currentBanner,
        [key]: value,
      }

      return {
        ...block,
        data: {
          ...block.data,
          banners: currentBanners,
        },
      }
    })
  }

  function addCampaignBanner(blockId: string) {
    updateBlock(blockId, (block) => ({
      ...block,
      data: {
        ...block.data,
        banners: [
          ...(Array.isArray(block.data.banners) ? (block.data.banners as Array<Record<string, unknown>>) : []),
          { imageUrl: '', link: '', colSpan: 1 },
        ],
      },
    }))
  }

  function openImagePicker(target: string) {
    setUploadingImageTarget(target)
    imageInputRef.current?.click()
  }

  function getImagePreview(url: unknown) {
    return typeof url === 'string' && url.trim().length > 0 ? url : ''
  }

  function renderSelectionPreview(block: BlockForm) {
    if (block.type === 'CATEGORY_CIRCLES') {
      const categoryIds = normalizeIdList(block.data.categoryIds)

      return (
        <div className="page-builder-preview-card page-builder-field--wide">
          <strong>پیش‌نمایش انتخاب دسته‌ها</strong>
          {categoryIds.length ? (
            <div className="page-builder-preview-tags">
              {categoryIds.map((id) => (
                <span className="page-builder-preview-tag" key={id}>
                  {categoryNameById.get(id) ?? `دسته با شناسه ${id}`}
                </span>
              ))}
            </div>
          ) : (
            <p>هنوز دسته‌ای انتخاب نشده است.</p>
          )}
        </div>
      )
    }

    if (block.type === 'PRODUCT_CAROUSEL') {
      const previewState = productPreviewByBlock[block.id] ?? { items: [] }
      const previewProducts = previewState.items
      const filterType = String(block.data.filterType ?? 'category')
      const filterValue = String(block.data.filterValue ?? '').trim()
      const resolvedLabel =
        filterType === 'category'
          ? categoryNameById.get(filterValue)
          : filterType === 'productType'
            ? productTypeNameById.get(filterValue)
            : undefined

      return (
        <div className="page-builder-preview-card page-builder-field--wide">
          <strong>پیش‌نمایش نتیجه کروسل محصولات</strong>
          <p>
            فیلتر فعلی: <span>{filterType}</span>
            {resolvedLabel ? ` - ${resolvedLabel}` : filterValue ? ` - ${filterValue}` : ''}
          </p>
          {previewState.error ? <p>خطای پیش‌نمایش: {previewState.error}</p> : null}
          {previewProducts.length ? (
            <div className="page-builder-preview-list">
              {previewProducts.map((product) => (
                <article className="page-builder-preview-item" key={readText(product, ['id'], readText(product, ['slug'], 'item'))}>
                  <strong>{readText(product, ['name'], 'بدون نام')}</strong>
                  <span>{readText(product, ['slug'], 'بدون اسلاگ')}</span>
                  <small>{readText(product, ['publicationStatus'], '—')} / {product.isPurchasable === true ? 'قابل خرید' : 'غیرقابل خرید'}</small>
                </article>
              ))}
            </div>
          ) : (
            <p>هیچ محصول eligible برای این فیلتر پیدا نشد. فقط محصولات `PUBLISHED` و `isPurchasable=true` نمایش داده می‌شوند.</p>
          )}
        </div>
      )
    }

    if (block.type === 'VENDOR_CAROUSEL') {
      const filterType = String(block.data.filterType ?? 'top_rated')
      const vendorIds = normalizeIdList(block.data.vendorIds)

      return (
        <div className="page-builder-preview-card page-builder-field--wide">
          <strong>پیش‌نمایش انتخاب فروشگاه‌ها</strong>
          {filterType === 'handpicked' && vendorIds.length ? (
            <div className="page-builder-preview-tags">
              {vendorIds.map((id) => (
                <span className="page-builder-preview-tag" key={id}>
                  {storeNameById.get(id) ?? `فروشگاه با شناسه ${id}`}
                </span>
              ))}
            </div>
          ) : (
            <p>{filterType === 'handpicked' ? 'هنوز فروشگاهی انتخاب نشده است.' : 'این بلوک بر اساس فیلتر پویا رندر می‌شود.'}</p>
          )}
        </div>
      )
    }

    return null
  }

  function setPageImageField(field: 'ogImage', value: string) {
    updateForm(field, value)
  }

  function patchHeaderMenuItem(index: number, key: 'label' | 'href' | 'textColor' | 'backgroundColor', value: string) {
    setForm((current) => ({
      ...current,
      headerMenuItems: current.headerMenuItems.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }))
  }

  function patchHeaderMenuItemFlag(index: number, key: 'highlighted', value: boolean) {
    setForm((current) => ({
      ...current,
      headerMenuItems: current.headerMenuItems.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }))
  }

  function addHeaderMenuItem() {
    setForm((current) => ({
      ...current,
      headerMenuItems: [...current.headerMenuItems, { label: '', href: '', highlighted: false, textColor: '', backgroundColor: '' }],
    }))
  }

  function removeHeaderMenuItem(index: number) {
    setForm((current) => ({
      ...current,
      headerMenuItems: current.headerMenuItems.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  function patchFooterLinkColumn(index: number, patch: Partial<FooterLinkColumnForm>) {
    setForm((current) => ({
      ...current,
      footerLinkColumns: current.footerLinkColumns.map((column, columnIndex) => (columnIndex === index ? { ...column, ...patch } : column)),
    }))
  }

  function patchFooterLinkItem(columnIndex: number, itemIndex: number, patch: Partial<FooterLinkItemForm>) {
    setForm((current) => ({
      ...current,
      footerLinkColumns: current.footerLinkColumns.map((column, currentColumnIndex) =>
        currentColumnIndex === columnIndex
          ? {
              ...column,
              items: column.items.map((item, currentItemIndex) => (currentItemIndex === itemIndex ? { ...item, ...patch } : item)),
            }
          : column,
      ),
    }))
  }

  function addFooterLinkItem(columnIndex: number) {
    setForm((current) => ({
      ...current,
      footerLinkColumns: current.footerLinkColumns.map((column, currentColumnIndex) =>
        currentColumnIndex === columnIndex ? { ...column, items: [...column.items, createFooterLinkItem()] } : column,
      ),
    }))
  }

  function removeFooterLinkItem(columnIndex: number, itemIndex: number) {
    setForm((current) => ({
      ...current,
      footerLinkColumns: current.footerLinkColumns.map((column, currentColumnIndex) =>
        currentColumnIndex === columnIndex ? { ...column, items: column.items.filter((_, index) => index !== itemIndex) } : column,
      ),
    }))
  }

  function patchFooterBadge(index: number, patch: Partial<FooterBadgeForm>) {
    setForm((current) => ({
      ...current,
      footerBadges: current.footerBadges.map((badge, badgeIndex) => (badgeIndex === index ? { ...badge, ...patch } : badge)),
    }))
  }

  function addFooterBadge() {
    setForm((current) => ({
      ...current,
      footerBadges: [...current.footerBadges, createFooterBadge()],
    }))
  }

  function removeFooterBadge(index: number) {
    setForm((current) => ({
      ...current,
      footerBadges: current.footerBadges.filter((_, badgeIndex) => badgeIndex !== index),
    }))
  }

  function patchFooterSocial(index: number, patch: Partial<FooterSocialForm>) {
    setForm((current) => ({
      ...current,
      footerSocials: current.footerSocials.map((social, socialIndex) => (socialIndex === index ? { ...social, ...patch } : social)),
    }))
  }

  function addFooterSocial() {
    setForm((current) => ({
      ...current,
      footerSocials: [...current.footerSocials, createFooterSocial()],
    }))
  }

  function removeFooterSocial(index: number) {
    setForm((current) => ({
      ...current,
      footerSocials: current.footerSocials.filter((_, socialIndex) => socialIndex !== index),
    }))
  }

  async function handleImageChoose(fileList: FileList | null) {
    const file = fileList?.[0]
    const target = uploadingImageTarget
    if (!file || !target) return

    setError(null)

    try {
      const uploaded = await adminApi.uploadProductImage(session, file)

      if (target === 'page:ogImage') {
        setPageImageField('ogImage', uploaded.url)
        return
      }

      if (target === 'page:headerLogoImageUrl') {
        updateForm('headerLogoImageUrl', uploaded.url)
        return
      }

      if (target === 'page:footerBrandLogoImageUrl') {
        updateForm('footerBrandLogoImageUrl', uploaded.url)
        return
      }

      if (target.startsWith('page:footerBadge:')) {
        const badgeIndex = Number(target.split(':')[2])
        if (Number.isInteger(badgeIndex)) {
          patchFooterBadge(badgeIndex, { imageUrl: uploaded.url })
        }
        return
      }

      if (target.startsWith('page:footerSocial:')) {
        const socialIndex = Number(target.split(':')[2])
        if (Number.isInteger(socialIndex)) {
          patchFooterSocial(socialIndex, { imageUrl: uploaded.url })
        }
        return
      }

      if (target.startsWith('block:')) {
        const parts = target.split(':')
        const blockId = parts[1]

        if (parts[2] === 'banner') {
          const bannerIndex = Number(parts[3])
          const field = parts[4]
          if (field === 'imageUrl' && Number.isInteger(bannerIndex)) {
            patchCampaignBanner(blockId, bannerIndex, 'imageUrl', uploaded.url)
          }
          return
        }

        const field = parts[2]
        if (field === 'imageUrl' || field === 'mobileImageUrl') {
          patchBlockData(blockId, field, uploaded.url)
        }
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'آپلود تصویر ناموفق بود')
    } finally {
      setUploadingImageTarget(null)
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
    }
  }

  function removeCampaignBanner(blockId: string, index: number) {
    updateBlock(blockId, (block) => ({
      ...block,
      data: {
        ...block.data,
        banners: (Array.isArray(block.data.banners) ? (block.data.banners as Array<Record<string, unknown>>) : []).filter((_, itemIndex) => itemIndex !== index),
      },
    }))
  }

  function buildPayload() {
    return {
      title: form.title.trim(),
      slug: form.slug.trim() || '/',
      pageType: form.pageType,
      isActive: form.isActive,
      cacheEnabled: form.cacheEnabled,
      headerConfig: {
        enabled: form.headerEnabled,
        transparentOnTop: form.headerTransparentOnTop,
        stickyVariant: form.headerStickyVariant,
        brandLabel: toOptionalText(form.headerBrandLabel) ?? 'گلینو',
        brandHref: toOptionalText(form.headerBrandHref) ?? '/',
        logoImageUrl: toOptionalText(form.headerLogoImageUrl),
        textColor: toOptionalText(form.headerTextColor),
        mutedTextColor: toOptionalText(form.headerMutedTextColor),
        glassBackgroundColor: toOptionalText(form.headerGlassBackgroundColor),
        glassBorderColor: toOptionalText(form.headerGlassBorderColor),
        actionBackgroundColor: toOptionalText(form.headerActionBackgroundColor),
        actionTextColor: toOptionalText(form.headerActionTextColor),
        authPreviewMode: form.headerAuthPreviewMode,
        authPreviewName: form.headerAuthPreviewMode === 'authenticated' ? toOptionalText(form.headerAuthPreviewName) : undefined,
        menuItems: form.headerMenuItems
          .map((item) => ({
            label: item.label.trim(),
            href: item.href.trim(),
            highlighted: item.highlighted,
            textColor: toOptionalText(item.textColor),
            backgroundColor: toOptionalText(item.backgroundColor),
          }))
          .filter((item) => item.label.length > 0 && item.href.length > 0),
      },
      footerConfig: {
        enabled: form.footerEnabled,
        backgroundColor: toOptionalText(form.footerBackgroundColor),
        textColor: toOptionalText(form.footerTextColor),
        mutedTextColor: toOptionalText(form.footerMutedTextColor),
        accentColor: toOptionalText(form.footerAccentColor),
        borderColor: toOptionalText(form.footerBorderColor),
        brandEnabled: form.footerBrandEnabled,
        brandWidthPercent: Number(form.footerBrandWidthPercent) || 34,
        brandLogoImageUrl: toOptionalText(form.footerBrandLogoImageUrl),
        brandLogoHref: toOptionalText(form.footerBrandLogoHref),
        brandDescription: toOptionalText(form.footerBrandDescription),
        linksEnabled: form.footerLinksEnabled,
        linksWidthPercent: Number(form.footerLinksWidthPercent) || 36,
        linkColumns: form.footerLinkColumns
          .map((column) => ({
            enabled: column.enabled,
            title: toOptionalText(column.title),
            items: column.items
              .map((item) => ({
                label: item.label.trim(),
                href: item.href.trim(),
              }))
              .filter((item) => item.label.length > 0 && item.href.length > 0),
          }))
          .filter((column) => column.enabled || (column.title ?? '').length > 0 || column.items.length > 0),
        trustEnabled: form.footerTrustEnabled,
        trustWidthPercent: Number(form.footerTrustWidthPercent) || 30,
        trustTitle: toOptionalText(form.footerTrustTitle),
        badges: form.footerBadges
          .map((badge) => ({
            enabled: badge.enabled,
            title: toOptionalText(badge.title),
            imageUrl: toOptionalText(badge.imageUrl),
            href: toOptionalText(badge.href),
          }))
          .filter((badge) => badge.imageUrl),
        socials: form.footerSocials
          .map((social) => ({
            enabled: social.enabled,
            label: social.label.trim(),
            imageUrl: toOptionalText(social.imageUrl),
            href: social.href.trim(),
          }))
          .filter((social) => social.label.length > 0 && social.href.length > 0 && social.imageUrl),
        legalEnabled: form.footerLegalEnabled,
        legalText: toOptionalText(form.footerLegalText),
      },
      metaTitle: toOptionalText(form.metaTitle),
      metaDescription: toOptionalText(form.metaDescription),
      keywords: parseCsv(form.keywords),
      ogImage: toOptionalText(form.ogImage),
      canonicalUrl: toOptionalText(form.canonicalUrl),
      noIndex: form.noIndex,
      blocks: form.blocks.map((block) => {
        if (block.type === 'CATEGORY_CIRCLES') {
          return {
            ...block,
            loadingMode: 'eager',
            data: {
              categoryIds: normalizeIdList(block.data.categoryIds),
              showTitles: block.data.showTitles !== false,
            },
          }
        }

        if (block.type === 'PRODUCT_CAROUSEL') {
          const filterType = String(block.data.filterType ?? 'category') as ProductFilterType
          const rawValue = String(block.data.filterValue ?? '')
          return {
            ...block,
            loadingMode: block.loadingMode,
            data: {
              title: String(block.data.title ?? '').trim(),
              filterType,
              filterValue: filterType === 'custom_list' ? parseCsv(rawValue) : rawValue.trim(),
              sortBy: String(block.data.sortBy ?? 'newest') as ProductSortBy,
              limit: Number(block.data.limit ?? 8) || 8,
            },
          }
        }

        if (block.type === 'VENDOR_CAROUSEL') {
          const filterType = String(block.data.filterType ?? 'top_rated') as VendorFilterType
          return {
            ...block,
            loadingMode: block.loadingMode,
            data: {
              title: String(block.data.title ?? '').trim(),
              filterType,
              ...(filterType === 'handpicked'
                ? {
                    vendorIds: normalizeIdList(block.data.vendorIds),
                  }
                : {}),
            },
          }
        }

        if (block.type === 'EDITORIAL_RICH_BLOCK') {
          return {
            ...block,
            loadingMode: block.loadingMode,
            data: {
              title: String(block.data.title ?? '').trim(),
              description: String(block.data.description ?? '').trim(),
              imageUrl: String(block.data.imageUrl ?? '').trim(),
              imagePosition: String(block.data.imagePosition ?? 'right'),
              buttonText: toOptionalText(String(block.data.buttonText ?? '')),
              buttonLink: toOptionalText(String(block.data.buttonLink ?? '')),
              backgroundColor: toOptionalText(String(block.data.backgroundColor ?? '')),
              descriptionColor: toOptionalText(String(block.data.descriptionColor ?? '')),
              imageWidthPercent: Number(block.data.imageWidthPercent ?? 25) || 25,
            },
          }
        }

        if (block.type === 'CAMPAIGN_GRID') {
          return {
            ...block,
            loadingMode: block.loadingMode,
            data: {
              title: toOptionalText(String(block.data.title ?? '')),
              backgroundColor: toOptionalText(String(block.data.backgroundColor ?? '')),
              banners: (Array.isArray(block.data.banners) ? block.data.banners : []).map((banner) => {
                const current = typeof banner === 'object' && banner !== null ? (banner as Record<string, unknown>) : {}
                return {
                  imageUrl: String(current.imageUrl ?? '').trim(),
                  link: String(current.link ?? '').trim(),
                  colSpan: Number(current.colSpan ?? 1) || 1,
                }
              }),
            },
          }
        }

        if (block.type === 'LATEST_ARTICLES_SHOWCASE') {
          return {
            ...block,
            loadingMode: block.loadingMode,
            data: {
              title: toOptionalText(String(block.data.title ?? '')),
              subtitle: toOptionalText(String(block.data.subtitle ?? '')),
              limit: Number(block.data.limit ?? 5) || 5,
              articleBasePath: toOptionalText(String(block.data.articleBasePath ?? '/mag/articles')) ?? '/mag/articles',
              ctaText: toOptionalText(String(block.data.ctaText ?? '')),
              ctaLink: toOptionalText(String(block.data.ctaLink ?? '')),
            },
          }
        }

        return {
          ...block,
          loadingMode: block.type === 'HERO_HEADER' ? 'eager' : block.loadingMode,
          data: Object.fromEntries(
            Object.entries(block.data).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
          ),
        }
      }),
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const payload = buildPayload()
      const response =
        editorMode === 'edit' && currentPageId
          ? await adminApi.updateStorefrontPage(session, currentPageId, payload)
          : await adminApi.createStorefrontPage(session, payload)

      const responseId = readText(response as unknown as Record<string, unknown>, ['id'], currentPageId ?? '')
      setCurrentPageId(responseId || currentPageId)
      setEditorMode('edit')
      setForm(mapApiPageToForm(response as unknown as Record<string, unknown>))
      setMessage(editorMode === 'edit' ? 'تغییرات صفحه ذخیره شد.' : 'صفحه جدید ساخته شد و آماده ویرایش بیشتر است.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ذخیره صفحه انجام نشد')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fm-stack page-builder-workspace">
      <SectionCard
        eyebrow="editor workspace"
        title={editorMode === 'edit' ? 'میزکار ویرایش صفحه storefront' : 'ساخت صفحه جدید storefront'}
        description="ساختار صفحه، سئو، ترتیب بلاک‌ها و وضعیت انتشار همگی از همین workspace مدیریت می‌شوند."
        actions={
          <div className="page-builder-workspace__actions">
            <button className="fm-button fm-button--ghost" onClick={onBack} type="button">
              بازگشت به فهرست
            </button>
            <button className="fm-button fm-button--primary" disabled={submitting} onClick={() => void handleSubmit()} type="button">
              {submitting ? 'در حال ذخیره...' : editorMode === 'edit' ? 'ذخیره تغییرات' : 'ساخت صفحه'}
            </button>
          </div>
        }
      >
        <div className="page-builder-workspace__pills">
          <Pill>{form.pageType}</Pill>
          <Pill tone={form.isActive ? 'success' : 'warning'}>{form.isActive ? 'منتشرشده' : 'غیرفعال'}</Pill>
          <Pill>{`${form.blocks.length} بلاک`}</Pill>
          {currentPageId ? <Pill>{currentPageId}</Pill> : null}
        </div>
      </SectionCard>

      <LoadableState error={error} loading={loading}>
        <input
          ref={imageInputRef}
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          className="admin-products-file-input"
          onChange={(event) => void handleImageChoose(event.target.files)}
          type="file"
        />
        <CollapsibleSectionCard
          eyebrow="page settings"
          description="title، slug، نوع صفحه و وضعیت انتشار را از این بخش مدیریت کن."
          onToggle={() => toggleSection('pageSettings')}
          open={sectionOpen.pageSettings}
          title="تنظیمات پایه صفحه"
        >
          <div className="fm-grid page-builder-form-grid">
            <label className="fm-field">
              <span>عنوان صفحه</span>
              <input onChange={(event) => updateForm('title', event.target.value)} type="text" value={form.title} />
            </label>
            <label className="fm-field">
              <span>slug</span>
              <input onChange={(event) => updateForm('slug', event.target.value)} type="text" value={form.slug} />
            </label>
            <label className="fm-field">
              <span>نوع صفحه</span>
              <select onChange={(event) => updateForm('pageType', event.target.value as StorefrontPageType)} value={form.pageType}>
                <option value="HOME">HOME</option>
                <option value="LANDING">LANDING</option>
                <option value="CAMPAIGN">CAMPAIGN</option>
                <option value="STATIC">STATIC</option>
              </select>
            </label>
            <label className="fm-field page-builder-checkbox">
              <span>وضعیت انتشار</span>
              <input checked={form.isActive} onChange={(event) => updateForm('isActive', event.target.checked)} type="checkbox" />
            </label>
            <label className="fm-field page-builder-checkbox">
              <span>فعال بودن کش storefront</span>
              <input checked={form.cacheEnabled} onChange={(event) => updateForm('cacheEnabled', event.target.checked)} type="checkbox" />
            </label>
          </div>
        </CollapsibleSectionCard>

        <CollapsibleSectionCard
          eyebrow="header controls"
          description="هدر شفاف روی هیرو، حالت استیکی شیشه‌ای و آیتم‌های منو را از اینجا کنترل کن."
          onToggle={() => toggleSection('header')}
          open={sectionOpen.header}
          title="تنظیمات هدر storefront"
        >
          <div className="fm-grid page-builder-form-grid">
            <label className="fm-field page-builder-checkbox">
              <span>فعال بودن هدر</span>
              <input checked={form.headerEnabled} onChange={(event) => updateForm('headerEnabled', event.target.checked)} type="checkbox" />
            </label>
            <label className="fm-field page-builder-checkbox">
              <span>شفاف بودن در ابتدای صفحه</span>
              <input checked={form.headerTransparentOnTop} onChange={(event) => updateForm('headerTransparentOnTop', event.target.checked)} type="checkbox" />
            </label>
            <label className="fm-field">
              <span>حالت sticky</span>
              <select onChange={(event) => updateForm('headerStickyVariant', event.target.value as 'full' | 'floating')} value={form.headerStickyVariant}>
                <option value="floating">floating / کرو و وسط</option>
                <option value="full">full width</option>
              </select>
            </label>
            <label className="fm-field">
              <span>عنوان برند</span>
              <input onChange={(event) => updateForm('headerBrandLabel', event.target.value)} type="text" value={form.headerBrandLabel} />
            </label>
            <label className="fm-field">
              <span>لینک برند</span>
              <input onChange={(event) => updateForm('headerBrandHref', event.target.value)} type="text" value={form.headerBrandHref} />
            </label>
            <label className="fm-field">
              <span>لوگوی برند (URL)</span>
              <input onChange={(event) => updateForm('headerLogoImageUrl', event.target.value)} type="text" value={form.headerLogoImageUrl} />
            </label>
            <div className="admin-products-upload-card">
              <div className="admin-products-upload-actions">
                <button className="content-secondary-action" disabled={uploadingImageTarget === 'page:headerLogoImageUrl'} onClick={() => openImagePicker('page:headerLogoImageUrl')} type="button">
                  {uploadingImageTarget === 'page:headerLogoImageUrl' ? 'در حال آپلود...' : 'انتخاب لوگو'}
                </button>
                <span className="admin-products-upload-hint">می‌توانی لوگوی هدر را همین‌جا آپلود کنی.</span>
              </div>
              {getImagePreview(form.headerLogoImageUrl) ? (
                <div className="admin-products-image-preview">
                  <img alt="Preview header logo" src={form.headerLogoImageUrl} />
                </div>
              ) : null}
            </div>
            <ColorField label="رنگ متن اصلی" onChange={(value) => updateForm('headerTextColor', value)} value={form.headerTextColor} />
            <ColorField label="رنگ متن فرعی" onChange={(value) => updateForm('headerMutedTextColor', value)} value={form.headerMutedTextColor} />
            <ColorField hint="برای rgba همچنان می‌توانی مقدار را دستی وارد کنی." label="رنگ پس‌زمینه glass" onChange={(value) => updateForm('headerGlassBackgroundColor', value)} pickerFallback="#f5efe4" value={form.headerGlassBackgroundColor} />
            <ColorField hint="برای شفافیت، rgba دستی هم پشتیبانی می‌شود." label="رنگ border glass" onChange={(value) => updateForm('headerGlassBorderColor', value)} pickerFallback="#ffffff" value={form.headerGlassBorderColor} />
            <ColorField label="رنگ پس‌زمینه اکشن‌ها" onChange={(value) => updateForm('headerActionBackgroundColor', value)} value={form.headerActionBackgroundColor} />
            <ColorField label="رنگ متن اکشن‌ها" onChange={(value) => updateForm('headerActionTextColor', value)} pickerFallback="#ffffff" value={form.headerActionTextColor} />
            <label className="fm-field">
              <span>پیش‌نمایش وضعیت کاربر</span>
              <select onChange={(event) => updateForm('headerAuthPreviewMode', event.target.value as 'guest' | 'authenticated')} value={form.headerAuthPreviewMode}>
                <option value="guest">guest</option>
                <option value="authenticated">authenticated</option>
              </select>
            </label>
            {form.headerAuthPreviewMode === 'authenticated' ? (
              <label className="fm-field">
                <span>نام کاربر در پیش‌نمایش</span>
                <input onChange={(event) => updateForm('headerAuthPreviewName', event.target.value)} type="text" value={form.headerAuthPreviewName} />
              </label>
            ) : null}
            <div className="page-builder-banner-editor page-builder-field--wide">
              <div className="page-builder-banner-editor__header">
                <strong>آیتم‌های منو</strong>
                <button className="fm-button fm-button--ghost" onClick={() => addHeaderMenuItem()} type="button">
                  افزودن آیتم منو
                </button>
              </div>
              <div className="page-builder-banner-list">
                {form.headerMenuItems.map((item, itemIndex) => (
                  <div className="page-builder-banner-card" key={`header-item-${itemIndex}`}>
                    <label className="fm-field">
                      <span>عنوان</span>
                      <input onChange={(event) => patchHeaderMenuItem(itemIndex, 'label', event.target.value)} type="text" value={item.label} />
                    </label>
                    <label className="fm-field">
                      <span>لینک</span>
                      <input onChange={(event) => patchHeaderMenuItem(itemIndex, 'href', event.target.value)} type="text" value={item.href} />
                    </label>
                    <label className="fm-field page-builder-checkbox">
                      <span>هایلایت شود</span>
                      <input checked={item.highlighted} onChange={(event) => patchHeaderMenuItemFlag(itemIndex, 'highlighted', event.target.checked)} type="checkbox" />
                    </label>
                    <ColorField label="رنگ متن آیتم" onChange={(value) => patchHeaderMenuItem(itemIndex, 'textColor', value)} value={item.textColor} />
                    <ColorField label="رنگ پس‌زمینه آیتم" onChange={(value) => patchHeaderMenuItem(itemIndex, 'backgroundColor', value)} value={item.backgroundColor} />
                    <button className="fm-button fm-button--secondary" onClick={() => removeHeaderMenuItem(itemIndex)} type="button">
                      حذف آیتم
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleSectionCard>

        <CollapsibleSectionCard
          eyebrow="seo controls"
          description="متا، canonical و robots behavior صفحه را از اینجا تنظیم کن."
          onToggle={() => toggleSection('seo')}
          open={sectionOpen.seo}
          title="سئو و متادیتا"
        >
          <div className="fm-grid page-builder-form-grid">
            <label className="fm-field">
              <span>Meta title</span>
              <input onChange={(event) => updateForm('metaTitle', event.target.value)} type="text" value={form.metaTitle} />
            </label>
            <label className="fm-field">
              <span>OG image</span>
              <input onChange={(event) => updateForm('ogImage', event.target.value)} type="text" value={form.ogImage} />
            </label>
            <div className="admin-products-upload-card">
              <div className="admin-products-upload-actions">
                <button className="content-secondary-action" disabled={uploadingImageTarget === 'page:ogImage'} onClick={() => openImagePicker('page:ogImage')} type="button">
                  {uploadingImageTarget === 'page:ogImage' ? 'در حال آپلود...' : 'انتخاب تصویر OG'}
                </button>
                <span className="admin-products-upload-hint">می‌توانی فایل را همین‌جا آپلود کنی یا URL را دستی وارد کنی.</span>
              </div>
              {getImagePreview(form.ogImage) ? (
                <div className="admin-products-image-preview">
                  <img alt="Preview OG image" src={form.ogImage} />
                </div>
              ) : null}
            </div>
            <label className="fm-field page-builder-field--wide">
              <span>Meta description</span>
              <textarea onChange={(event) => updateForm('metaDescription', event.target.value)} rows={4} value={form.metaDescription} />
            </label>
            <label className="fm-field page-builder-field--wide">
              <span>Canonical URL</span>
              <input onChange={(event) => updateForm('canonicalUrl', event.target.value)} type="text" value={form.canonicalUrl} />
            </label>
            <label className="fm-field page-builder-field--wide">
              <span>Keywords</span>
              <input onChange={(event) => updateForm('keywords', event.target.value)} type="text" value={form.keywords} />
              <small>کلمات را با comma از هم جدا کن.</small>
            </label>
            <label className="fm-field page-builder-checkbox">
              <span>No index</span>
              <input checked={form.noIndex} onChange={(event) => updateForm('noIndex', event.target.checked)} type="checkbox" />
            </label>
          </div>
        </CollapsibleSectionCard>

        <CollapsibleSectionCard
          eyebrow="footer controls"
          description="فوتر مینیمال و حرفه‌ای را از اینجا با ستون‌های لینک، بخش مجوزها، سوشال و متن پایانی کنترل کن."
          onToggle={() => toggleSection('footer')}
          open={sectionOpen.footer}
          title="تنظیمات فوتر storefront"
        >
          <div className="fm-grid page-builder-form-grid">
            <label className="fm-field page-builder-checkbox">
              <span>فعال بودن فوتر</span>
              <input checked={form.footerEnabled} onChange={(event) => updateForm('footerEnabled', event.target.checked)} type="checkbox" />
            </label>
            <ColorField label="رنگ پس‌زمینه" onChange={(value) => updateForm('footerBackgroundColor', value)} pickerFallback="#173126" value={form.footerBackgroundColor} />
            <ColorField label="رنگ متن" onChange={(value) => updateForm('footerTextColor', value)} pickerFallback="#f5efe4" value={form.footerTextColor} />
            <ColorField label="رنگ متن فرعی" onChange={(value) => updateForm('footerMutedTextColor', value)} pickerFallback="#d8c9b4" value={form.footerMutedTextColor} />
            <ColorField label="رنگ تاکیدی" onChange={(value) => updateForm('footerAccentColor', value)} pickerFallback="#2a5d49" value={form.footerAccentColor} />
            <ColorField hint="برای rgba می‌توانی دستی هم مقدار بدهی." label="رنگ border" onChange={(value) => updateForm('footerBorderColor', value)} pickerFallback="#ffffff" value={form.footerBorderColor} />

            <div className="page-builder-banner-editor page-builder-field--wide">
              <div className="page-builder-banner-editor__header">
                <strong>بخش برند</strong>
              </div>
              <div className="fm-grid page-builder-form-grid">
                <label className="fm-field page-builder-checkbox">
                  <span>فعال</span>
                  <input checked={form.footerBrandEnabled} onChange={(event) => updateForm('footerBrandEnabled', event.target.checked)} type="checkbox" />
                </label>
                <label className="fm-field">
                  <span>درصد عرض</span>
                  <input max={60} min={15} onChange={(event) => updateForm('footerBrandWidthPercent', event.target.value)} type="number" value={form.footerBrandWidthPercent} />
                </label>
                <label className="fm-field">
                  <span>لینک لوگو</span>
                  <input onChange={(event) => updateForm('footerBrandLogoHref', event.target.value)} type="text" value={form.footerBrandLogoHref} />
                </label>
                <label className="fm-field page-builder-field--wide">
                  <span>لوگوی برند (URL)</span>
                  <input onChange={(event) => updateForm('footerBrandLogoImageUrl', event.target.value)} type="text" value={form.footerBrandLogoImageUrl} />
                </label>
                <div className="admin-products-upload-card page-builder-field--wide">
                  <div className="admin-products-upload-actions">
                    <button className="content-secondary-action" disabled={uploadingImageTarget === 'page:footerBrandLogoImageUrl'} onClick={() => openImagePicker('page:footerBrandLogoImageUrl')} type="button">
                      {uploadingImageTarget === 'page:footerBrandLogoImageUrl' ? 'در حال آپلود...' : 'انتخاب لوگوی فوتر'}
                    </button>
                  </div>
                  {getImagePreview(form.footerBrandLogoImageUrl) ? (
                    <div className="admin-products-image-preview">
                      <img alt="Preview footer logo" src={form.footerBrandLogoImageUrl} />
                    </div>
                  ) : null}
                </div>
                <label className="fm-field page-builder-field--wide">
                  <span>توضیح کوتاه برند</span>
                  <textarea onChange={(event) => updateForm('footerBrandDescription', event.target.value)} rows={4} value={form.footerBrandDescription} />
                </label>
              </div>
            </div>

            <div className="page-builder-banner-editor page-builder-field--wide">
              <div className="page-builder-banner-editor__header">
                <strong>ستون‌های لینک</strong>
              </div>
              <div className="fm-grid page-builder-form-grid">
                <label className="fm-field page-builder-checkbox">
                  <span>فعال</span>
                  <input checked={form.footerLinksEnabled} onChange={(event) => updateForm('footerLinksEnabled', event.target.checked)} type="checkbox" />
                </label>
                <label className="fm-field">
                  <span>درصد عرض</span>
                  <input max={60} min={15} onChange={(event) => updateForm('footerLinksWidthPercent', event.target.value)} type="number" value={form.footerLinksWidthPercent} />
                </label>
              </div>
              <div className="page-builder-banner-list">
                {form.footerLinkColumns.map((column, columnIndex) => (
                  <div className="page-builder-banner-card" key={`footer-column-${columnIndex}`}>
                    <label className="fm-field page-builder-checkbox">
                      <span>فعال</span>
                      <input checked={column.enabled} onChange={(event) => patchFooterLinkColumn(columnIndex, { enabled: event.target.checked })} type="checkbox" />
                    </label>
                    <label className="fm-field">
                      <span>عنوان ستون</span>
                      <input onChange={(event) => patchFooterLinkColumn(columnIndex, { title: event.target.value })} type="text" value={column.title} />
                    </label>
                    <div className="page-builder-field--wide">
                      <div className="page-builder-banner-editor__header">
                        <strong>لینک‌ها</strong>
                        <button className="fm-button fm-button--ghost" onClick={() => addFooterLinkItem(columnIndex)} type="button">
                          افزودن لینک
                        </button>
                      </div>
                      <div className="page-builder-banner-list">
                        {column.items.map((item, itemIndex) => (
                          <div className="page-builder-banner-card" key={`footer-link-${columnIndex}-${itemIndex}`}>
                            <label className="fm-field">
                              <span>عنوان</span>
                              <input onChange={(event) => patchFooterLinkItem(columnIndex, itemIndex, { label: event.target.value })} type="text" value={item.label} />
                            </label>
                            <label className="fm-field">
                              <span>لینک</span>
                              <input onChange={(event) => patchFooterLinkItem(columnIndex, itemIndex, { href: event.target.value })} type="text" value={item.href} />
                            </label>
                            <button className="fm-button fm-button--secondary" onClick={() => removeFooterLinkItem(columnIndex, itemIndex)} type="button">
                              حذف لینک
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="page-builder-banner-editor page-builder-field--wide">
              <div className="page-builder-banner-editor__header">
                <strong>مجوزها و شبکه‌های اجتماعی</strong>
              </div>
              <div className="fm-grid page-builder-form-grid">
                <label className="fm-field page-builder-checkbox">
                  <span>فعال</span>
                  <input checked={form.footerTrustEnabled} onChange={(event) => updateForm('footerTrustEnabled', event.target.checked)} type="checkbox" />
                </label>
                <label className="fm-field">
                  <span>درصد عرض</span>
                  <input max={60} min={15} onChange={(event) => updateForm('footerTrustWidthPercent', event.target.value)} type="number" value={form.footerTrustWidthPercent} />
                </label>
                <label className="fm-field">
                  <span>عنوان بخش</span>
                  <input onChange={(event) => updateForm('footerTrustTitle', event.target.value)} type="text" value={form.footerTrustTitle} />
                </label>
              </div>

              <div className="page-builder-banner-editor__header">
                <strong>مجوزها</strong>
                <button className="fm-button fm-button--ghost" onClick={() => addFooterBadge()} type="button">
                  افزودن مجوز
                </button>
              </div>
              <div className="page-builder-banner-list">
                {form.footerBadges.map((badge, badgeIndex) => (
                  <div className="page-builder-banner-card" key={`footer-badge-${badgeIndex}`}>
                    <label className="fm-field page-builder-checkbox">
                      <span>فعال</span>
                      <input checked={badge.enabled} onChange={(event) => patchFooterBadge(badgeIndex, { enabled: event.target.checked })} type="checkbox" />
                    </label>
                    <label className="fm-field">
                      <span>عنوان</span>
                      <input onChange={(event) => patchFooterBadge(badgeIndex, { title: event.target.value })} type="text" value={badge.title} />
                    </label>
                    <label className="fm-field">
                      <span>لینک</span>
                      <input onChange={(event) => patchFooterBadge(badgeIndex, { href: event.target.value })} type="text" value={badge.href} />
                    </label>
                    <label className="fm-field page-builder-field--wide">
                      <span>تصویر (URL)</span>
                      <input onChange={(event) => patchFooterBadge(badgeIndex, { imageUrl: event.target.value })} type="text" value={badge.imageUrl} />
                    </label>
                    <div className="admin-products-upload-card page-builder-field--wide">
                      <div className="admin-products-upload-actions">
                        <button className="content-secondary-action" disabled={uploadingImageTarget === `page:footerBadge:${badgeIndex}`} onClick={() => openImagePicker(`page:footerBadge:${badgeIndex}`)} type="button">
                          {uploadingImageTarget === `page:footerBadge:${badgeIndex}` ? 'در حال آپلود...' : 'آپلود تصویر مجوز'}
                        </button>
                      </div>
                      {getImagePreview(badge.imageUrl) ? (
                        <div className="admin-products-image-preview">
                          <img alt={`Preview badge ${badgeIndex + 1}`} src={badge.imageUrl} />
                        </div>
                      ) : null}
                    </div>
                    <button className="fm-button fm-button--secondary" onClick={() => removeFooterBadge(badgeIndex)} type="button">
                      حذف مجوز
                    </button>
                  </div>
                ))}
              </div>

              <div className="page-builder-banner-editor__header">
                <strong>شبکه‌های اجتماعی</strong>
                <button className="fm-button fm-button--ghost" onClick={() => addFooterSocial()} type="button">
                  افزودن شبکه اجتماعی
                </button>
              </div>
              <div className="page-builder-banner-list">
                {form.footerSocials.map((social, socialIndex) => (
                  <div className="page-builder-banner-card" key={`footer-social-${socialIndex}`}>
                    <label className="fm-field page-builder-checkbox">
                      <span>فعال</span>
                      <input checked={social.enabled} onChange={(event) => patchFooterSocial(socialIndex, { enabled: event.target.checked })} type="checkbox" />
                    </label>
                    <label className="fm-field">
                      <span>نام</span>
                      <input onChange={(event) => patchFooterSocial(socialIndex, { label: event.target.value })} type="text" value={social.label} />
                    </label>
                    <label className="fm-field">
                      <span>لینک</span>
                      <input onChange={(event) => patchFooterSocial(socialIndex, { href: event.target.value })} type="text" value={social.href} />
                    </label>
                    <label className="fm-field page-builder-field--wide">
                      <span>آیکون (URL)</span>
                      <input onChange={(event) => patchFooterSocial(socialIndex, { imageUrl: event.target.value })} type="text" value={social.imageUrl} />
                    </label>
                    <div className="admin-products-upload-card page-builder-field--wide">
                      <div className="admin-products-upload-actions">
                        <button className="content-secondary-action" disabled={uploadingImageTarget === `page:footerSocial:${socialIndex}`} onClick={() => openImagePicker(`page:footerSocial:${socialIndex}`)} type="button">
                          {uploadingImageTarget === `page:footerSocial:${socialIndex}` ? 'در حال آپلود...' : 'آپلود آیکون شبکه'}
                        </button>
                      </div>
                      {getImagePreview(social.imageUrl) ? (
                        <div className="admin-products-image-preview">
                          <img alt={`Preview social ${socialIndex + 1}`} src={social.imageUrl} />
                        </div>
                      ) : null}
                    </div>
                    <button className="fm-button fm-button--secondary" onClick={() => removeFooterSocial(socialIndex)} type="button">
                      حذف شبکه
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="page-builder-banner-editor page-builder-field--wide">
              <div className="page-builder-banner-editor__header">
                <strong>متن پایانی</strong>
              </div>
              <div className="fm-grid page-builder-form-grid">
                <label className="fm-field page-builder-checkbox">
                  <span>فعال</span>
                  <input checked={form.footerLegalEnabled} onChange={(event) => updateForm('footerLegalEnabled', event.target.checked)} type="checkbox" />
                </label>
                <label className="fm-field page-builder-field--wide">
                  <span>متن کپی‌رایت</span>
                  <input onChange={(event) => updateForm('footerLegalText', event.target.value)} type="text" value={form.footerLegalText} />
                  <small>سال جاری به‌صورت خودکار به انتهای این متن اضافه می‌شود.</small>
                </label>
              </div>
            </div>
          </div>
        </CollapsibleSectionCard>

        <CollapsibleSectionCard
          eyebrow="block manager"
          description="ترتیب هر بلاک همان ترتیب نمایش در storefront است. می‌توانی بلاک اضافه، حذف یا جابه‌جا کنی."
          onToggle={() => toggleSection('blocks')}
          open={sectionOpen.blocks}
          title="چیدمان و محتوای بلاک‌ها"
          actions={
            <div className="page-builder-add-actions">
              {(['HERO_HEADER', 'CATEGORY_CIRCLES', 'PRODUCT_CAROUSEL', 'EDITORIAL_RICH_BLOCK', 'VENDOR_CAROUSEL', 'CAMPAIGN_GRID', 'LATEST_ARTICLES_SHOWCASE'] as PageBlockType[]).map((type) => (
                <button className="fm-button fm-button--ghost" key={type} onClick={() => addBlock(type)} type="button">
                  {getBlockLabel(type)}
                </button>
              ))}
            </div>
          }
        >
          <div className="page-builder-summary-grid">
            {Object.entries(blockSummary).map(([type, count]) => (
              <div className="page-builder-summary-item" key={type}>
                <strong>{count}</strong>
                <span>{getBlockLabel(type as PageBlockType)}</span>
              </div>
            ))}
          </div>

          <div className="page-builder-blocks">
            {form.blocks.map((block, index) => {
              const data = block.data
              const campaignBanners = Array.isArray(data.banners) ? (data.banners as Array<Record<string, unknown>>) : []

              return (
                <article className="page-builder-block-card" key={block.id}>
                  <div className="page-builder-block-card__header">
                    <div>
                      <p className="page-builder-card__eyebrow">block #{index + 1}</p>
                      <h3>{getBlockLabel(block.type)}</h3>
                      <p className="page-builder-card__slug">{block.id}</p>
                    </div>
                    <div className="page-builder-block-card__actions">
                      <button className="fm-button fm-button--ghost" onClick={() => toggleBlockOpen(block.id)} type="button">
                        {blockOpenById[block.id] ? 'جمع' : 'باز'}
                      </button>
                      <button className="fm-button fm-button--ghost" onClick={() => moveBlock(block.id, -1)} type="button">
                        بالا
                      </button>
                      <button className="fm-button fm-button--ghost" onClick={() => moveBlock(block.id, 1)} type="button">
                        پایین
                      </button>
                      <button className="fm-button fm-button--secondary" onClick={() => removeBlock(block.id)} type="button">
                        حذف
                      </button>
                    </div>
                  </div>

                  {blockOpenById[block.id] ? (
                  <div className="fm-grid page-builder-form-grid">
                    <label className="fm-field">
                      <span>نوع بلاک</span>
                      <select onChange={(event) => changeBlockType(block.id, event.target.value as PageBlockType)} value={block.type}>
                        <option value="HERO_HEADER">HERO_HEADER</option>
                        <option value="CATEGORY_CIRCLES">CATEGORY_CIRCLES</option>
                        <option value="PRODUCT_CAROUSEL">PRODUCT_CAROUSEL</option>
                        <option value="EDITORIAL_RICH_BLOCK">EDITORIAL_RICH_BLOCK</option>
                        <option value="VENDOR_CAROUSEL">VENDOR_CAROUSEL</option>
                        <option value="CAMPAIGN_GRID">CAMPAIGN_GRID</option>
                        <option value="LATEST_ARTICLES_SHOWCASE">LATEST_ARTICLES_SHOWCASE</option>
                      </select>
                    </label>
                    <label className="fm-field">
                      <span>حالت بارگذاری</span>
                      <select
                        disabled={block.type === 'HERO_HEADER' || block.type === 'CATEGORY_CIRCLES'}
                        onChange={(event) => updateBlock(block.id, (current) => ({ ...current, loadingMode: event.target.value as BlockLoadingMode }))}
                        value={block.type === 'HERO_HEADER' || block.type === 'CATEGORY_CIRCLES' ? 'eager' : block.loadingMode}
                      >
                        <option value="eager">eager / فوری</option>
                        <option value="lazy">lazy / با تأخیر</option>
                        <option value="viewport">viewport / نزدیک دید کاربر</option>
                      </select>
                      <small>
                        {block.type === 'HERO_HEADER' || block.type === 'CATEGORY_CIRCLES'
                          ? 'برای این بلاک، برای حفظ نمای اولیه، حالت همیشه eager است.'
                          : 'برای بلوک‌های پایین صفحه معمولاً viewport انتخاب بهتری است.'}
                      </small>
                    </label>

                    {block.type === 'HERO_HEADER' ? (
                      <>
                        <label className="fm-field">
                          <span>Title</span>
                          <input onChange={(event) => patchBlockData(block.id, 'title', event.target.value)} type="text" value={String(data.title ?? '')} />
                        </label>
                        <label className="fm-field">
                          <span>Subtitle</span>
                          <input onChange={(event) => patchBlockData(block.id, 'subtitle', event.target.value)} type="text" value={String(data.subtitle ?? '')} />
                        </label>
                        <label className="fm-field page-builder-field--wide">
                          <span>Image URL</span>
                          <input onChange={(event) => patchBlockData(block.id, 'imageUrl', event.target.value)} type="text" value={String(data.imageUrl ?? '')} />
                        </label>
                        <div className="admin-products-upload-card page-builder-field--wide">
                          <div className="admin-products-upload-actions">
                            <button className="content-secondary-action" disabled={uploadingImageTarget === `block:${block.id}:imageUrl`} onClick={() => openImagePicker(`block:${block.id}:imageUrl`)} type="button">
                              {uploadingImageTarget === `block:${block.id}:imageUrl` ? 'در حال آپلود...' : 'انتخاب تصویر هیرو'}
                            </button>
                          </div>
                          {getImagePreview(data.imageUrl) ? (
                            <div className="admin-products-image-preview">
                              <img alt="Preview hero image" src={String(data.imageUrl)} />
                            </div>
                          ) : null}
                        </div>
                        <label className="fm-field">
                          <span>Mobile image</span>
                          <input onChange={(event) => patchBlockData(block.id, 'mobileImageUrl', event.target.value)} type="text" value={String(data.mobileImageUrl ?? '')} />
                        </label>
                        <div className="admin-products-upload-card page-builder-field--wide">
                          <div className="admin-products-upload-actions">
                            <button className="content-secondary-action" disabled={uploadingImageTarget === `block:${block.id}:mobileImageUrl`} onClick={() => openImagePicker(`block:${block.id}:mobileImageUrl`)} type="button">
                              {uploadingImageTarget === `block:${block.id}:mobileImageUrl` ? 'در حال آپلود...' : 'انتخاب تصویر موبایل'}
                            </button>
                          </div>
                          {getImagePreview(data.mobileImageUrl) ? (
                            <div className="admin-products-image-preview">
                              <img alt="Preview hero mobile image" src={String(data.mobileImageUrl)} />
                            </div>
                          ) : null}
                        </div>
                        <label className="fm-field">
                          <span>CTA text</span>
                          <input onChange={(event) => patchBlockData(block.id, 'ctaText', event.target.value)} type="text" value={String(data.ctaText ?? '')} />
                        </label>
                        <label className="fm-field">
                          <span>CTA link</span>
                          <input onChange={(event) => patchBlockData(block.id, 'ctaLink', event.target.value)} type="text" value={String(data.ctaLink ?? '')} />
                        </label>
                        <ColorField label="Text color" onChange={(value) => patchBlockData(block.id, 'textColor', value)} pickerFallback="#fff8ef" value={String(data.textColor ?? '')} />
                        <label className="fm-field page-builder-checkbox">
                          <span>تمام‌عرض</span>
                          <input checked={data.fullWidth !== false} onChange={(event) => patchBlockData(block.id, 'fullWidth', event.target.checked)} type="checkbox" />
                        </label>
                        <label className="fm-field page-builder-checkbox">
                          <span>چسبیده به بالای صفحه</span>
                          <input checked={data.flushTop !== false} onChange={(event) => patchBlockData(block.id, 'flushTop', event.target.checked)} type="checkbox" />
                        </label>
                        <label className="fm-field">
                          <span>ارتفاع (vh)</span>
                          <input onChange={(event) => patchBlockData(block.id, 'minHeightVh', Number(event.target.value))} type="number" value={String(data.minHeightVh ?? 92)} />
                        </label>
                        <label className="fm-field">
                          <span>Opacity overlay</span>
                          <input onChange={(event) => patchBlockData(block.id, 'overlayOpacity', Number(event.target.value))} step="0.05" min="0" max="1" type="number" value={String(data.overlayOpacity ?? 0.42)} />
                        </label>
                        <label className="fm-field">
                          <span>تراز محتوا</span>
                          <select onChange={(event) => patchBlockData(block.id, 'contentAlign', event.target.value)} value={String(data.contentAlign ?? 'start')}>
                            <option value="start">start</option>
                            <option value="center">center</option>
                          </select>
                        </label>
                        <label className="fm-field">
                          <span>حالت تصویر</span>
                          <select onChange={(event) => patchBlockData(block.id, 'imageFit', event.target.value)} value={String(data.imageFit ?? 'cover')}>
                            <option value="cover">cover</option>
                            <option value="contain">contain</option>
                          </select>
                        </label>
                        <label className="fm-field">
                          <span>جایگاه تصویر</span>
                          <select onChange={(event) => patchBlockData(block.id, 'imagePosition', event.target.value)} value={String(data.imagePosition ?? 'center')}>
                            <option value="center">center</option>
                            <option value="top">top</option>
                            <option value="bottom">bottom</option>
                          </select>
                        </label>
                      </>
                    ) : null}

                    {block.type === 'CATEGORY_CIRCLES' ? (
                      <>
                        <label className="fm-field page-builder-field--wide">
                          <span>Category IDs</span>
                          <input
                            onChange={(event) => patchBlockData(block.id, 'categoryIds', event.target.value)}
                            type="text"
                            value={Array.isArray(data.categoryIds) ? (data.categoryIds as string[]).join(', ') : String(data.categoryIds ?? '')}
                          />
                          <small>به صورت comma-separated مثل `1, 2, 9`</small>
                        </label>
                        <label className="fm-field page-builder-field--wide">
                          <span>انتخاب از لیست دسته‌ها</span>
                          <select
                            multiple
                            onChange={(event) =>
                              patchBlockData(
                                block.id,
                                'categoryIds',
                                Array.from(event.target.selectedOptions).map((option) => option.value),
                              )
                            }
                            value={normalizeIdList(data.categoryIds)}
                          >
                            {categoryOptions.map((category) => {
                              const categoryId = readText(category, ['id'], '')
                              const categoryName = readText(category, ['name', 'title'], 'بدون نام')
                              const prefix = category.depth > 0 ? `${'-- '.repeat(category.depth)}` : ''

                              return (
                                <option key={categoryId} value={categoryId}>
                                  {`${prefix}${categoryName}`}
                                </option>
                              )
                            })}
                          </select>
                          <small>برای انتخاب چند دسته، `Ctrl/Cmd` را نگه دار.</small>
                        </label>
                        <label className="fm-field page-builder-checkbox">
                          <span>نمایش عنوان دسته‌ها</span>
                          <input checked={data.showTitles !== false} onChange={(event) => patchBlockData(block.id, 'showTitles', event.target.checked)} type="checkbox" />
                        </label>
                        {renderSelectionPreview(block)}
                      </>
                    ) : null}

                    {block.type === 'PRODUCT_CAROUSEL' ? (
                      <>
                        <label className="fm-field">
                          <span>Title</span>
                          <input onChange={(event) => patchBlockData(block.id, 'title', event.target.value)} type="text" value={String(data.title ?? '')} />
                        </label>
                        <label className="fm-field">
                          <span>Filter type</span>
                          <select onChange={(event) => patchBlockData(block.id, 'filterType', event.target.value)} value={String(data.filterType ?? 'category')}>
                            <option value="category">category</option>
                            <option value="tag">tag</option>
                            <option value="productType">productType</option>
                            <option value="custom_list">custom_list</option>
                          </select>
                        </label>
                        {String(data.filterType ?? 'category') === 'category' ? (
                          <label className="fm-field">
                            <span>Category</span>
                            <select onChange={(event) => patchBlockData(block.id, 'filterValue', event.target.value)} value={String(data.filterValue ?? '')}>
                              <option value="">انتخاب دسته</option>
                              {categoryOptions.map((category) => {
                                const categoryId = readText(category, ['id'], '')
                                const categoryName = readText(category, ['name', 'title'], 'بدون نام')
                                const prefix = category.depth > 0 ? `${'-- '.repeat(category.depth)}` : ''

                                return (
                                  <option key={categoryId} value={categoryId}>
                                    {`${prefix}${categoryName}`}
                                  </option>
                                )
                              })}
                            </select>
                          </label>
                        ) : null}
                        {String(data.filterType ?? 'category') === 'productType' ? (
                          <label className="fm-field">
                            <span>Product type</span>
                            <select onChange={(event) => patchBlockData(block.id, 'filterValue', event.target.value)} value={String(data.filterValue ?? '')}>
                              <option value="">انتخاب نوع محصول</option>
                              {referenceProductTypes.map((productType) => (
                                <option key={readText(productType, ['id'], '')} value={readText(productType, ['id'], '')}>
                                  {readText(productType, ['name', 'title'], 'بدون نام')}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        {String(data.filterType ?? 'category') === 'tag' || String(data.filterType ?? 'category') === 'custom_list' ? (
                          <label className="fm-field">
                            <span>Filter value</span>
                            <input onChange={(event) => patchBlockData(block.id, 'filterValue', event.target.value)} type="text" value={String(data.filterValue ?? '')} />
                          </label>
                        ) : null}
                        <label className="fm-field">
                          <span>Sort by</span>
                          <select onChange={(event) => patchBlockData(block.id, 'sortBy', event.target.value)} value={String(data.sortBy ?? 'newest')}>
                            <option value="newest">newest</option>
                            <option value="most_sold">most_sold</option>
                            <option value="instant_delivery">instant_delivery</option>
                          </select>
                        </label>
                        <label className="fm-field">
                          <span>Limit</span>
                          <input onChange={(event) => patchBlockData(block.id, 'limit', Number(event.target.value))} type="number" value={String(data.limit ?? 8)} />
                        </label>
                        {renderSelectionPreview(block)}
                      </>
                    ) : null}

                    {block.type === 'EDITORIAL_RICH_BLOCK' ? (
                      <>
                        <label className="fm-field">
                          <span>Title</span>
                          <input onChange={(event) => patchBlockData(block.id, 'title', event.target.value)} type="text" value={String(data.title ?? '')} />
                        </label>
                        <label className="fm-field">
                          <span>Image position</span>
                          <select onChange={(event) => patchBlockData(block.id, 'imagePosition', event.target.value)} value={String(data.imagePosition ?? 'right')}>
                            <option value="right">right</option>
                            <option value="left">left</option>
                          </select>
                        </label>
                        <label className="fm-field">
                          <span>درصد فضای تصویر</span>
                          <input
                            max={45}
                            min={15}
                            onChange={(event) => patchBlockData(block.id, 'imageWidthPercent', Number(event.target.value))}
                            type="number"
                            value={String(data.imageWidthPercent ?? 25)}
                          />
                          <small>مثلاً 25 یعنی 25٪ برای تصویر و 75٪ برای متن.</small>
                        </label>
                        <label className="fm-field page-builder-field--wide">
                          <span>Description</span>
                          <textarea onChange={(event) => patchBlockData(block.id, 'description', event.target.value)} rows={5} value={String(data.description ?? '')} />
                        </label>
                        <label className="fm-field page-builder-field--wide">
                          <span>Image URL</span>
                          <input onChange={(event) => patchBlockData(block.id, 'imageUrl', event.target.value)} type="text" value={String(data.imageUrl ?? '')} />
                        </label>
                        <div className="admin-products-upload-card page-builder-field--wide">
                          <div className="admin-products-upload-actions">
                            <button className="content-secondary-action" disabled={uploadingImageTarget === `block:${block.id}:imageUrl`} onClick={() => openImagePicker(`block:${block.id}:imageUrl`)} type="button">
                              {uploadingImageTarget === `block:${block.id}:imageUrl` ? 'در حال آپلود...' : 'انتخاب تصویر ادیتوریال'}
                            </button>
                          </div>
                          {getImagePreview(data.imageUrl) ? (
                            <div className="admin-products-image-preview">
                              <img alt="Preview editorial image" src={String(data.imageUrl)} />
                            </div>
                          ) : null}
                        </div>
                        <label className="fm-field">
                          <span>Button text</span>
                          <input onChange={(event) => patchBlockData(block.id, 'buttonText', event.target.value)} type="text" value={String(data.buttonText ?? '')} />
                        </label>
                        <label className="fm-field">
                          <span>Button link</span>
                          <input onChange={(event) => patchBlockData(block.id, 'buttonLink', event.target.value)} type="text" value={String(data.buttonLink ?? '')} />
                        </label>
                        <ColorField label="Background color" onChange={(value) => patchBlockData(block.id, 'backgroundColor', value)} pickerFallback="#efe4d3" value={String(data.backgroundColor ?? '')} />
                        <ColorField label="Description color" onChange={(value) => patchBlockData(block.id, 'descriptionColor', value)} pickerFallback="#355045" value={String(data.descriptionColor ?? '')} />
                      </>
                    ) : null}

                    {block.type === 'VENDOR_CAROUSEL' ? (
                      <>
                        <label className="fm-field">
                          <span>Title</span>
                          <input onChange={(event) => patchBlockData(block.id, 'title', event.target.value)} type="text" value={String(data.title ?? '')} />
                        </label>
                        <label className="fm-field">
                          <span>Filter type</span>
                          <select onChange={(event) => patchBlockData(block.id, 'filterType', event.target.value)} value={String(data.filterType ?? 'top_rated')}>
                            <option value="top_rated">top_rated</option>
                            <option value="nearest_to_user">nearest_to_user</option>
                            <option value="handpicked">handpicked</option>
                          </select>
                        </label>
                        <label className="fm-field page-builder-field--wide">
                          <span>Vendor IDs</span>
                          <input
                            onChange={(event) => patchBlockData(block.id, 'vendorIds', event.target.value)}
                            type="text"
                            value={Array.isArray(data.vendorIds) ? (data.vendorIds as string[]).join(', ') : String(data.vendorIds ?? '')}
                          />
                        </label>
                        {renderSelectionPreview(block)}
                      </>
                    ) : null}

                    {block.type === 'CAMPAIGN_GRID' ? (
                      <>
                        <label className="fm-field">
                          <span>Title</span>
                          <input onChange={(event) => patchBlockData(block.id, 'title', event.target.value)} type="text" value={String(data.title ?? '')} />
                        </label>
                        <ColorField label="Background color" onChange={(value) => patchBlockData(block.id, 'backgroundColor', value)} pickerFallback="#f2e7d8" value={String(data.backgroundColor ?? '')} />

                        <div className="page-builder-banner-editor page-builder-field--wide">
                          <div className="page-builder-banner-editor__header">
                            <strong>بنرهای گرید</strong>
                            <button className="fm-button fm-button--ghost" onClick={() => addCampaignBanner(block.id)} type="button">
                              افزودن بنر
                            </button>
                          </div>
                          <div className="page-builder-banner-list">
                            {campaignBanners.map((banner, bannerIndex) => (
                              <div className="page-builder-banner-card" key={`${block.id}-banner-${bannerIndex}`}>
                                <label className="fm-field">
                                  <span>Image URL</span>
                                  <input
                                    onChange={(event) => patchCampaignBanner(block.id, bannerIndex, 'imageUrl', event.target.value)}
                                    type="text"
                                    value={String(banner.imageUrl ?? '')}
                                  />
                                </label>
                                <div className="admin-products-upload-card page-builder-field--wide">
                                  <div className="admin-products-upload-actions">
                                    <button
                                      className="content-secondary-action"
                                      disabled={uploadingImageTarget === `block:${block.id}:banner:${bannerIndex}:imageUrl`}
                                      onClick={() => openImagePicker(`block:${block.id}:banner:${bannerIndex}:imageUrl`)}
                                      type="button"
                                    >
                                      {uploadingImageTarget === `block:${block.id}:banner:${bannerIndex}:imageUrl` ? 'در حال آپلود...' : 'انتخاب تصویر بنر'}
                                    </button>
                                  </div>
                                  {getImagePreview(banner.imageUrl) ? (
                                    <div className="admin-products-image-preview">
                                      <img alt={`Preview banner ${bannerIndex + 1}`} src={String(banner.imageUrl)} />
                                    </div>
                                  ) : null}
                                </div>
                                <label className="fm-field">
                                  <span>Link</span>
                                  <input
                                    onChange={(event) => patchCampaignBanner(block.id, bannerIndex, 'link', event.target.value)}
                                    type="text"
                                    value={String(banner.link ?? '')}
                                  />
                                </label>
                                <label className="fm-field">
                                  <span>colSpan</span>
                                  <select
                                    onChange={(event) => patchCampaignBanner(block.id, bannerIndex, 'colSpan', Number(event.target.value))}
                                    value={String(banner.colSpan ?? 1)}
                                  >
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                  </select>
                                </label>
                                <button className="fm-button fm-button--secondary" onClick={() => removeCampaignBanner(block.id, bannerIndex)} type="button">
                                  حذف بنر
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : null}

                    {block.type === 'LATEST_ARTICLES_SHOWCASE' ? (
                      <>
                        <label className="fm-field">
                          <span>عنوان بلوک</span>
                          <input onChange={(event) => patchBlockData(block.id, 'title', event.target.value)} type="text" value={String(data.title ?? '')} />
                        </label>
                        <label className="fm-field">
                          <span>تعداد مقاله‌ها</span>
                          <input onChange={(event) => patchBlockData(block.id, 'limit', Number(event.target.value))} type="number" value={String(data.limit ?? 5)} />
                        </label>
                        <label className="fm-field page-builder-field--wide">
                          <span>زیرعنوان</span>
                          <textarea onChange={(event) => patchBlockData(block.id, 'subtitle', event.target.value)} rows={3} value={String(data.subtitle ?? '')} />
                        </label>
                        <label className="fm-field">
                          <span>مسیر پایه مقاله</span>
                          <input onChange={(event) => patchBlockData(block.id, 'articleBasePath', event.target.value)} type="text" value={String(data.articleBasePath ?? '/mag/articles')} />
                        </label>
                        <label className="fm-field">
                          <span>متن CTA</span>
                          <input onChange={(event) => patchBlockData(block.id, 'ctaText', event.target.value)} type="text" value={String(data.ctaText ?? '')} />
                        </label>
                        <label className="fm-field">
                          <span>لینک CTA</span>
                          <input onChange={(event) => patchBlockData(block.id, 'ctaLink', event.target.value)} type="text" value={String(data.ctaLink ?? '')} />
                        </label>
                      </>
                    ) : null}
                  </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </CollapsibleSectionCard>
      </LoadableState>
    </div>
  )
}

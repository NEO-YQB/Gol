import { Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useRef, useState } from 'react'
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

type ProductFilterType = 'category' | 'tag' | 'productType' | 'custom_list'
type ProductSortBy = 'newest' | 'most_sold' | 'instant_delivery'
type VendorFilterType = 'top_rated' | 'nearest_to_user' | 'handpicked'

type BlockForm = {
  id: string
  type: PageBlockType
  data: Record<string, unknown>
}

type PreviewRecord = Record<string, unknown>
type CategoryOption = PreviewRecord & { depth: number }
type ProductPreviewState = {
  items: PreviewRecord[]
  error?: string
}

type PageForm = {
  title: string
  slug: string
  pageType: StorefrontPageType
  isActive: boolean
  cacheEnabled: boolean
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
      }
  }
}

function createBlock(type: PageBlockType = 'HERO_HEADER'): BlockForm {
  return {
    id: makeId(),
    type,
    data: getDefaultBlockData(type),
  }
}

function createEmptyForm(): PageForm {
  return {
    title: '',
    slug: '/',
    pageType: 'HOME',
    isActive: false,
    cacheEnabled: false,
    metaTitle: '',
    metaDescription: '',
    keywords: '',
    ogImage: '',
    canonicalUrl: '',
    noIndex: false,
    blocks: [],
  }
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

function mapApiPageToForm(page: Record<string, unknown>): PageForm {
  const blocks = toArray(page.blocks).map((block) => {
    const type = readText(block, ['type'], 'HERO_HEADER') as PageBlockType
    return {
      id: readText(block, ['id'], makeId()),
      type,
      data: typeof block.data === 'object' && block.data !== null ? (block.data as Record<string, unknown>) : getDefaultBlockData(type),
    }
  })

  return {
    title: readText(page, ['title'], ''),
    slug: readText(page, ['slug'], '/'),
    pageType: readText(page, ['pageType'], 'LANDING') as StorefrontPageType,
    isActive: page.isActive === true,
    cacheEnabled: page.cacheEnabled !== false,
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
                      isPurchasable: true,
                      isArchived: false,
                    }
                  : {
                      page: 1,
                      limit,
                      categoryIds,
                      publicationStatus: 'PUBLISHED',
                      isPurchasable: true,
                      isArchived: false,
                    },
              )
              return [block.id, { items: toArray(payload) }] as const
            }

            if (filterType === 'productType') {
              const productTypeId = Number(String(rawFilterValue ?? '').trim())
              if (!Number.isInteger(productTypeId) || productTypeId <= 0) return [block.id, { items: [] }] as const

              const payload = await adminApi.getProducts(session, {
                page: 1,
                limit,
                productTypeId,
                publicationStatus: 'PUBLISHED',
                isPurchasable: true,
                isArchived: false,
              })
              return [block.id, { items: toArray(payload) }] as const
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
                isPurchasable: true,
                isArchived: false,
              })
              return [block.id, { items: toArray(payload) }] as const
            }

            const payload = await adminApi.getProducts(session, {
              page: 1,
              limit,
              search: String(rawFilterValue ?? '').trim(),
              publicationStatus: 'PUBLISHED',
              isPurchasable: true,
              isArchived: false,
            })
            return [block.id, { items: toArray(payload) }] as const
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

        if (block.type === 'CAMPAIGN_GRID') {
          return {
            ...block,
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

        return {
          ...block,
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
        <SectionCard
          eyebrow="page settings"
          title="تنظیمات پایه صفحه"
          description="title، slug، نوع صفحه و وضعیت انتشار را از این بخش مدیریت کن."
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
        </SectionCard>

        <SectionCard
          eyebrow="seo controls"
          title="سئو و متادیتا"
          description="متا، canonical و robots behavior صفحه را از اینجا تنظیم کن."
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
        </SectionCard>

        <SectionCard
          eyebrow="block manager"
          title="چیدمان و محتوای بلاک‌ها"
          description="ترتیب هر بلاک همان ترتیب نمایش در storefront است. می‌توانی بلاک اضافه، حذف یا جابه‌جا کنی."
          actions={
            <div className="page-builder-add-actions">
              {(['HERO_HEADER', 'CATEGORY_CIRCLES', 'PRODUCT_CAROUSEL', 'EDITORIAL_RICH_BLOCK', 'VENDOR_CAROUSEL', 'CAMPAIGN_GRID'] as PageBlockType[]).map((type) => (
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
                      </select>
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
                        <label className="fm-field">
                          <span>Text color</span>
                          <input onChange={(event) => patchBlockData(block.id, 'textColor', event.target.value)} type="text" value={String(data.textColor ?? '')} />
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
                        <label className="fm-field">
                          <span>Background color</span>
                          <input onChange={(event) => patchBlockData(block.id, 'backgroundColor', event.target.value)} type="text" value={String(data.backgroundColor ?? '')} />
                        </label>
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
                        <label className="fm-field">
                          <span>Background color</span>
                          <input onChange={(event) => patchBlockData(block.id, 'backgroundColor', event.target.value)} type="text" value={String(data.backgroundColor ?? '')} />
                        </label>

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
                  </div>
                </article>
              )
            })}
          </div>
        </SectionCard>
      </LoadableState>
    </div>
  )
}

'use client'

import { resolveAssetUrl, type CategorySummary, type ProductSummary, type StoreSummary } from '../lib/storefront'
import { CategoryCircle, ProductCard, StorefrontPill, VendorCard } from './storefrontBlocks'
import { storefrontShared } from './storefrontShared'

export function HeroSection({
  block,
  pageTitle,
  pageType,
  index,
}: {
  block: Record<string, unknown> & { id: string; data: Record<string, unknown> }
  pageTitle: string
  pageType: string
  index: number
}) {
  const imageUrl = resolveAssetUrl(String(block.data.imageUrl ?? ''))
  const mobileImageUrl = resolveAssetUrl(String(block.data.mobileImageUrl ?? ''))
  const textColor = String(block.data.textColor ?? '#fff8ef')
  const fullWidth = block.data.fullWidth !== false
  const flushTop = block.data.flushTop !== false
  const minHeightVh = Math.min(Math.max(Number(block.data.minHeightVh ?? 92) || 92, 10), 140)
  const overlayOpacity = Math.min(Math.max(Number(block.data.overlayOpacity ?? 0.42) || 0.42, 0), 1)
  const contentAlign = String(block.data.contentAlign ?? 'start') === 'center' ? 'center' : 'start'
  const imageFit = String(block.data.imageFit ?? 'cover') === 'contain' ? 'contain' : 'cover'
  const imagePosition = String(block.data.imagePosition ?? 'center')
  const imageObjectPosition = imagePosition === 'top' ? 'top' : imagePosition === 'bottom' ? 'bottom' : 'center'

  return (
    <section
      className={`relative isolate overflow-hidden border border-white/40 shadow-[0_30px_90px_rgba(36,24,6,0.16)] ${
        fullWidth ? 'left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] w-screen max-w-none rounded-none' : 'mb-8 rounded-[40px]'
      } ${flushTop ? `${index === 0 ? 'mt-[-1rem] md:mt-[-1rem]' : ''} ${fullWidth ? 'mb-8' : 'mb-8'}` : 'mb-8 rounded-[40px]'} px-6 py-12 md:px-12 md:py-16`}
      key={block.id}
      style={{ color: textColor, minHeight: `${minHeightVh}vh` }}
    >
      {imageUrl || mobileImageUrl ? (
        <picture className="absolute inset-0 -z-10 block h-full w-full">
          {mobileImageUrl ? <source media="(max-width: 767px)" srcSet={mobileImageUrl} /> : null}
          {imageUrl ? (
            <img
              alt={String(block.data.title ?? pageTitle)}
              className={imageFit === 'contain' ? 'h-full w-full object-contain' : 'h-full w-full object-cover'}
              src={imageUrl}
              style={{ objectPosition: imageObjectPosition }}
            />
          ) : mobileImageUrl ? (
            <img
              alt={String(block.data.title ?? pageTitle)}
              className={imageFit === 'contain' ? 'h-full w-full object-contain' : 'h-full w-full object-cover'}
              src={mobileImageUrl}
              style={{ objectPosition: imageObjectPosition }}
            />
          ) : null}
        </picture>
      ) : (
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,#173126_0%,#294f3d_48%,#d06c54_100%)]" />
      )}
      <div className="absolute inset-0 -z-10" style={{ background: `linear-gradient(110deg, rgba(19,41,31,${Math.min(overlayOpacity + 0.28, 0.95)}), rgba(19,41,31,${Math.max(overlayOpacity - 0.12, 0.12)}))` }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_34%)]" />
      <div className={`relative z-10 flex min-h-[inherit] ${contentAlign === 'center' ? 'items-center justify-center text-center' : 'items-end'}`}>
        <div className={`w-full ${contentAlign === 'center' ? 'max-w-4xl' : 'max-w-3xl'}`}>
          <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.34em] text-white/85">
            {pageType === 'HOME' ? 'homepage signature' : 'campaign spotlight'}
          </p>
          <h1 className="text-4xl font-black leading-[1.15] md:text-6xl">{String(block.data.title ?? pageTitle)}</h1>
          {block.data.subtitle ? (
            <p className={`mt-6 text-base leading-8 text-white/82 md:text-lg ${contentAlign === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>
              {String(block.data.subtitle)}
            </p>
          ) : null}
          {block.data.ctaText && block.data.ctaLink ? (
            <a className="mt-8 inline-flex items-center rounded-full bg-[#fff3e7] px-6 py-3 text-sm font-black text-[#173126] transition hover:bg-white" href={String(block.data.ctaLink)}>
              {String(block.data.ctaText)}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export function CategoryCirclesSection({ block }: { block: { id: string; categories?: CategorySummary[] } }) {
  const categories = Array.isArray(block.categories) ? block.categories : []
  return (
    <section className={storefrontShared.sectionCard} key={block.id}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className={storefrontShared.sectionEyebrow}>category edit</p>
          <h2 className="mt-2 text-2xl font-black text-[#183226]">چیدمان سریع مسیرهای خرید</h2>
        </div>
      </div>
      <div className="flex gap-5 overflow-x-auto pb-2">
        {categories.map((category) => (
          <CategoryCircle category={category} key={category.id} />
        ))}
      </div>
    </section>
  )
}

export function ProductCarouselSection({ block }: { block: { id: string; data: Record<string, unknown>; products?: ProductSummary[] } }) {
  const products = Array.isArray(block.products) ? block.products : []
  return (
    <section className="mb-8" key={block.id}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className={storefrontShared.sectionEyebrow}>live catalog</p>
          <h2 className={storefrontShared.sectionTitle}>{String(block.data.title || 'انتخاب‌های ویژه')}</h2>
        </div>
        <StorefrontPill text={`${products.length} محصول`} />
      </div>
      <div className="flex gap-5 overflow-x-auto pb-2">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}

export function EditorialSection({ block }: { block: { id: string; data: Record<string, unknown> } }) {
  const imageOnLeft = String(block.data.imagePosition ?? 'right') === 'left'
  return (
    <section className={storefrontShared.editorialSection} key={block.id} style={{ background: String(block.data.backgroundColor || '#efe4d3') }}>
      <div className={`${imageOnLeft ? 'md:order-1' : 'md:order-2'} h-full min-h-[320px]`}>
        <img alt={String(block.data.title ?? 'Editorial block')} className="h-full w-full object-cover" src={resolveAssetUrl(String(block.data.imageUrl ?? ''))} />
      </div>
      <div className={`${imageOnLeft ? 'md:order-2' : 'md:order-1'} flex flex-col justify-center px-7 py-10 md:px-10`}>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#926b46]">editorial mood</p>
        <h2 className="mt-3 text-3xl font-black leading-tight text-[#173126]">{String(block.data.title ?? '')}</h2>
        <p className="mt-5 text-base leading-8 text-[#4d5c53]">{String(block.data.description ?? '')}</p>
        {block.data.buttonText && block.data.buttonLink ? (
          <a className="mt-8 inline-flex w-fit items-center rounded-full border border-[#173126]/10 bg-white/70 px-5 py-3 text-sm font-black text-[#173126] transition hover:bg-white" href={String(block.data.buttonLink)}>
            {String(block.data.buttonText)}
          </a>
        ) : null}
      </div>
    </section>
  )
}

export function VendorCarouselSection({ block }: { block: { id: string; data: Record<string, unknown>; vendors?: StoreSummary[] } }) {
  const vendors = Array.isArray(block.vendors) ? block.vendors : []
  return (
    <section className="mb-8" key={block.id}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#9f7e56]">vendor selection</p>
          <h2 className={storefrontShared.sectionTitle}>{String(block.data.title || 'فروشگاه‌های برتر')}</h2>
        </div>
        <StorefrontPill text={`${vendors.length} فروشگاه`} />
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {vendors.map((vendor) => (
          <VendorCard key={vendor.id} vendor={vendor} />
        ))}
      </div>
    </section>
  )
}

export function CampaignGridSection({ block }: { block: { id: string; data: Record<string, unknown> } }) {
  const banners = Array.isArray(block.data.banners) ? (block.data.banners as Array<Record<string, unknown>>) : []
  return (
    <section className={storefrontShared.campaignSection} key={block.id} style={{ background: String(block.data.backgroundColor || '#f2e7d8') }}>
      {block.data.title ? (
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#9f7e56]">campaign grid</p>
          <h2 className={storefrontShared.sectionTitle}>{String(block.data.title)}</h2>
        </div>
      ) : null}
      <div className="grid auto-rows-[180px] grid-cols-1 gap-4 md:grid-cols-3">
        {banners.map((banner, bannerIndex) => (
          <a
            className="group relative overflow-hidden rounded-[30px] shadow-[0_16px_36px_rgba(52,36,17,0.12)]"
            href={String(banner.link ?? '#')}
            key={`${block.id}-${bannerIndex}`}
            style={{
              gridColumn: `span ${Math.min(Math.max(Number(banner.colSpan ?? 1), 1), 3)} / span ${Math.min(Math.max(Number(banner.colSpan ?? 1), 1), 3)}`,
            }}
          >
            <img alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src={resolveAssetUrl(String(banner.imageUrl ?? ''))} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
          </a>
        ))}
      </div>
    </section>
  )
}

'use client'

import dynamic from 'next/dynamic'
import { type EnrichedStorefrontPage } from '../lib/storefront'
import { StorefrontHeader } from './StorefrontHeader'
import { CategoryCirclesSection, HeroSection } from './StorefrontSections'
import { storefrontShared } from './storefrontShared'

const sectionSkeletonClassName = 'mb-8 min-h-[320px] animate-pulse rounded-[40px] bg-[linear-gradient(180deg,rgba(255,252,247,0.82),rgba(245,237,225,0.72))] shadow-[0_18px_50px_rgba(40,29,12,0.06)]'

function DeferredSectionFallback() {
  return <section aria-hidden="true" className={sectionSkeletonClassName} />
}

const ProductCarouselSection = dynamic(
  () => import('./StorefrontSections').then((module) => module.ProductCarouselSection),
  { loading: DeferredSectionFallback },
)

const EditorialSection = dynamic(
  () => import('./StorefrontSections').then((module) => module.EditorialSection),
  { loading: DeferredSectionFallback },
)

const VendorCarouselSection = dynamic(
  () => import('./StorefrontSections').then((module) => module.VendorCarouselSection),
  { loading: DeferredSectionFallback },
)

const CampaignGridSection = dynamic(
  () => import('./StorefrontSections').then((module) => module.CampaignGridSection),
  { loading: DeferredSectionFallback },
)

const LatestArticlesShowcaseSection = dynamic(
  () => import('./StorefrontSections').then((module) => module.LatestArticlesShowcaseSection),
  { loading: DeferredSectionFallback },
)

function indexSignature(page: EnrichedStorefrontPage) {
  const updatedAt = page.updatedAt
    ? new Intl.DateTimeFormat('fa-IR', {
        dateStyle: 'medium',
      }).format(new Date(page.updatedAt))
    : 'نامشخص'

  return `آخرین به‌روزرسانی این صفحه: ${updatedAt}`
}

export function StorefrontPageView({ page }: { page: EnrichedStorefrontPage }) {
  const firstHeroBlock = page.blocks.find((block) => block.type === 'HERO_HEADER')
  const heroTouchesTop = firstHeroBlock ? firstHeroBlock.data.flushTop !== false : false

  return (
    <>
      <StorefrontHeader heroTouchesTop={heroTouchesTop} page={page} />
      <main className={storefrontShared.pageShell}>
        <div className={`${storefrontShared.pageContainer} ${heroTouchesTop ? 'pt-0' : 'pt-4'}`}>
          {page.blocks.map((block, index) => {
            if (block.type === 'HERO_HEADER') {
              return <HeroSection block={block} index={index} pageTitle={page.title} pageType={page.pageType} />
            }

            if (block.type === 'CATEGORY_CIRCLES') {
              return <CategoryCirclesSection block={block} />
            }

            if (block.type === 'PRODUCT_CAROUSEL') {
              return <ProductCarouselSection block={block} />
            }

            if (block.type === 'EDITORIAL_RICH_BLOCK') {
              return <EditorialSection block={block} />
            }

            if (block.type === 'VENDOR_CAROUSEL') {
              return <VendorCarouselSection block={block} />
            }

            if (block.type === 'CAMPAIGN_GRID') {
              return <CampaignGridSection block={block} />
            }

            if (block.type === 'LATEST_ARTICLES_SHOWCASE') {
              return <LatestArticlesShowcaseSection block={block} />
            }

            return null
          })}

          {page.blocks.length === 0 ? (
            <section className={storefrontShared.emptyState}>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#a47c54]">empty builder</p>
              <h2 className="mt-3 text-3xl font-black text-[#173126]">{page.title}</h2>
              <p className="mt-4 text-[#6e6152]">این صفحه هنوز هیچ بلاکی برای نمایش ندارد.</p>
            </section>
          ) : null}

          <footer className={storefrontShared.footer}>{indexSignature(page)}</footer>
        </div>
      </main>
    </>
  )
}

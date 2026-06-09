'use client'

import dynamic from 'next/dynamic'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { type EnrichedStorefrontPage } from '../lib/storefront'
import { StorefrontFooter } from './StorefrontFooter'
import { StorefrontToastHost } from './StorefrontToastHost'
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

type DeferredSectionProps = {
  children: ReactNode
  mode: 'eager' | 'lazy' | 'viewport'
}

function ViewportSection({ children, mode }: DeferredSectionProps) {
  const [isVisible, setIsVisible] = useState(mode !== 'viewport')
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (mode !== 'viewport') {
      setIsVisible(true)
      return
    }

    const element = containerRef.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '240px 0px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [mode])

  return <div ref={containerRef}>{isVisible ? children : <DeferredSectionFallback />}</div>
}

function resolveBlockLoadingMode(block: EnrichedStorefrontPage['blocks'][number]) {
  if (block.type === 'HERO_HEADER' || block.type === 'CATEGORY_CIRCLES') {
    return 'eager'
  }

  return block.loadingMode === 'eager' || block.loadingMode === 'lazy' || block.loadingMode === 'viewport'
    ? block.loadingMode
    : 'viewport'
}

export function StorefrontPageView({ page }: { page: EnrichedStorefrontPage }) {
  const firstHeroBlock = page.blocks.find((block) => block.type === 'HERO_HEADER')
  const heroTouchesTop = firstHeroBlock ? firstHeroBlock.data.flushTop !== false : false

  return (
    <>
      <StorefrontHeader heroTouchesTop={heroTouchesTop} page={page} />
      <main className={storefrontShared.pageShell}>
        <div className={`${storefrontShared.pageContainer} ${heroTouchesTop ? 'pt-0' : 'pt-4'}`}>
          <StorefrontToastHost />
          {page.blocks.map((block, index) => {
            const loadingMode = resolveBlockLoadingMode(block)

            if (block.type === 'HERO_HEADER') {
              return <HeroSection block={block} index={index} key={block.id} pageTitle={page.title} pageType={page.pageType} />
            }

            if (block.type === 'CATEGORY_CIRCLES') {
              return <CategoryCirclesSection block={block} key={block.id} />
            }

            if (block.type === 'PRODUCT_CAROUSEL') {
              return (
                <ViewportSection key={block.id} mode={loadingMode}>
                  <ProductCarouselSection block={block} />
                </ViewportSection>
              )
            }

            if (block.type === 'EDITORIAL_RICH_BLOCK') {
              return (
                <ViewportSection key={block.id} mode={loadingMode}>
                  <EditorialSection block={block} />
                </ViewportSection>
              )
            }

            if (block.type === 'VENDOR_CAROUSEL') {
              return (
                <ViewportSection key={block.id} mode={loadingMode}>
                  <VendorCarouselSection block={block} />
                </ViewportSection>
              )
            }

            if (block.type === 'CAMPAIGN_GRID') {
              return (
                <ViewportSection key={block.id} mode={loadingMode}>
                  <CampaignGridSection block={block} />
                </ViewportSection>
              )
            }

            if (block.type === 'LATEST_ARTICLES_SHOWCASE') {
              return (
                <ViewportSection key={block.id} mode={loadingMode}>
                  <LatestArticlesShowcaseSection block={block} />
                </ViewportSection>
              )
            }

            return null
          })}

          {page.blocks.length === 0 ? (
            <section className={storefrontShared.emptyState}>
              <h2 className="mt-3 text-3xl font-black text-[#173126]">{page.title}</h2>
              <p className="mt-4 text-[#6e6152]">این صفحه هنوز هیچ بلاکی برای نمایش ندارد.</p>
            </section>
          ) : null}

          <StorefrontFooter page={page} />
        </div>
      </main>
    </>
  )
}

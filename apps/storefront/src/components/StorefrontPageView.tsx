'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { resolveAssetUrl, type CategorySummary, type EnrichedStorefrontPage, type ProductSummary, type StoreSummary } from '../lib/storefront'

function formatPrice(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('fa-IR').format(value)
}

function getProductHref(product: ProductSummary) {
  return `/products/${product.slug}`
}

function getCategoryHref(category: Pick<CategorySummary, 'slug'>) {
  return `/categories/${category.slug}`
}

function getVendorHref(vendor: Pick<StoreSummary, 'slug'>) {
  return `/stores/${vendor.slug}`
}

function ProductCard({ product }: { product: ProductSummary }) {
  const price = formatPrice(product.price)
  const discountPrice = formatPrice(product.discountPrice ?? null)
  const productHref = getProductHref(product)
  const vendorHref = product.store?.slug ? getVendorHref(product.store) : null
  const categoryHref = product.category?.slug ? `/categories/${product.category.slug}` : null

  return (
    <article className="group min-w-[240px] rounded-[28px] border border-black/5 bg-white/85 p-4 shadow-[0_20px_50px_rgba(37,24,8,0.08)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(37,24,8,0.12)]">
      <Link className="mb-4 block overflow-hidden rounded-[24px] bg-[#f4eadc]" href={productHref}>
        <img
          alt={product.mainImageAlt || product.name}
          className="h-56 w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          src={resolveAssetUrl(product.mainImage)}
        />
      </Link>
      <div className="space-y-3">
        <div>
          {vendorHref ? (
            <Link className="text-xs uppercase tracking-[0.28em] text-[#9e7b52]" href={vendorHref}>
              {product.store?.name || 'فروشگاه منتخب'}
            </Link>
          ) : (
            <p className="text-xs uppercase tracking-[0.28em] text-[#9e7b52]">{product.store?.name || 'فروشگاه منتخب'}</p>
          )}
          <Link className="mt-2 block text-xl font-black text-[#1e3529]" href={productHref}>
            {product.name}
          </Link>
          {product.category?.name ? (
            categoryHref ? (
              <Link className="mt-2 block text-sm text-[#6d7a72]" href={categoryHref}>
                {product.category.name}
              </Link>
            ) : (
              <p className="mt-2 text-sm text-[#6d7a72]">{product.category.name}</p>
            )
          ) : null}
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1">
            {product.discountPrice ? (
              <div className="text-sm text-[#9c8a75] line-through">{price} تومان</div>
            ) : null}
            <div className="text-lg font-extrabold text-[#d06c54]">
              {product.discountPrice ? `${discountPrice} تومان` : `${price} تومان`}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="inline-flex items-center rounded-full bg-[#1f6a52] px-4 py-2 text-sm font-bold text-white" href={`${productHref}?action=add-to-cart`}>
            افزودن به سبد
          </Link>
          <Link className="inline-flex items-center rounded-full border border-[#1f6a52]/18 px-4 py-2 text-sm font-bold text-[#1f6a52]" href={productHref}>
            مشاهده محصول
          </Link>
        </div>
      </div>
    </article>
  )
}

function CategoryCircle({ category }: { category: CategorySummary }) {
  return (
    <Link className="group flex min-w-[120px] flex-col items-center gap-4 text-center" href={getCategoryHref(category)}>
      <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/70 bg-[#f6eadc] shadow-[0_18px_36px_rgba(52,36,17,0.08)]">
        {category.image ? (
          <img alt={category.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" src={resolveAssetUrl(category.image)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_#f4cab6,_#e6d6bf_72%)] text-3xl">✿</div>
        )}
      </div>
      <span className="text-sm font-bold text-[#214032]">{category.name}</span>
    </Link>
  )
}

function VendorCard({ vendor }: { vendor: StoreSummary }) {
  const rating = Number(vendor.customerRatingAverage ?? 0)
  const ratingLabel = rating > 0 ? rating.toFixed(1) : 'جدید'
  const vendorHref = getVendorHref(vendor)

  return (
    <article className="rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(250,244,234,0.95))] p-5 shadow-[0_20px_40px_rgba(48,33,10,0.08)]">
      <div className="mb-5 flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-[20px] bg-[#efe1d2]">
          {vendor.logo ? (
            <img alt={vendor.name} className="h-full w-full object-cover" src={resolveAssetUrl(vendor.logo)} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">🏬</div>
          )}
        </div>
        <div>
          <Link className="text-lg font-black text-[#1b3228]" href={vendorHref}>
            {vendor.name}
          </Link>
          <p className="mt-1 text-sm text-[#7d6b58]">{vendor.sameDayDelivery ? 'ارسال فوری فعال' : 'ارسال استاندارد'}</p>
        </div>
      </div>
      <div className="mb-5 flex items-center justify-between rounded-[20px] bg-[#f6eee4] px-4 py-3">
        <span className="text-sm text-[#80674a]">رضایت مشتریان</span>
        <strong className="text-lg text-[#d06c54]">{ratingLabel}</strong>
      </div>
      <Link className="inline-flex items-center rounded-full border border-[#1f6a52]/20 px-4 py-2 text-sm font-bold text-[#1f6a52]" href={vendorHref}>
        مشاهده محصولات فروشگاه
      </Link>
    </article>
  )
}

function PillLike({ text }: { text: string }) {
  return (
    <span className="inline-flex rounded-full border border-[#1f6a52]/10 bg-white/70 px-4 py-2 text-sm font-bold text-[#1f6a52]">
      {text}
    </span>
  )
}

function indexSignature(page: EnrichedStorefrontPage) {
  const updatedAt = page.updatedAt
    ? new Intl.DateTimeFormat('fa-IR', {
        dateStyle: 'medium',
      }).format(new Date(page.updatedAt))
    : 'نامشخص'

  return `آخرین به‌روزرسانی این صفحه: ${updatedAt}`
}

function buildHeaderDefaults(page: EnrichedStorefrontPage) {
  const headerConfig = typeof page.headerConfig === 'object' && page.headerConfig !== null ? (page.headerConfig as Record<string, unknown>) : {}
  const menuItems = Array.isArray(headerConfig.menuItems)
    ? headerConfig.menuItems
        .map((item) =>
          typeof item === 'object' && item !== null
            ? {
                label: String((item as Record<string, unknown>).label ?? '').trim(),
                href: String((item as Record<string, unknown>).href ?? '').trim(),
                highlighted: (item as Record<string, unknown>).highlighted === true,
                textColor: String((item as Record<string, unknown>).textColor ?? '').trim(),
                backgroundColor: String((item as Record<string, unknown>).backgroundColor ?? '').trim(),
              }
            : null,
        )
        .filter((item): item is { label: string; href: string; highlighted: boolean; textColor: string; backgroundColor: string } => Boolean(item && item.label && item.href))
    : []

  return {
    enabled: headerConfig.enabled !== false,
    transparentOnTop: headerConfig.transparentOnTop !== false,
    stickyVariant: String(headerConfig.stickyVariant ?? 'floating') === 'full' ? 'full' : 'floating',
    brandLabel: String(headerConfig.brandLabel ?? 'گلینو'),
    brandHref: String(headerConfig.brandHref ?? '/'),
    logoImageUrl: String(headerConfig.logoImageUrl ?? '').trim(),
    textColor: String(headerConfig.textColor ?? '#173126'),
    mutedTextColor: String(headerConfig.mutedTextColor ?? '#6e6152'),
    glassBackgroundColor: String(headerConfig.glassBackgroundColor ?? 'rgba(255,251,245,0.42)'),
    glassBorderColor: String(headerConfig.glassBorderColor ?? 'rgba(255,255,255,0.2)'),
    actionBackgroundColor: String(headerConfig.actionBackgroundColor ?? '#1f6a52'),
    actionTextColor: String(headerConfig.actionTextColor ?? '#ffffff'),
    authPreviewMode: String(headerConfig.authPreviewMode ?? 'guest') === 'authenticated' ? 'authenticated' : 'guest',
    authPreviewName: String(headerConfig.authPreviewName ?? '').trim(),
    menuItems,
  }
}

function CartIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M3.5 4.5h1.6c.5 0 .94.33 1.08.82l.42 1.43m0 0 1.45 5.03c.14.49.58.82 1.09.82h7.92c.5 0 .94-.33 1.08-.82l1.34-4.55a1.13 1.13 0 0 0-1.08-1.45H6.6Zm3.3 11.75a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0Zm8.2 0a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M12 12.25a4.13 4.13 0 1 0 0-8.25 4.13 4.13 0 0 0 0 8.25ZM5 19.25c1.57-2.76 4.14-4.13 7-4.13s5.43 1.37 7 4.13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d={open ? 'M6 6L18 18' : 'M4 7h16'} stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d={open ? 'M18 6L6 18' : 'M4 12h16'} stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      {!open ? <path d="M4 17h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /> : null}
    </svg>
  )
}

function StorefrontGlassHeader({ page, heroTouchesTop }: { page: EnrichedStorefrontPage; heroTouchesTop: boolean }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const header = useMemo(() => buildHeaderDefaults(page), [page])

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 24)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!header.enabled) {
    return null
  }

  const shouldFloat = isScrolled && header.stickyVariant === 'floating'
  const shouldShowGlass = isScrolled || !header.transparentOnTop || !heroTouchesTop
  const textColor = shouldShowGlass ? header.textColor : '#ffffff'
  const mutedTextColor = shouldShowGlass ? header.mutedTextColor : 'rgba(255,255,255,0.82)'
  const shellStyle = shouldShowGlass
    ? {
        background: header.glassBackgroundColor,
        borderColor: header.glassBorderColor,
      }
    : undefined
  const actionStyle = {
    background: header.actionBackgroundColor,
    color: header.actionTextColor,
  }
  const mobilePanelStyle = {
    background: header.glassBackgroundColor,
    borderColor: header.glassBorderColor,
    color: textColor,
  }

  return (
    <header
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-out ${shouldFloat ? 'px-4 pt-4 md:px-8' : 'px-0 pt-0'}`}
    >
      <div
        className={`pointer-events-auto mx-auto flex items-center justify-between gap-4 transition-all duration-500 ease-out ${
          shouldFloat ? 'max-w-[1280px] rounded-[28px] px-5 py-3 md:px-7' : 'max-w-[1440px] px-4 py-5 md:px-8'
        } ${
          shouldShowGlass
            ? 'border border-white/20 bg-[rgba(255,251,245,0.42)] shadow-[0_20px_55px_rgba(24,31,28,0.12)] backdrop-blur-2xl'
            : 'border border-transparent bg-transparent shadow-none backdrop-blur-0'
        }`}
        style={shellStyle}
      >
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-8">
          <Link className={`shrink-0 transition-all duration-500 ${isScrolled ? 'text-sm md:text-base' : 'text-base md:text-lg'}`} href={header.brandHref} style={{ color: textColor }}>
            {header.logoImageUrl ? (
              <img alt={header.brandLabel} className="h-10 w-auto object-contain md:h-11" src={resolveAssetUrl(header.logoImageUrl)} />
            ) : (
              <span className="font-black tracking-[0.14em]">{header.brandLabel}</span>
            )}
          </Link>
          <nav className="hidden min-w-0 flex-wrap items-center gap-2 md:flex md:gap-3">
            {header.menuItems.map((item) => (
              <Link
                className="rounded-full px-4 py-2 text-sm font-bold transition-all duration-300 hover:translate-y-[-1px]"
                href={item.href}
                key={`${item.label}-${item.href}`}
                style={{
                  color: item.textColor || (item.highlighted ? header.actionTextColor : textColor),
                  background: item.backgroundColor || (item.highlighted ? header.actionBackgroundColor : shouldShowGlass ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)'),
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <button
            aria-label="باز کردن منو"
            className="inline-flex items-center justify-center rounded-full border p-3 md:hidden"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            style={{
              color: textColor,
              borderColor: header.glassBorderColor,
              background: shouldShowGlass ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.12)',
            }}
            type="button"
          >
            <MenuIcon open={isMobileMenuOpen} />
          </button>
          <Link
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-[0_14px_30px_rgba(15,32,25,0.14)] transition-all duration-300 hover:translate-y-[-1px]"
            href="/cart"
            style={actionStyle}
          >
            <CartIcon />
            <span className="hidden md:inline">سبد خرید</span>
          </Link>
          {header.authPreviewMode === 'authenticated' ? (
            <div
              className="relative"
              onMouseEnter={() => setIsUserMenuOpen(true)}
              onMouseLeave={() => setIsUserMenuOpen(false)}
            >
              <button
                className="inline-flex items-center gap-3 rounded-full border px-4 py-2 text-right text-sm font-bold shadow-[0_14px_30px_rgba(15,32,25,0.12)] transition-all duration-300"
                style={{
                  color: textColor,
                  background: shouldShowGlass ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)',
                  borderColor: header.glassBorderColor,
                }}
                type="button"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full" style={actionStyle}>
                  <UserIcon />
                </span>
                <span className="hidden leading-5 md:block">
                  <strong className="block" style={{ color: textColor }}>سلام {header.authPreviewName || 'دوست گلینو'}</strong>
                  <span className="block text-xs font-medium" style={{ color: mutedTextColor }}>حساب کاربری</span>
                </span>
              </button>
              {isUserMenuOpen ? (
                <div
                  className="absolute left-0 top-[calc(100%+10px)] min-w-[220px] rounded-[24px] border p-3 shadow-[0_20px_45px_rgba(20,29,25,0.16)] backdrop-blur-2xl"
                  style={{
                    background: header.glassBackgroundColor,
                    borderColor: header.glassBorderColor,
                    color: textColor,
                  }}
                >
                  <div className="grid gap-2">
                    {[
                      { label: 'پنل کاربری', href: '/account' },
                      { label: 'اطلاعات کاربری', href: '/account/profile' },
                      { label: 'کیف پول', href: '/account/wallet' },
                      { label: 'خروج', href: '/logout' },
                    ].map((item) => (
                      <Link
                        className="rounded-2xl px-4 py-3 text-sm font-bold transition-colors hover:bg-white/35"
                        href={item.href}
                        key={item.href}
                        style={{ color: textColor }}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-[0_14px_30px_rgba(15,32,25,0.14)] transition-all duration-300 hover:translate-y-[-1px]"
                href="/login"
                style={actionStyle}
              >
                <UserIcon />
                <span className="hidden md:inline">ورود</span>
              </Link>
              <Link
                className="hidden rounded-full border px-4 py-2 text-sm font-bold md:inline-flex"
                href="/register"
                style={{
                  color: textColor,
                  borderColor: header.glassBorderColor,
                  background: shouldShowGlass ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.12)',
                }}
              >
                ثبت نام
              </Link>
            </div>
          )}
        </div>
      </div>
      <div
        className={`pointer-events-auto mx-4 mt-3 overflow-hidden rounded-[28px] border shadow-[0_20px_45px_rgba(20,29,25,0.16)] backdrop-blur-2xl transition-all duration-300 ease-out md:hidden ${
          isMobileMenuOpen ? 'max-h-[75vh] translate-y-0 opacity-100' : 'max-h-0 -translate-y-2 opacity-0'
        }`}
        style={mobilePanelStyle}
      >
        <div className="grid gap-2 p-4">
          {header.menuItems.map((item) => (
            <Link
              className="rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300"
              href={item.href}
              key={`mobile-${item.label}-${item.href}`}
              style={{
                color: item.textColor || (item.highlighted ? header.actionTextColor : textColor),
                background: item.backgroundColor || (item.highlighted ? header.actionBackgroundColor : 'rgba(255,255,255,0.2)'),
              }}
            >
              {item.label}
            </Link>
          ))}
          {header.authPreviewMode === 'authenticated' ? (
            <>
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: 'rgba(255,255,255,0.18)' }}>
                <strong className="block" style={{ color: textColor }}>سلام {header.authPreviewName || 'دوست گلینو'}</strong>
                <span className="block text-xs" style={{ color: mutedTextColor }}>حساب کاربری</span>
              </div>
              {[
                { label: 'پنل کاربری', href: '/account' },
                { label: 'اطلاعات کاربری', href: '/account/profile' },
                { label: 'کیف پول', href: '/account/wallet' },
                { label: 'خروج', href: '/logout' },
              ].map((item) => (
                <Link className="rounded-2xl px-4 py-3 text-sm font-bold transition-colors hover:bg-white/30" href={item.href} key={`mobile-user-${item.href}`} style={{ color: textColor }}>
                  {item.label}
                </Link>
              ))}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link className="inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold" href="/login" style={actionStyle}>
                ورود
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-bold"
                href="/register"
                style={{
                  color: textColor,
                  borderColor: header.glassBorderColor,
                  background: 'rgba(255,255,255,0.16)',
                }}
              >
                ثبت نام
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export function StorefrontPageView({ page }: { page: EnrichedStorefrontPage }) {
  const firstHeroBlock = page.blocks.find((block) => block.type === 'HERO_HEADER')
  const heroTouchesTop = firstHeroBlock ? firstHeroBlock.data.flushTop !== false : false

  return (
    <>
      <StorefrontGlassHeader heroTouchesTop={heroTouchesTop} page={page} />
      <main className="min-h-screen bg-[#f5efe4] text-[#173126]">
        <div className={`mx-auto max-w-[1440px] px-4 pb-20 md:px-8 ${heroTouchesTop ? 'pt-0' : 'pt-4'}`}>
          {page.blocks.map((block, index) => {
            if (block.type === 'HERO_HEADER') {
              const imageUrl = resolveAssetUrl(String(block.data.imageUrl ?? ''))
              const mobileImageUrl = resolveAssetUrl(String(block.data.mobileImageUrl ?? ''))
              const textColor = String(block.data.textColor ?? '#fff8ef')
              const fullWidth = block.data.fullWidth !== false
              const flushTop = block.data.flushTop !== false
              const minHeightVh = Math.min(Math.max(Number(block.data.minHeightVh ?? 92) || 92, 40), 140)
              const overlayOpacity = Math.min(Math.max(Number(block.data.overlayOpacity ?? 0.42) || 0.42, 0), 1)
              const contentAlign = String(block.data.contentAlign ?? 'start') === 'center' ? 'center' : 'start'

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
                          alt={String(block.data.title ?? page.title)}
                          className="h-full w-full object-cover"
                          src={imageUrl}
                        />
                      ) : mobileImageUrl ? (
                        <img
                          alt={String(block.data.title ?? page.title)}
                          className="h-full w-full object-cover"
                          src={mobileImageUrl}
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
                        {page.pageType === 'HOME' ? 'homepage signature' : 'campaign spotlight'}
                      </p>
                      <h1 className="text-4xl font-black leading-[1.15] md:text-6xl">
                        {String(block.data.title ?? page.title)}
                      </h1>
                      {block.data.subtitle ? (
                        <p className={`mt-6 text-base leading-8 text-white/82 md:text-lg ${contentAlign === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>
                          {String(block.data.subtitle)}
                        </p>
                      ) : null}
                      {block.data.ctaText && block.data.ctaLink ? (
                        <a
                          className="mt-8 inline-flex items-center rounded-full bg-[#fff3e7] px-6 py-3 text-sm font-black text-[#173126] transition hover:bg-white"
                          href={String(block.data.ctaLink)}
                        >
                          {String(block.data.ctaText)}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </section>
              )
            }

            if (block.type === 'CATEGORY_CIRCLES') {
              const categories = Array.isArray(block.categories) ? block.categories : []

              return (
                <section className="mb-8 rounded-[36px] bg-[linear-gradient(180deg,rgba(255,253,248,0.96),rgba(248,241,230,0.95))] px-5 py-8 shadow-[0_18px_50px_rgba(40,29,12,0.08)] md:px-8" key={block.id}>
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#9f7e56]">category edit</p>
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

            if (block.type === 'PRODUCT_CAROUSEL') {
              const products = Array.isArray(block.products) ? block.products : []

              return (
                <section className="mb-8" key={block.id}>
                  <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#9f7e56]">live catalog</p>
                      <h2 className="mt-2 text-3xl font-black text-[#173126]">{String(block.data.title || 'انتخاب‌های ویژه')}</h2>
                    </div>
                    <PillLike text={`${products.length} محصول`} />
                  </div>
                  <div className="flex gap-5 overflow-x-auto pb-2">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              )
            }

            if (block.type === 'EDITORIAL_RICH_BLOCK') {
              const imageOnLeft = String(block.data.imagePosition ?? 'right') === 'left'

              return (
                <section
                  className="mb-8 grid gap-0 overflow-hidden rounded-[40px] shadow-[0_24px_60px_rgba(38,24,9,0.08)] md:grid-cols-2"
                  key={block.id}
                  style={{
                    background: String(block.data.backgroundColor || '#efe4d3'),
                  }}
                >
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

            if (block.type === 'VENDOR_CAROUSEL') {
              const vendors = Array.isArray(block.vendors) ? block.vendors : []

              return (
                <section className="mb-8" key={block.id}>
                  <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#9f7e56]">vendor selection</p>
                      <h2 className="mt-2 text-3xl font-black text-[#173126]">{String(block.data.title || 'فروشگاه‌های برتر')}</h2>
                    </div>
                    <PillLike text={`${vendors.length} فروشگاه`} />
                  </div>
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {vendors.map((vendor) => (
                      <VendorCard key={vendor.id} vendor={vendor} />
                    ))}
                  </div>
                </section>
              )
            }

            if (block.type === 'CAMPAIGN_GRID') {
              const banners = Array.isArray(block.data.banners) ? (block.data.banners as Array<Record<string, unknown>>) : []

              return (
                <section
                  className="mb-8 rounded-[40px] px-5 py-8 shadow-[0_18px_50px_rgba(40,29,12,0.08)] md:px-8"
                  key={block.id}
                  style={{ background: String(block.data.backgroundColor || '#f2e7d8') }}
                >
                  {block.data.title ? (
                    <div className="mb-6">
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#9f7e56]">campaign grid</p>
                      <h2 className="mt-2 text-3xl font-black text-[#173126]">{String(block.data.title)}</h2>
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

            return null
          })}

          {page.blocks.length === 0 ? (
            <section className="rounded-[34px] border border-dashed border-[#caa67f] bg-white/70 px-6 py-14 text-center shadow-[0_10px_30px_rgba(52,36,17,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#a47c54]">empty builder</p>
              <h2 className="mt-3 text-3xl font-black text-[#173126]">{page.title}</h2>
              <p className="mt-4 text-[#6e6152]">این صفحه هنوز هیچ بلاکی برای نمایش ندارد.</p>
            </section>
          ) : null}

          <footer className="px-2 pt-6 text-center text-sm text-[#7b6b58]">
            {indexSignature(page)}
          </footer>
        </div>
      </main>
    </>
  )
}

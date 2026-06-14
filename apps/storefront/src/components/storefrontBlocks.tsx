'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { resolveAssetUrl, type CategorySummary, type ProductSummary, type StoreSummary } from '../lib/storefront'
import { addCartItem, getCart, readStoredToken } from '../lib/storefrontAuth'
import { emitStorefrontAuthRequired, emitStorefrontToast } from './storefrontToast'
import { storefrontShared } from './storefrontShared'
import { storefrontStyles } from './storefrontStyles'

function formatPrice(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('fa-IR').format(value)
}

function getEffectiveDiscountPrice(price: number, discountPrice: number | null | undefined) {
  if (typeof discountPrice !== 'number' || Number.isNaN(discountPrice)) return null
  if (discountPrice <= 0 || discountPrice >= price) return null
  return discountPrice
}

function formatDistance(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value < 1) {
    return `${new Intl.NumberFormat('fa-IR').format(Math.max(100, Math.round(value * 1000)))} متر`
  }

  return `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(value)} کیلومتر`
}

function getSingleStoreCartMessage(currentStoreName: string, nextStoreName: string) {
  return `سبد خرید شما در حال حاضر برای فروشگاه «${currentStoreName}» ثبت شده است. برای سفارش از «${nextStoreName}»، لطفاً ابتدا سبد فعلی را نهایی یا خالی کنید.`
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

export function StorefrontPill({ text }: { text: string }) {
  return <span className={storefrontShared.pill}>{text}</span>
}

export function ProductCard({ product, className = '' }: { product: ProductSummary; className?: string }) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const basePrice = typeof product.effectivePrice === 'number' ? product.effectivePrice : product.price
  const rawDiscountPrice =
    typeof product.effectiveDiscountPrice === 'number' ? product.effectiveDiscountPrice : product.discountPrice
  const price = formatPrice(basePrice)
  const effectiveDiscountPrice = getEffectiveDiscountPrice(basePrice, rawDiscountPrice)
  const discountPrice = formatPrice(effectiveDiscountPrice)
  const hasDiscount = effectiveDiscountPrice !== null
  const distanceLabel = formatDistance(product.aerialDistanceKm)
  const productHref = getProductHref(product)
  const vendorHref = product.store?.slug ? getVendorHref(product.store) : null
  const categoryHref = product.category?.slug ? `/categories/${product.category.slug}` : null
  const isAddToCartDisabled = isAdding || product.isPurchasable !== true || product.isArchived === true

  return (
    <article className={`${storefrontStyles.productCard} ${className}`.trim()}>
      <Link className={storefrontStyles.productImageWrap} href={productHref}>
        <img alt={product.mainImageAlt || product.name} className={storefrontStyles.productImage} src={resolveAssetUrl(product.mainImage)} />
      </Link>
      <div className="flex flex-1 flex-col">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {vendorHref ? (
              <Link className="text-xs uppercase tracking-[0.28em] text-[#9e7b52]" href={vendorHref}>
                {product.store?.name || 'فروشگاه منتخب'}
              </Link>
            ) : (
              <p className="text-xs uppercase tracking-[0.28em] text-[#9e7b52]">{product.store?.name || 'فروشگاه منتخب'}</p>
            )}
            {distanceLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#bfd9cf] bg-[#edf7f1] px-2.5 py-1 text-[11px] font-bold text-[#2f5f4d]">
                <span aria-hidden="true">📍</span>
                <span>{distanceLabel}</span>
              </span>
            ) : null}
          </div>
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
        <div className="mt-3 flex min-h-[3.25rem] items-end justify-between gap-3">
          <div className="flex min-h-[3.25rem] flex-col justify-end space-y-1">
            <div className="min-h-[1.25rem] text-sm text-[#9c8a75] line-through">{hasDiscount ? `${price} تومان` : ''}</div>
            <div className="min-h-[1.5rem] text-lg font-extrabold text-[#d06c54]">{hasDiscount ? `${discountPrice} تومان` : `${price} تومان`}</div>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <button
            className="inline-flex items-center rounded-full bg-[#1f6a52] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            disabled={isAddToCartDisabled}
            onClick={async () => {
              if (product.isPurchasable !== true || product.isArchived === true) {
                emitStorefrontToast({ message: 'این محصول در حال حاضر امکان افزودن به سبد خرید را ندارد.', duration: 8000 })
                return
              }

              const token = readStoredToken()
              if (!token) {
                emitStorefrontToast({ message: 'برای افزودن محصول به سبد خرید، ابتدا وارد حساب کاربری شوید.', duration: 8000 })
                emitStorefrontAuthRequired()
                return
              }

              try {
                setIsAdding(true)
                const cart = await getCart(token)
                const existingStoreName = cart.items[0]?.product.store?.name
                const existingStoreSlug = cart.items[0]?.product.store?.slug
                const nextStoreName = product.store?.name || 'این فروشگاه'
                const nextStoreSlug = product.store?.slug || ''

                if (cart.items.length && existingStoreSlug && nextStoreSlug && existingStoreSlug !== nextStoreSlug) {
                  emitStorefrontToast({ message: getSingleStoreCartMessage(existingStoreName || 'فروشگاه فعلی', nextStoreName), duration: 8000 })
                  return
                }

                await addCartItem(token, { productId: product.id, quantity: 1 })
                router.push('/cart')
              } catch (error) {
                emitStorefrontToast({ message: error instanceof Error ? error.message : 'افزودن به سبد خرید با خطا مواجه شد.', duration: 8000 })
              } finally {
                setIsAdding(false)
              }
            }}
            type="button"
          >
            {product.isPurchasable !== true || product.isArchived === true ? 'ناموجود' : isAdding ? 'در حال افزودن...' : 'افزودن به سبد'}
          </button>
          <Link className="inline-flex items-center rounded-full border border-[#1f6a52]/18 px-4 py-2 text-sm font-bold text-[#1f6a52]" href={productHref}>
            مشاهده محصول
          </Link>
        </div>
      </div>
    </article>
  )
}

export function CategoryCircle({ category }: { category: CategorySummary }) {
  return (
    <Link className={storefrontStyles.categoryCircle} href={getCategoryHref(category)}>
      <div className={storefrontStyles.categoryCircleMedia}>
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

export function VendorCard({ vendor }: { vendor: StoreSummary }) {
  const rating = Number(vendor.customerRatingAverage ?? 0)
  const ratingLabel = rating > 0 ? rating.toFixed(1) : 'جدید'
  const vendorHref = getVendorHref(vendor)

  return (
    <article className={storefrontStyles.vendorCard}>
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

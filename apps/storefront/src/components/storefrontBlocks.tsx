'use client'

import Link from 'next/link'
import { resolveAssetUrl, type CategorySummary, type ProductSummary, type StoreSummary } from '../lib/storefront'
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
  const price = formatPrice(product.price)
  const effectiveDiscountPrice = getEffectiveDiscountPrice(product.price, product.discountPrice)
  const discountPrice = formatPrice(effectiveDiscountPrice)
  const hasDiscount = effectiveDiscountPrice !== null
  const productHref = getProductHref(product)
  const vendorHref = product.store?.slug ? getVendorHref(product.store) : null
  const categoryHref = product.category?.slug ? `/categories/${product.category.slug}` : null

  return (
    <article className={`${storefrontStyles.productCard} ${className}`.trim()}>
      <Link className={storefrontStyles.productImageWrap} href={productHref}>
        <img alt={product.mainImageAlt || product.name} className={storefrontStyles.productImage} src={resolveAssetUrl(product.mainImage)} />
      </Link>
      <div className="flex flex-1 flex-col">
        <div className="space-y-3">
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
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="space-y-1">
            {hasDiscount ? <div className="min-h-[1.25rem] text-sm text-[#9c8a75] line-through">{`${price} تومان`}</div> : null}
            <div className="text-lg font-extrabold text-[#d06c54]">{hasDiscount ? `${discountPrice} تومان` : `${price} تومان`}</div>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
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

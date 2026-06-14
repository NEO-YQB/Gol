'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { StorefrontProductDetail } from '../lib/storefront'
import { resolveAssetUrl } from '../lib/storefront'
import { addCartItem, getCart, readStoredToken } from '../lib/storefrontAuth'
import { storefrontCatalog } from './storefrontCatalog'
import { emitStorefrontToast } from './storefrontToast'

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('fa-IR').format(value)} تومان`
}

export function StorefrontProductDetailPage({ product }: { product: StorefrontProductDetail }) {
  const gallery = Array.isArray(product.gallery) ? product.gallery : []
  const allImages = useMemo(() => {
    const items = [
      {
        url: product.mainImage,
        alt: product.mainImageAlt || product.name,
      },
      ...gallery.map((item) => ({
        url: item.url,
        alt: item.alt || product.name,
      })),
    ]

    const seen = new Set<string>()
    return items.filter((item) => {
      if (!item.url || seen.has(item.url)) return false
      seen.add(item.url)
      return true
    })
  }, [gallery, product.mainImage, product.mainImageAlt, product.name])
  const router = useRouter()
  const [activeImageUrl, setActiveImageUrl] = useState(allImages[0]?.url || product.mainImage)
  const activeImage = allImages.find((item) => item.url === activeImageUrl) || allImages[0]
  const [isAdding, setIsAdding] = useState(false)
  const basePrice = typeof product.effectivePrice === 'number' ? product.effectivePrice : product.price
  const discountPrice =
    typeof product.effectiveDiscountPrice === 'number' ? product.effectiveDiscountPrice : product.discountPrice
  const hasDiscount = typeof discountPrice === 'number' && discountPrice > 0 && discountPrice < basePrice
  const ratingAverage = Number(product.store?.customerRatingAverage ?? 0)
  const ratingCount = Number(product.store?.customerRatingCount ?? 0)

  return (
    <div className="grid gap-6">
      <section className={storefrontCatalog.hero}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-black md:text-[2.4rem]">{product.name}</h1>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-white/85">
              {product.category?.slug ? (
                <Link className="rounded-full border border-white/15 bg-white/10 px-3 py-2" href={`/categories/${product.category.slug}`}>
                  {product.category.name}
                </Link>
              ) : null}
              {product.productType?.slug ? (
                <Link className="rounded-full border border-white/15 bg-white/10 px-3 py-2" href={`/product-types/${product.productType.slug}`}>
                  {product.productType.name}
                </Link>
              ) : null}
              {product.store?.slug ? (
                <Link className="rounded-full border border-white/15 bg-white/10 px-3 py-2" href={`/stores/${product.store.slug}`}>
                  {product.store.name}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-black/10 px-5 py-5 lg:min-w-[320px]">
            {hasDiscount ? <div className="text-sm text-white/62 line-through">{formatMoney(basePrice)}</div> : null}
            <strong className="mt-2 block text-3xl font-black">{formatMoney(hasDiscount ? Number(discountPrice) : basePrice)}</strong>
            <p className="mt-3 text-sm text-white/82">{product.isPurchasable ? 'این محصول آماده ثبت سفارش است.' : 'این محصول فعلاً برای خرید مستقیم فعال نیست.'}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#173126] disabled:opacity-60"
                disabled={isAdding}
                onClick={async () => {
                  const token = readStoredToken()
                  if (!token) {
                    emitStorefrontToast({ message: 'برای افزودن محصول به سبد خرید، ابتدا وارد حساب کاربری شوید.', duration: 8000 })
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
                      emitStorefrontToast({ message: `سبد خرید شما در حال حاضر برای فروشگاه «${existingStoreName || 'فروشگاه فعلی'}» ثبت شده است. برای سفارش از «${nextStoreName}»، لطفاً ابتدا سبد فعلی را نهایی یا خالی کنید.`, duration: 8000 })
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
                {isAdding ? 'در حال افزودن...' : 'افزودن به سبد'}
              </button>
              <Link className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white" href="/shop">
                بازگشت به آرشیو
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.62fr)_320px]">
        <article className={`${storefrontCatalog.card} h-fit overflow-hidden self-start`}>
          <div className="group overflow-hidden rounded-[26px] bg-[#f6efe5]">
            <img
              alt={activeImage?.alt || product.name}
              className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.22]"
              src={resolveAssetUrl(activeImage?.url || product.mainImage)}
            />
          </div>

          {allImages.length > 1 ? (
            <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-4">
              {allImages.map((item) => {
                const isActive = item.url === activeImage?.url

                return (
                  <button
                    className={`overflow-hidden rounded-[20px] border transition ${isActive ? 'border-[#173126] ring-2 ring-[#173126]/20' : 'border-transparent hover:border-[#1f6a52]/25'}`}
                    key={item.url}
                    onClick={() => setActiveImageUrl(item.url)}
                    type="button"
                  >
                    <img alt={item.alt || product.name} className="h-24 w-full object-cover md:h-28" src={resolveAssetUrl(item.url)} />
                  </button>
                )
              })}
            </div>
          ) : null}
        </article>

        <div className="grid gap-5">
          <section className={`${storefrontCatalog.card} h-fit`}>
            <h2 className="text-xl font-black text-[#173126]">خلاصه محصول</h2>
            <div className="mt-4 text-sm leading-8 text-[#5f564c] whitespace-pre-line">
              {product.shortDescription || product.description || 'برای این محصول هنوز توضیح کوتاه ثبت نشده است.'}
            </div>
          </section>
        </div>

        <aside className="grid gap-5">
          <section className={storefrontCatalog.card}>
            <h2 className="text-xl font-black text-[#173126]">مشخصات پایه</h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[20px] bg-[#f9f4ec] px-4 py-4">
                <span className="block text-xs font-bold text-[#92785a]">فروشگاه</span>
                <strong className="mt-1 block text-base text-[#173126]">{product.store?.name || 'نامشخص'}</strong>
              </div>
              <div className="rounded-[20px] bg-[#f9f4ec] px-4 py-4">
                <span className="block text-xs font-bold text-[#92785a]">دسته‌بندی</span>
                <strong className="mt-1 block text-base text-[#173126]">{product.category?.name || 'نامشخص'}</strong>
              </div>
              <div className="rounded-[20px] bg-[#f9f4ec] px-4 py-4">
                <span className="block text-xs font-bold text-[#92785a]">نوع محصول</span>
                <strong className="mt-1 block text-base text-[#173126]">{product.productType?.name || 'نامشخص'}</strong>
              </div>
              <div className="rounded-[20px] bg-[#f9f4ec] px-4 py-4">
                <span className="block text-xs font-bold text-[#92785a]">ارسال فروشگاه</span>
                <strong className="mt-1 block text-base text-[#173126]">{product.store?.sameDayDelivery ? 'امکان ارسال فوری' : 'ارسال استاندارد'}</strong>
              </div>
            </div>
          </section>

          <section className={storefrontCatalog.card}>
            <h2 className="text-xl font-black text-[#173126]">ترکیب و اجزا</h2>
            <div className="mt-4 grid gap-3">
              {product.composition?.length ? (
                product.composition.map((item) => (
                  <div className="rounded-[20px] bg-[#f9f4ec] px-4 py-4" key={item.id}>
                    <strong className="block text-base text-[#173126]">{item.element?.name || 'المان نامشخص'}</strong>
                    <p className="mt-1 text-sm text-[#6e6152]">{`${new Intl.NumberFormat('fa-IR').format(item.quantity)} ${item.element?.unit || 'عدد'} • ${item.elementType}`}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-[#dcc5a7] bg-[#fbf7f1] px-4 py-5 text-sm text-[#6e6152]">
                  برای این محصول هنوز ترکیب جزئی ثبت نشده است.
                </div>
              )}
            </div>
          </section>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_320px]">
        <article className={storefrontCatalog.card}>
          <h2 className="text-2xl font-black text-[#173126]">توضیحات کامل محصول</h2>
          <div className="mt-4 text-sm leading-8 text-[#5f564c] whitespace-pre-line">
            {product.description || product.shortDescription || 'برای این محصول هنوز توضیح تکمیلی ثبت نشده است.'}
          </div>
        </article>

        <aside className="rounded-[30px] border border-[#b7d7c8] bg-[linear-gradient(180deg,rgba(237,248,241,0.98),rgba(224,242,232,0.96))] px-5 py-5 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
          <h2 className="text-xl font-black text-[#224638]">{`درباره فروشگاه ${product.store?.name || 'فروشنده'}`}</h2>
          <div className="mt-4 grid gap-3">
            <div className="rounded-[20px] bg-white/70 px-4 py-4">
              <span className="block text-xs font-bold text-[#6f8f80]">میانگین رضایت مشتریان</span>
              <strong className="mt-1 block text-base text-[#224638]">{ratingAverage > 0 ? ratingAverage.toFixed(1) : 'جدید'}</strong>
            </div>
            <div className="rounded-[20px] bg-white/70 px-4 py-4">
              <span className="block text-xs font-bold text-[#6f8f80]">تعداد نظر ثبت‌شده</span>
              <strong className="mt-1 block text-base text-[#224638]">{new Intl.NumberFormat('fa-IR').format(ratingCount)}</strong>
            </div>
            <div className="rounded-[20px] bg-white/70 px-4 py-4">
              <span className="block text-xs font-bold text-[#6f8f80]">وضعیت ارسال</span>
              <strong className="mt-1 block text-base text-[#224638]">{product.store?.sameDayDelivery ? 'ارسال فوری فعال است' : 'ارسال استاندارد فروشگاه'}</strong>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

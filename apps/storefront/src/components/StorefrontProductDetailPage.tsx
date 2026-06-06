import Link from 'next/link'
import type { ProductSummary } from '../lib/storefront'
import { resolveAssetUrl } from '../lib/storefront'
import { storefrontCatalog } from './storefrontCatalog'

type ProductDetail = ProductSummary & {
  description?: string | null
  shortDescription?: string | null
  mainImageAlt?: string | null
  gallery?: Array<{ url: string; alt?: string | null }>
  productType?: {
    id: number
    name: string
    slug: string
  } | null
  store?: {
    id: number
    name: string
    slug: string
    sameDayDelivery?: boolean
  } | null
  composition?: Array<{
    id: number
    quantity: number
    elementType: string
    element?: {
      id: number
      name: string
      unit?: string | null
    } | null
  }>
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('fa-IR').format(value)} تومان`
}

export function StorefrontProductDetailPage({ product }: { product: ProductDetail }) {
  const gallery = Array.isArray(product.gallery) ? product.gallery : []
  const hasDiscount = typeof product.discountPrice === 'number' && product.discountPrice > 0 && product.discountPrice < product.price

  return (
    <div className="grid gap-6">
      <section className={storefrontCatalog.hero}>
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-white/75">Single Product</span>
        <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
          <div>
            <h1 className="text-3xl font-black md:text-[2.3rem]">{product.name}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/82">{product.shortDescription || product.description || 'جزئیات کامل این محصول از داده‌های واقعی فروشگاه بارگذاری شده است.'}</p>
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

          <div className="rounded-[30px] border border-white/10 bg-black/10 px-5 py-5">
            {hasDiscount ? <div className="text-sm text-white/62 line-through">{formatMoney(product.price)}</div> : null}
            <strong className="mt-2 block text-3xl font-black">{formatMoney(hasDiscount ? Number(product.discountPrice) : product.price)}</strong>
            <p className="mt-3 text-sm text-white/82">{product.isPurchasable ? 'این محصول آماده ثبت سفارش است.' : 'این محصول فعلاً برای خرید مستقیم فعال نیست.'}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#173126]" href={`/products/${product.slug}?action=add-to-cart`}>
                افزودن به سبد
              </Link>
              <Link className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white" href="/shop">
                بازگشت به آرشیو
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_360px]">
        <div className="grid gap-5">
          <article className={storefrontCatalog.card}>
            <div className="overflow-hidden rounded-[26px] bg-[#f6efe5]">
              <img alt={product.mainImageAlt || product.name} className="h-[420px] w-full object-cover" src={resolveAssetUrl(product.mainImage)} />
            </div>

            {gallery.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {gallery.map((item, index) => (
                  <div className="overflow-hidden rounded-[22px] bg-[#f6efe5]" key={`${item.url}-${index}`}>
                    <img alt={item.alt || product.name} className="h-28 w-full object-cover" src={resolveAssetUrl(item.url)} />
                  </div>
                ))}
              </div>
            ) : null}
          </article>

          <article className={storefrontCatalog.card}>
            <h2 className="text-2xl font-black text-[#173126]">توضیحات محصول</h2>
            <div className="mt-4 text-sm leading-8 text-[#5f564c] whitespace-pre-line">
              {product.description || product.shortDescription || 'برای این محصول هنوز توضیح تکمیلی ثبت نشده است.'}
            </div>
          </article>
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
    </div>
  )
}

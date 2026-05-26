import { resolveAssetUrl, type CategorySummary, type EnrichedStorefrontPage, type ProductSummary, type StoreSummary } from '../lib/storefront'

function formatPrice(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('fa-IR').format(value)
}

function ProductCard({ product }: { product: ProductSummary }) {
  const price = formatPrice(product.price)
  const discountPrice = formatPrice(product.discountPrice ?? null)

  return (
    <article className="group min-w-[240px] rounded-[28px] border border-black/5 bg-white/85 p-4 shadow-[0_20px_50px_rgba(37,24,8,0.08)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(37,24,8,0.12)]">
      <div className="mb-4 overflow-hidden rounded-[24px] bg-[#f4eadc]">
        <img
          alt={product.mainImageAlt || product.name}
          className="h-56 w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          src={resolveAssetUrl(product.mainImage)}
        />
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#9e7b52]">
            {product.store?.name || 'فروشگاه منتخب'}
          </p>
          <h3 className="mt-2 text-xl font-black text-[#1e3529]">{product.name}</h3>
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
          <span className="inline-flex items-center rounded-full bg-[#1f6a52] px-4 py-2 text-sm font-bold text-white">
            انتخاب زنده
          </span>
        </div>
      </div>
    </article>
  )
}

function CategoryCircle({ category }: { category: CategorySummary }) {
  return (
    <article className="group flex min-w-[120px] flex-col items-center gap-4 text-center">
      <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/70 bg-[#f6eadc] shadow-[0_18px_36px_rgba(52,36,17,0.08)]">
        {category.image ? (
          <img alt={category.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" src={resolveAssetUrl(category.image)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_#f4cab6,_#e6d6bf_72%)] text-3xl">✿</div>
        )}
      </div>
      <span className="text-sm font-bold text-[#214032]">{category.name}</span>
    </article>
  )
}

function VendorCard({ vendor }: { vendor: StoreSummary }) {
  const rating = Number(vendor.customerRatingAverage ?? 0)
  const ratingLabel = rating > 0 ? rating.toFixed(1) : 'جدید'

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
          <h3 className="text-lg font-black text-[#1b3228]">{vendor.name}</h3>
          <p className="mt-1 text-sm text-[#7d6b58]">{vendor.sameDayDelivery ? 'ارسال فوری فعال' : 'ارسال استاندارد'}</p>
        </div>
      </div>
      <div className="mb-5 flex items-center justify-between rounded-[20px] bg-[#f6eee4] px-4 py-3">
        <span className="text-sm text-[#80674a]">رضایت مشتریان</span>
        <strong className="text-lg text-[#d06c54]">{ratingLabel}</strong>
      </div>
      <span className="inline-flex items-center rounded-full border border-[#1f6a52]/20 px-4 py-2 text-sm font-bold text-[#1f6a52]">
        فروشگاه منتخب
      </span>
    </article>
  )
}

export function StorefrontPageView({ page }: { page: EnrichedStorefrontPage }) {
  return (
    <main className="min-h-screen bg-[#f5efe4] text-[#173126]">
      <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-4 md:px-8">
        {page.blocks.map((block, index) => {
          if (block.type === 'HERO_HEADER') {
            const imageUrl = resolveAssetUrl(String(block.data.imageUrl ?? ''))
            const textColor = String(block.data.textColor ?? '#fff8ef')

            return (
              <section
                className="relative isolate mb-8 overflow-hidden rounded-[40px] border border-white/40 px-6 py-12 shadow-[0_30px_90px_rgba(36,24,6,0.16)] md:px-12 md:py-16"
                key={block.id}
                style={{
                  background:
                    imageUrl
                      ? `linear-gradient(110deg, rgba(19, 41, 31, 0.88), rgba(19, 41, 31, 0.42)), url(${imageUrl}) center/cover`
                      : 'linear-gradient(135deg, #173126 0%, #294f3d 48%, #d06c54 100%)',
                  color: textColor,
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_34%)]" />
                <div className="relative z-10 max-w-3xl">
                  <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.34em] text-white/85">
                    {page.pageType === 'HOME' ? 'homepage signature' : 'campaign spotlight'}
                  </p>
                  <h1 className="text-4xl font-black leading-[1.15] md:text-6xl">
                    {String(block.data.title ?? page.title)}
                  </h1>
                  {block.data.subtitle ? (
                    <p className="mt-6 max-w-2xl text-base leading-8 text-white/82 md:text-lg">
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
            const banners = Array.isArray(block.data.banners) ? block.data.banners as Array<Record<string, unknown>> : []

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

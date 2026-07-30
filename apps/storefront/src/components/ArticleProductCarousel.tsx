'use client'

import type { ProductSummary } from '../lib/storefront'
import { ProductCard } from './storefrontBlocks'

export function ArticleProductCarousel({ title, products }: { title?: string; products: ProductSummary[] }) {
  if (!products.length) {
    return null
  }

  return (
    <section className="article-product-carousel not-prose my-8">
      {title ? <h2 className="mb-4 text-xl font-black text-[#173126]">{title}</h2> : null}
      <div className="flex snap-x snap-mandatory items-stretch justify-start gap-4 overflow-x-auto px-1 pb-2">
        {products.map((product) => (
          <ProductCard
            className="h-full min-h-[100%] min-w-[76vw] max-w-[300px] snap-start md:min-w-[260px]"
            key={product.id}
            product={product}
          />
        ))}
      </div>
    </section>
  )
}

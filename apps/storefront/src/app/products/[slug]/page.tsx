import { notFound, redirect } from 'next/navigation'
import { StorefrontProductDetailPage } from '../../../components/StorefrontProductDetailPage'
import { StorefrontShell } from '../../../components/StorefrontShell'
import {
  buildArchiveMetadata,
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  getStorefrontProductBySlug,
} from '../../../lib/storefront'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getStorefrontProductBySlug(slug)

  if (!product) {
    return buildArchiveMetadata({
      title: 'محصول پیدا نشد | گلینو',
      description: 'این محصول در دسترس نیست.',
      path: `/products/${slug}`,
    })
  }

  if ('redirectToUrl' in product) {
    return buildArchiveMetadata({
      title: 'انتقال محصول | گلینو',
      description: 'این محصول به آدرس جدید منتقل شده است.',
      path: product.redirectToUrl,
    })
  }

  return buildArchiveMetadata({
    title: product.metaTitle || `${product.name} | گلینو`,
    description: product.metaDescription || product.shortDescription || product.description || `جزئیات محصول ${product.name}`,
    path: `/products/${slug}`,
    image: product.mainImage,
    indexable: true,
    keywords: [
      product.name,
      product.category?.name || '',
      product.productType?.name || '',
      product.store?.name || '',
      'خرید گل',
      'گلینو',
    ].filter(Boolean),
    type: 'website',
  })
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getStorefrontProductBySlug(slug)

  if (!product) {
    notFound()
  }

  if ('redirectToUrl' in product) {
    redirect(product.redirectToUrl)
  }
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'خانه', path: '/' },
    { name: 'فروشگاه', path: '/shop' },
    ...(product.category?.slug ? [{ name: product.category.name, path: `/categories/${product.category.slug}` }] : []),
    { name: product.name, path: `/products/${product.slug}` },
  ])
  const productJsonLd = buildProductJsonLd(product)

  return (
    <StorefrontShell>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        type="application/ld+json"
      />
      <StorefrontProductDetailPage product={product} />
    </StorefrontShell>
  )
}

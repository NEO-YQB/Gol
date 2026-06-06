import { notFound } from 'next/navigation'
import { StorefrontProductDetailPage } from '../../../components/StorefrontProductDetailPage'
import { StorefrontShell } from '../../../components/StorefrontShell'
import { buildArchiveMetadata, getStorefrontProductBySlug } from '../../../lib/storefront'

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

  return buildArchiveMetadata({
    title: product.metaTitle || `${product.name} | گلینو`,
    description: product.metaDescription || product.shortDescription || product.description || `جزئیات محصول ${product.name}`,
    path: `/products/${slug}`,
    image: product.mainImage,
    indexable: true,
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

  return (
    <StorefrontShell>
      <StorefrontProductDetailPage product={product} />
    </StorefrontShell>
  )
}

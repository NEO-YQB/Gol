import { notFound } from 'next/navigation'
import { StorefrontAccountShell } from '../../../components/StorefrontAccountShell'
import { StorefrontProductDetailPage } from '../../../components/StorefrontProductDetailPage'
import { getStorefrontProductBySlug } from '../../../lib/storefront'

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
    <StorefrontAccountShell
      title={product.name}
      description={product.shortDescription || product.description || 'جزئیات کامل محصول از داده‌های واقعی کاتالوگ فروشگاه بارگذاری شده است.'}
    >
      <StorefrontProductDetailPage product={product} />
    </StorefrontAccountShell>
  )
}

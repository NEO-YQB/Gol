import { notFound } from 'next/navigation'
import { StorefrontPageView } from '../../components/StorefrontPageView'
import { getEnrichedStorefrontPage, getStorefrontMetadata } from '../../lib/storefront'

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  return getStorefrontMetadata(slug)
}

export default async function DynamicStorefrontPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const page = await getEnrichedStorefrontPage(slug)

  if (!page) {
    notFound()
  }

  return <StorefrontPageView page={page} />
}

import { notFound } from 'next/navigation'
import { StorefrontPageView } from '../components/StorefrontPageView'
import { getEnrichedStorefrontPage, getStorefrontMetadata } from '../lib/storefront'

export async function generateMetadata() {
  return getStorefrontMetadata()
}

export default async function HomePage() {
  const page = await getEnrichedStorefrontPage()

  if (!page) {
    notFound()
  }

  return <StorefrontPageView page={page} />
}

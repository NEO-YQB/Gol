import { notFound } from 'next/navigation'
import { JsonLd } from '../components/JsonLd'
import { StorefrontPageView } from '../components/StorefrontPageView'
import { buildOrganizationJsonLd, buildWebSiteJsonLd, getEnrichedStorefrontPage, getStorefrontMetadata } from '../lib/storefront'

export async function generateMetadata() {
  return getStorefrontMetadata()
}

export default async function HomePage() {
  const page = await getEnrichedStorefrontPage()

  if (!page) {
    notFound()
  }

  return (
    <>
      <JsonLd data={[buildOrganizationJsonLd(), buildWebSiteJsonLd()]} />
      <StorefrontPageView page={page} />
    </>
  )
}

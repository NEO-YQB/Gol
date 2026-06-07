import { getEnrichedStorefrontPage } from '../lib/storefront'
import { StorefrontFooter } from './StorefrontFooter'
import { StorefrontHeader } from './StorefrontHeader'
import { StorefrontToastHost } from './StorefrontToastHost'
import { storefrontShared } from './storefrontShared'

export async function StorefrontShell({
  children,
}: {
  children: React.ReactNode
}) {
  const shellPage = await getEnrichedStorefrontPage()

  return (
    <>
      {shellPage ? <StorefrontHeader heroTouchesTop page={shellPage} /> : null}
      <main className={storefrontShared.pageShell}>
        <div className={`${storefrontShared.pageContainer} pt-24 md:pt-28`}>
          <StorefrontToastHost />
          {children}
          {shellPage ? <StorefrontFooter page={shellPage} /> : null}
        </div>
      </main>
    </>
  )
}

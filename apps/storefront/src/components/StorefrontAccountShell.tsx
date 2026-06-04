import Link from 'next/link'
import { getEnrichedStorefrontPage } from '../lib/storefront'
import { StorefrontFooter } from './StorefrontFooter'
import { StorefrontHeader } from './StorefrontHeader'
import { storefrontShared } from './storefrontShared'

export async function StorefrontAccountShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  const shellPage = await getEnrichedStorefrontPage()

  return (
    <>
      {shellPage ? <StorefrontHeader heroTouchesTop page={shellPage} /> : null}
      <main className={storefrontShared.pageShell}>
        <div className={`${storefrontShared.pageContainer} pt-28`}>
          <section className="mb-8 overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,rgba(23,49,38,0.96),rgba(41,81,63,0.94),rgba(208,108,84,0.88))] px-6 py-7 text-white shadow-[0_20px_52px_rgba(31,41,30,0.16)] md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-3xl font-black">{title}</h1>
                <p className="mt-3 text-sm leading-7 text-white/82">{description}</p>
              </div>
              <Link className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/16" href="/">
                بازگشت به فروشگاه
              </Link>
            </div>
          </section>
          {children}
          {shellPage ? <StorefrontFooter page={shellPage} /> : null}
        </div>
      </main>
    </>
  )
}

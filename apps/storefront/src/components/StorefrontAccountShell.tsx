'use client'

import Link from 'next/link'
import { storefrontShared } from './storefrontShared'

export function StorefrontAccountShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <main className={storefrontShared.pageShell}>
      <div className={`${storefrontShared.pageContainer} pt-28`}>
        <section className="mb-8 rounded-[36px] bg-[linear-gradient(180deg,rgba(255,253,248,0.96),rgba(248,241,230,0.95))] px-6 py-7 shadow-[0_18px_50px_rgba(40,29,12,0.08)] md:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <span className={storefrontShared.sectionEyebrow}>account</span>
              <h1 className="mt-2 text-3xl font-black text-[#173126]">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6e6152]">{description}</p>
            </div>
            <Link className="inline-flex w-fit items-center rounded-full border border-[#1f6a52]/15 bg-white/70 px-4 py-2.5 text-sm font-black text-[#1f6a52] transition hover:bg-white" href="/">
              بازگشت به فروشگاه
            </Link>
          </div>
        </section>
        {children}
      </div>
    </main>
  )
}

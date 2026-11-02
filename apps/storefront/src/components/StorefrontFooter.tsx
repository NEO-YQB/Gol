'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { resolveAssetUrl, type EnrichedStorefrontPage } from '../lib/storefront'
import { getStorefrontSocialOption, isStorefrontSocialIconKey, type StorefrontSocialIconKey } from './storefrontSocialIcons'

type FooterLinkItem = {
  label: string
  href: string
}

type FooterLinkColumn = {
  enabled?: boolean
  title?: string | null
  items?: FooterLinkItem[]
}

type FooterBadge = {
  enabled?: boolean
  title?: string | null
  imageUrl?: string | null
  href?: string | null
}

type FooterSocial = {
  enabled?: boolean
  label: string
  icon?: StorefrontSocialIconKey | null
  imageUrl?: string | null
  href: string
}

type FooterAppDownloadItem = {
  enabled?: boolean
  title: string
  platform?: string | null
  href: string
  imageUrl?: string | null
}

type FooterAppDownload = {
  enabled?: boolean
  title?: string | null
  items?: FooterAppDownloadItem[]
  bazaarUrl?: string | null
  bazaarImageUrl?: string | null
  directUrl?: string | null
  directImageUrl?: string | null
}

type FooterConfig = {
  enabled?: boolean
  backgroundColor?: string | null
  textColor?: string | null
  mutedTextColor?: string | null
  accentColor?: string | null
  borderColor?: string | null
  brandEnabled?: boolean
  brandWidthPercent?: number | null
  brandLogoImageUrl?: string | null
  brandLogoHref?: string | null
  brandDescription?: string | null
  linksEnabled?: boolean
  linksWidthPercent?: number | null
  linkColumns?: FooterLinkColumn[]
  trustEnabled?: boolean
  trustWidthPercent?: number | null
  trustTitle?: string | null
  badges?: FooterBadge[]
  socials?: FooterSocial[]
  appDownload?: FooterAppDownload
  legalEnabled?: boolean
  legalText?: string | null
}

function normalizePercent(value: number | null | undefined, fallback: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(Math.max(Math.round(value), 15), 60)
}

function SocialIcon({ icon, label }: { icon: StorefrontSocialIconKey; label: string }) {
  const option = getStorefrontSocialOption(icon)
  const localIcons = {
    bale: '/social-icons/bale.svg',
    rubika: '/social-icons/rubika.svg',
    eitaa: '/social-icons/eitaa.svg',
    soroush: '/social-icons/soroush.svg',
  } as const
  const localAssetKey = option?.localAsset
  const localIconSrc = localAssetKey && localAssetKey in localIcons ? localIcons[localAssetKey as keyof typeof localIcons] : null
  const iconSrc = option?.simpleIconSlug ? `https://cdn.simpleicons.org/${option.simpleIconSlug}` : ''

  if (localIconSrc) {
    if (option?.preserveOriginalColors) {
      return <img alt={label} className="h-5 w-5 object-contain" src={localIconSrc} />
    }

    return (
      <span
        aria-hidden="true"
        className="block h-5 w-5 bg-current"
        style={{
          WebkitMaskImage: `url(${localIconSrc})`,
          maskImage: `url(${localIconSrc})`,
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
        }}
      />
    )
  }

  if (!iconSrc) {
    return <span className="text-[10px] font-bold">{label.slice(0, 2)}</span>
  }

  return (
    <span
      aria-hidden="true"
      className="block h-5 w-5 bg-current"
      style={{
        WebkitMaskImage: `url(${iconSrc})`,
        maskImage: `url(${iconSrc})`,
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  )
}

function AppPlatformIcon({ item }: { item: FooterAppDownloadItem }) {
  if (item.imageUrl) {
    return (
      <img
        alt={item.title}
        className="h-7 w-7 rounded-[4px] object-contain transition-transform duration-300 group-hover:scale-110"
        src={resolveAssetUrl(item.imageUrl)}
      />
    )
  }

  const p = (item.platform || '').toLowerCase()

  if (p === 'play-store' || p === 'google-play') {
    return (
      <svg className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24">
        <path d="M3.6 1.8c-.3.3-.5.8-.5 1.4v17.6c0 .6.2 1.1.5 1.4l.1.1 9.9-9.9v-.2L3.7 1.7l-.1.1z" fill="#00D2FF" />
        <path d="M16.8 15.5l-3.2-3.2v-.2l3.2-3.2.1.1 3.8 2.2c1.1.6 1.1 1.6 0 2.2l-3.9 2.1z" fill="#FFCE00" />
        <path d="M13.6 12.1L3.6 22.2c.4.4 1 .4 1.7 0l11.5-6.6-3.2-3.5z" fill="#FF334B" />
        <path d="M13.6 11.9l3.2-3.5L5.3 1.8C4.6 1.4 4 1.4 3.6 1.8l10 10.1z" fill="#00E676" />
      </svg>
    )
  }

  if (p === 'app-store') {
    return (
      <svg className="h-6 w-6 text-white transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 1.01-2.87-.96.04-2.07.64-2.71 1.39-.57.65-1.06 1.73-.97 2.76 1.07.08 2.11-.58 2.67-1.28z" />
      </svg>
    )
  }

  if (p === 'bazaar') {
    return (
      <svg className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24">
        <path d="M6 8.5V7a6 6 0 0 1 12 0v1.5h1.5A2.5 2.5 0 0 1 22 11v9.5A3.5 3.5 0 0 1 18.5 24h-13A3.5 3.5 0 0 1 2 20.5V11A2.5 2.5 0 0 1 4.5 8.5H6zm2.5 0h7V7a3.5 3.5 0 0 0-7 0v1.5z" fill="#25c974" />
        <circle cx="12" cy="15.5" fill="#FFFFFF" r="2.5" />
      </svg>
    )
  }

  if (p === 'myket') {
    return (
      <svg className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24">
        <rect fill="#1877F2" height="24" rx="6" width="24" />
        <path d="M6.5 7h3v10h-3zm4 0h3l4 5-4 5h-3l4-5-4-5z" fill="#FFFFFF" />
      </svg>
    )
  }

  if (p === 'direct') {
    return (
      <svg className="h-6 w-6 text-[#3DDC84] transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5896 8.3546 13.8568 8 12 8s-3.5896.3546-5.1368.9507L4.8409 5.4477a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
      </svg>
    )
  }

  if (p === 'web-app' || p === 'pwa') {
    return (
      <svg className="h-6 w-6 text-white transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect height="20" rx="3" strokeLinecap="round" strokeLinejoin="round" width="14" x="5" y="2" />
        <path d="M12 18h.01" strokeLinecap="round" strokeWidth="2.5" />
        <path d="M9 6h6" strokeLinecap="round" />
        <circle cx="12" cy="11" r="3" />
        <path d="M12 8v6M9 11h6" />
      </svg>
    )
  }

  if (p === 'sibapp') {
    return (
      <svg className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24">
        <rect fill="#007AFF" height="24" rx="6" width="24" />
        <path d="M12 6c-3.3 0-6 2.7-6 6 0 4 6 9 6 9s6-5 6-9c0-3.3-2.7-6-6-6zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" fill="#FFFFFF" />
      </svg>
    )
  }

  return (
    <svg className="h-6 w-6 text-white transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function StorefrontFooter({ page }: { page: EnrichedStorefrontPage }) {
  const footerConfig =
    typeof page.footerConfig === 'object' && page.footerConfig !== null
      ? (page.footerConfig as FooterConfig)
      : null

  if (!footerConfig || footerConfig.enabled === false) {
    return null
  }

  const brandWidthPercent = normalizePercent(footerConfig.brandWidthPercent, 34)
  const linksWidthPercent = normalizePercent(footerConfig.linksWidthPercent, 36)
  const trustWidthPercent = normalizePercent(footerConfig.trustWidthPercent, 30)
  const currentYear = new Date().getFullYear()
  const linkColumns = Array.isArray(footerConfig.linkColumns) ? footerConfig.linkColumns.filter((column) => column.enabled !== false) : []
  const badges = Array.isArray(footerConfig.badges)
    ? footerConfig.badges.filter((badge) => badge.enabled !== false && badge.imageUrl)
    : []
  const socials = Array.isArray(footerConfig.socials)
    ? footerConfig.socials.filter((social) => social.enabled !== false && social.href && (social.imageUrl || (social.icon && isStorefrontSocialIconKey(social.icon))))
    : []
  const legalText = String(footerConfig.legalText ?? '').trim()
  const appDownloadItems = useMemo(() => {
    const ad = footerConfig.appDownload
    if (!ad || ad.enabled === false) return []
    if (Array.isArray(ad.items) && ad.items.length > 0) {
      return ad.items.filter((item) => item.enabled !== false && Boolean(item.href?.trim()))
    }
    const legacy: FooterAppDownloadItem[] = []
    if (ad.bazaarUrl) {
      legacy.push({
        title: 'کافه بازار',
        platform: 'bazaar',
        href: ad.bazaarUrl,
        imageUrl: ad.bazaarImageUrl,
      })
    }
    if (ad.directUrl) {
      legacy.push({
        title: 'دانلود مستقیم',
        platform: 'direct',
        href: ad.directUrl,
        imageUrl: ad.directImageUrl,
      })
    }
    return legacy
  }, [footerConfig.appDownload])

  return (
    <footer
      className="mt-14 overflow-hidden rounded-[40px] border shadow-[0_24px_60px_rgba(16,31,24,0.16)]"
      style={{
        background: footerConfig.backgroundColor || '#173126',
        color: footerConfig.textColor || '#f5efe4',
        borderColor: footerConfig.borderColor || 'rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="flex flex-col gap-8 px-5 py-8 md:px-8 md:py-10 lg:grid"
        style={{ gridTemplateColumns: `${brandWidthPercent}% ${linksWidthPercent}% ${trustWidthPercent}%` }}
      >
        {footerConfig.brandEnabled !== false ? (
          <section className="min-w-0 text-center md:text-right">
            {footerConfig.brandLogoImageUrl ? (
              footerConfig.brandLogoHref ? (
                <Link className="inline-flex overflow-hidden rounded-[24px]" href={footerConfig.brandLogoHref}>
                  <img alt={page.title} className="h-[72px] w-[72px] rounded-[24px] object-cover" src={resolveAssetUrl(footerConfig.brandLogoImageUrl)} />
                </Link>
              ) : (
                <div className="inline-flex overflow-hidden rounded-[24px]">
                  <img alt={page.title} className="h-[72px] w-[72px] rounded-[24px] object-cover" src={resolveAssetUrl(footerConfig.brandLogoImageUrl)} />
                </div>
              )
            ) : null}
            {footerConfig.brandDescription ? (
              <p className="mt-4 max-w-fit text-sm leading-7" style={{ color: footerConfig.mutedTextColor || 'rgba(245,239,228,0.8)' }}>
                {footerConfig.brandDescription}
              </p>
            ) : null}
          </section>
        ) : null}

        {footerConfig.linksEnabled !== false && linkColumns.length ? (
          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {linkColumns.map((column, index) => (
              <div className="min-w-0" key={`footer-column-${index}`}>
                {column.title ? (
                  <p className="text-[0.9rem] font-black leading-tight" style={{ color: footerConfig.textColor || '#f5efe4' }}>
                    {column.title}
                  </p>
                ) : null}
                <div className={`${column.title ? 'mt-4' : ''} grid gap-2.5`}>
                  {(column.items ?? []).map((item) => (
                    <Link className="text-sm transition hover:opacity-80" href={item.href} key={`${item.label}-${item.href}`} style={{ color: footerConfig.mutedTextColor || 'rgba(245,239,228,0.8)' }}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ) : null}

        {footerConfig.trustEnabled !== false ? (
          <section className="min-w-0">
            {footerConfig.trustTitle ? (
              <p className="text-[0.9rem] font-black leading-tight" style={{ color: footerConfig.textColor || '#f5efe4' }}>
                {footerConfig.trustTitle}
              </p>
            ) : null}
            {badges.length ? (
              <div className={`${footerConfig.trustTitle ? 'mt-4' : ''} flex flex-wrap justify-center gap-3 md:justify-start`}>
                {badges.map((badge, index) => {
                  const image = (
                    <img
                      alt={badge.title || `badge-${index + 1}`}
                      className="h-16 w-16 rounded-[20px] object-cover"
                       src={resolveAssetUrl(String(badge.imageUrl))}
                    />
                  )

                  return badge.href ? (
                    <Link className="inline-flex rounded-[20px] border p-1.5" href={badge.href} key={`footer-badge-${index}`} style={{ borderColor: footerConfig.borderColor || 'rgba(255,255,255,0.12)' }}>
                      {image}
                    </Link>
                  ) : (
                    <div className="inline-flex rounded-[20px] border p-1.5" key={`footer-badge-${index}`} style={{ borderColor: footerConfig.borderColor || 'rgba(255,255,255,0.12)' }}>
                      {image}
                    </div>
                  )
                })}
              </div>
            ) : null}

            {socials.length ? (
              <div className={`${badges.length ? 'mt-5' : footerConfig.trustTitle ? 'mt-4' : ''} flex flex-wrap justify-center gap-3 md:justify-start`}>
                {socials.map((social) => (
                  <Link className="inline-flex rounded-[18px] border p-1.5 transition hover:opacity-90" href={social.href} key={`${social.label}-${social.href}`} style={{ borderColor: footerConfig.borderColor || 'rgba(255,255,255,0.12)' }}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-[14px]" style={{ color: footerConfig.textColor || '#f5efe4' }}>
                      {social.icon && isStorefrontSocialIconKey(social.icon) ? (
                        <SocialIcon icon={social.icon} label={social.label} />
                      ) : (
                        <img alt={social.label} className="h-11 w-11 rounded-[14px] object-cover" src={resolveAssetUrl(String(social.imageUrl))} />
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}

            {footerConfig.appDownload?.enabled !== false && appDownloadItems.length > 0 ? (
              <div className={`${socials.length ? 'mt-5' : badges.length ? 'mt-5' : footerConfig.trustTitle ? 'mt-4' : ''}`}>
                {footerConfig.appDownload?.title ? (
                  <p className="mb-3 text-xs font-bold" style={{ color: footerConfig.mutedTextColor || 'rgba(245,239,228,0.72)' }}>
                    {footerConfig.appDownload.title}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 md:justify-start">
                  {appDownloadItems.map((item, idx) => (
                    <a
                      aria-label={item.title}
                      className="group relative flex h-12 w-12 items-center justify-center rounded-[16px] border bg-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-white/40 hover:bg-white/10 hover:shadow-[0_8px_20px_rgba(0,0,0,0.24)] active:scale-95"
                      href={item.href}
                      key={`${item.title}-${item.href}-${idx}`}
                      rel="noopener noreferrer nofollow"
                      style={{ borderColor: footerConfig.borderColor || 'rgba(255,255,255,0.15)' }}
                      target="_blank"
                      title={item.title}
                    >
                      <AppPlatformIcon item={item} />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      {footerConfig.legalEnabled !== false ? (
        <div className="border-t px-5 py-4 text-sm md:px-8" style={{ borderColor: footerConfig.borderColor || 'rgba(255,255,255,0.12)', color: footerConfig.mutedTextColor || 'rgba(245,239,228,0.72)' }}>
          <p>{`${legalText || 'تمامی حقوق این وب‌سایت محفوظ است'} — ${currentYear}`}</p>
        </div>
      ) : null}
    </footer>
  )
}

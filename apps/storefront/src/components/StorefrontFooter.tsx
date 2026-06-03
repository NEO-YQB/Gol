'use client'

import Link from 'next/link'
import { resolveAssetUrl, type EnrichedStorefrontPage } from '../lib/storefront'
import { getStorefrontSocialOption, isStorefrontSocialIconKey, type StorefrontSocialIconKey } from './storefrontSocialIcons'
import baleIcon from './social-icons/bale.svg'
import eitaaIcon from './social-icons/eitaa.svg'
import rubikaIcon from './social-icons/rubika.svg'
import soroushIcon from './social-icons/soroush.svg'

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
  legalEnabled?: boolean
  legalText?: string | null
}

function normalizePercent(value: number | null | undefined, fallback: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(Math.max(Math.round(value), 15), 60)
}

function SocialIcon({ icon, label }: { icon: StorefrontSocialIconKey; label: string }) {
  const option = getStorefrontSocialOption(icon)
  const localIcons: Record<string, string> = {
    bale: baleIcon,
    rubika: rubikaIcon,
    eitaa: eitaaIcon,
    soroush: soroushIcon,
  }
  const localIconSrc = option?.localAsset ? localIcons[option.localAsset] : ''
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
          <section className="min-w-0">
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
                  <h3 className="text-sm font-black" style={{ color: footerConfig.textColor || '#f5efe4' }}>
                    {column.title}
                  </h3>
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
              <h3 className="text-sm font-black" style={{ color: footerConfig.textColor || '#f5efe4' }}>
                {footerConfig.trustTitle}
              </h3>
            ) : null}
            {badges.length ? (
              <div className={`${footerConfig.trustTitle ? 'mt-4' : ''} flex flex-wrap gap-3`}>
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
              <div className={`${badges.length ? 'mt-5' : footerConfig.trustTitle ? 'mt-4' : ''} flex flex-wrap gap-3`}>
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

'use client'

import { isSocialIconKey, type SocialIconKey } from '@flower-marketplace/frontend-core/src/socialIcons'
import Link from 'next/link'
import { resolveAssetUrl, type EnrichedStorefrontPage } from '../lib/storefront'

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
  icon?: SocialIconKey | null
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

function SocialIcon({ icon, label }: { icon: SocialIconKey; label: string }) {
  const commonProps = {
    className: 'h-5 w-5',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  }

  switch (icon) {
    case 'instagram':
      return <svg {...commonProps}><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" /></svg>
    case 'telegram':
      return <svg {...commonProps}><path d="M21 4 3 11l6 2 2 6 10-15Z" /><path d="m9 13 8-6" /></svg>
    case 'x':
      return <svg {...commonProps}><path d="M4 4l16 16" /><path d="M20 4 9 15" /><path d="M15 20 4 4" /></svg>
    case 'youtube':
      return <svg {...commonProps}><path d="M21 12c0 3.4-.3 5.3-1 6-.7.7-2.6 1-8 1s-7.3-.3-8-1c-.7-.7-1-2.6-1-6s.3-5.3 1-6c.7-.7 2.6-1 8-1s7.3.3 8 1c.7.7 1 2.6 1 6Z" /><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none" /></svg>
    case 'pinterest':
      return <svg {...commonProps}><path d="M12 20c-1.5-1.4-2.3-3.3-2.3-5.6 0-3.4 2.3-5.9 5.4-5.9 2.7 0 4.5 1.8 4.5 4.2 0 3.1-1.4 5.4-3.6 5.4-1.1 0-1.9-.9-1.7-2l.6-2.4" /><path d="M9.1 21c.6-1.1 1-2.4 1.3-4" /><path d="M8.3 10.7c0-3 2.4-5.7 6.1-5.7" /></svg>
    case 'threads':
      return <svg {...commonProps}><path d="M15.4 10.1c-.3-2.4-1.8-3.6-4.4-3.6-2.7 0-4.7 1.6-4.7 4 0 2.1 1.6 3.6 4.1 4l3.4.6c1.5.3 2.2.8 2.2 1.8 0 1.2-1.2 2-3 2-2 0-3.3-.8-3.8-2.4" /><path d="M15.2 10.2c2.2.4 3.7 1.8 3.7 4 0 2.8-2.4 4.8-5.8 4.8" /></svg>
    case 'linkedin':
      return <svg {...commonProps}><path d="M7 10v7" /><path d="M12 10v7" /><path d="M12 13.5c0-2 1.2-3.5 3.1-3.5S18 11.4 18 14v3" /><circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" /></svg>
    case 'whatsapp':
      return <svg {...commonProps}><path d="M20 11.8A8 8 0 0 1 8.2 19L4 20l1.1-4A8 8 0 1 1 20 11.8Z" /><path d="M9 9.5c.5 2.3 2.2 4 4.5 4.5" /><path d="M14.2 15c-.6.4-1.7.1-3-.6-1.3-.8-2.4-1.9-3.1-3.1-.8-1.3-1-2.4-.6-3" /></svg>
    case 'bale':
      return <svg {...commonProps}><path d="M6 6h12v12H6z" /><path d="m9 9 6 3-6 3Z" fill="currentColor" stroke="none" /></svg>
    case 'rubika':
      return <svg {...commonProps}><rect x="5" y="5" width="14" height="14" rx="4" /><path d="m9 9 6 3-6 3Z" fill="currentColor" stroke="none" /></svg>
    case 'eitaa':
      return <svg {...commonProps}><path d="M21 4 3 11l6 2 2 6 10-15Z" /><path d="m9 13 7-5" /></svg>
    case 'soroush':
      return <svg {...commonProps}><path d="M12 3c4.4 0 8 2.9 8 6.5 0 2.4-1.5 4.4-3.8 5.6V21l-4.1-3.3H12c-4.4 0-8-2.9-8-6.5S7.6 3 12 3Z" /></svg>
    case 'aparat':
      return <svg {...commonProps}><circle cx="12" cy="12" r="2.2" /><path d="M12 5.2h.01" /><path d="M12 18.8h.01" /><path d="M5.2 12h.01" /><path d="M18.8 12h.01" /><path d="M7.4 7.4h.01" /><path d="M16.6 16.6h.01" /><path d="M16.6 7.4h.01" /><path d="M7.4 16.6h.01" /></svg>
    default:
      return <span className="text-[10px] font-bold">{label.slice(0, 2)}</span>
  }
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
    ? footerConfig.socials.filter((social) => social.enabled !== false && social.href && (social.imageUrl || (social.icon && isSocialIconKey(social.icon))))
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
                      {social.icon && isSocialIconKey(social.icon) ? (
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

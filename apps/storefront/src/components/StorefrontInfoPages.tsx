'use client'

import Link from 'next/link'
import { resolveAssetUrl, type EnrichedStorefrontPage, type StorefrontInfoPagesSettings } from '../lib/storefront'
import { getStorefrontSocialOption, isStorefrontSocialIconKey, type StorefrontSocialIconKey } from './storefrontSocialIcons'

type FooterSocial = {
  enabled?: boolean
  label: string
  icon?: StorefrontSocialIconKey | null
  imageUrl?: string | null
  href: string
}

type FooterConfig = {
  socials?: FooterSocial[]
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, '').trim()
}

function hasHtml(value: string | null | undefined) {
  return Boolean(value && stripHtml(value).length > 0)
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

  if (!iconSrc) return <span className="text-[10px] font-bold">{label.slice(0, 2)}</span>

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

function InfoHero({
  title,
  subtitle,
  desktopImage,
  mobileImage,
}: {
  title: string
  subtitle?: string
  desktopImage?: string
  mobileImage?: string
}) {
  const resolvedDesktop = resolveAssetUrl(desktopImage)
  const resolvedMobile = resolveAssetUrl(mobileImage || desktopImage)

  return (
    <section className="relative mb-8 overflow-hidden rounded-[34px] border border-[#e8dcca] bg-[#fffaf3] shadow-[0_24px_70px_rgba(45,31,18,0.12)]">
      {resolvedDesktop ? (
        <picture>
          {resolvedMobile ? <source media="(max-width: 767px)" srcSet={resolvedMobile} /> : null}
          <img alt={title} className="h-[420px] w-full object-cover md:h-[460px]" src={resolvedDesktop} />
        </picture>
      ) : (
        <div className="h-[360px] bg-[radial-gradient(circle_at_20%_20%,rgba(203,123,96,0.24),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(31,106,82,0.18),transparent_26%),linear-gradient(135deg,#fff8ec,#e8f1e8)] md:h-[430px]" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,49,38,0.82),rgba(23,49,38,0.42),rgba(23,49,38,0.08))]" />
      <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
        <h1 className="max-w-3xl text-4xl font-black leading-tight text-white md:text-6xl">{title}</h1>
        {subtitle ? (
          <p className="info-hero-subtitle-pill mt-4 inline-flex max-w-2xl rounded-full border border-white/24 bg-white/14 px-4 py-2 text-sm font-black text-[#fff5df] backdrop-blur">
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  )
}

function RichSection({ title, html, tone = 'light' }: { title?: string; html?: string; tone?: 'light' | 'green' }) {
  if (!title && !hasHtml(html)) return null

  return (
    <section className={`info-rich-section ${tone === 'green' ? 'info-rich-section--green' : ''}`}>
      {title ? <h2>{title}</h2> : null}
      {hasHtml(html) ? <div className="info-rich-content" dangerouslySetInnerHTML={{ __html: html || '' }} /> : null}
    </section>
  )
}

export function StorefrontAboutPage({ settings }: { settings: StorefrontInfoPagesSettings['about'] }) {
  return (
    <div className="info-page">
      <InfoHero
        desktopImage={settings.desktopHeroImageUrl}
        mobileImage={settings.mobileHeroImageUrl}
        subtitle={settings.heroSubtitle}
        title={settings.heroTitle || 'درباره گلینو'}
      />
      <div className="info-page__layout">
        <RichSection html={settings.introHtml} title={settings.introTitle} />
        <RichSection html={settings.storyHtml} title={settings.storyTitle} tone="green" />
        <RichSection html={settings.valuesHtml} title={settings.valuesTitle} />
      </div>
    </div>
  )
}

export function StorefrontTermsPage({ settings }: { settings: StorefrontInfoPagesSettings['terms'] }) {
  return (
    <div className="info-page">
      <InfoHero
        desktopImage={settings.desktopHeroImageUrl}
        mobileImage={settings.mobileHeroImageUrl}
        subtitle={settings.heroSubtitle}
        title={settings.heroTitle || 'قوانین و مقررات'}
      />
      <section className="info-terms">
        {settings.updatedAtLabel ? <p className="info-terms__date">{settings.updatedAtLabel}</p> : null}
        {hasHtml(settings.bodyHtml) ? (
          <div className="info-rich-content" dangerouslySetInnerHTML={{ __html: settings.bodyHtml }} />
        ) : (
          <p className="text-[#6e6152]">متن قوانین هنوز ثبت نشده است.</p>
        )}
      </section>
    </div>
  )
}

export function StorefrontContactPage({
  settings,
  shellPage,
}: {
  settings: StorefrontInfoPagesSettings['contact']
  shellPage: EnrichedStorefrontPage | null
}) {
  const footerConfig =
    typeof shellPage?.footerConfig === 'object' && shellPage.footerConfig !== null
      ? (shellPage.footerConfig as FooterConfig)
      : null
  const socials = Array.isArray(footerConfig?.socials)
    ? footerConfig.socials.filter((social) => social.enabled !== false && social.href && (social.imageUrl || (social.icon && isStorefrontSocialIconKey(social.icon))))
    : []

  const contactItems = [
    { label: 'تلفن', value: settings.phone, href: settings.phone ? `tel:${settings.phone.replace(/\s/g, '')}` : '' },
    { label: 'ایمیل', value: settings.email, href: settings.email ? `mailto:${settings.email}` : '' },
    { label: 'ساعت کاری', value: settings.workingHours, href: '' },
    { label: 'آدرس', value: settings.address, href: '' },
  ].filter((item) => item.value)

  return (
    <div className="info-page">
      <InfoHero
        desktopImage={settings.desktopHeroImageUrl}
        mobileImage={settings.mobileHeroImageUrl}
        subtitle={settings.heroSubtitle}
        title={settings.heroTitle || 'تماس با گلینو'}
      />
      <div className="contact-grid">
        <section className="contact-panel">
          {hasHtml(settings.contactIntroHtml) ? <div className="info-rich-content" dangerouslySetInnerHTML={{ __html: settings.contactIntroHtml }} /> : null}
          <div className="contact-cards">
            {contactItems.map((item) => {
              const content = (
                <>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </>
              )
              return item.href ? (
                <Link className="contact-card" href={item.href} key={item.label}>
                  {content}
                </Link>
              ) : (
                <div className="contact-card" key={item.label}>
                  {content}
                </div>
              )
            })}
          </div>
          {socials.length ? (
            <div className="contact-socials">
              {socials.map((social) => (
                <Link className="contact-social" href={social.href} key={`${social.label}-${social.href}`}>
                  {social.icon && isStorefrontSocialIconKey(social.icon) ? (
                    <SocialIcon icon={social.icon} label={social.label} />
                  ) : (
                    <img alt={social.label} src={resolveAssetUrl(String(social.imageUrl))} />
                  )}
                  <span>{social.label}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </section>
        {settings.mapEmbedHtml ? (
          <section className="contact-map" dangerouslySetInnerHTML={{ __html: settings.mapEmbedHtml }} />
        ) : null}
      </div>
    </div>
  )
}

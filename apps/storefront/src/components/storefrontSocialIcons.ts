export const STOREFRONT_SOCIAL_ICON_OPTIONS = [
  { value: 'bale', label: 'بله', simpleIconSlug: '' },
  { value: 'rubika', label: 'روبیکا', simpleIconSlug: '' },
  { value: 'eitaa', label: 'ایتا', simpleIconSlug: '' },
  { value: 'soroush', label: 'سروش', simpleIconSlug: '' },
  { value: 'aparat', label: 'آپارات', simpleIconSlug: 'aparat' },
  { value: 'telegram', label: 'تلگرام', simpleIconSlug: 'telegram' },
  { value: 'instagram', label: 'اینستاگرام', simpleIconSlug: 'instagram' },
  { value: 'x', label: 'ایکس', simpleIconSlug: 'x' },
  { value: 'youtube', label: 'یوتیوب', simpleIconSlug: 'youtube' },
  { value: 'pinterest', label: 'پینترست', simpleIconSlug: 'pinterest' },
  { value: 'threads', label: 'تردز', simpleIconSlug: 'threads' },
  { value: 'linkedin', label: 'لینکدین', simpleIconSlug: 'linkedin' },
  { value: 'whatsapp', label: 'واتس‌اپ', simpleIconSlug: 'whatsapp' },
] as const

export type StorefrontSocialIconKey = (typeof STOREFRONT_SOCIAL_ICON_OPTIONS)[number]['value']

export function isStorefrontSocialIconKey(value: string): value is StorefrontSocialIconKey {
  return STOREFRONT_SOCIAL_ICON_OPTIONS.some((item) => item.value === value)
}

export function getStorefrontSocialOption(value: string) {
  return STOREFRONT_SOCIAL_ICON_OPTIONS.find((item) => item.value === value) ?? null
}

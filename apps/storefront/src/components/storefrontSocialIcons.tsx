export const STOREFRONT_SOCIAL_ICON_OPTIONS = [
  { value: 'bale', label: 'بله' },
  { value: 'rubika', label: 'روبیکا' },
  { value: 'eitaa', label: 'ایتا' },
  { value: 'soroush', label: 'سروش' },
  { value: 'aparat', label: 'آپارات' },
  { value: 'telegram', label: 'تلگرام' },
  { value: 'instagram', label: 'اینستاگرام' },
  { value: 'x', label: 'ایکس' },
  { value: 'youtube', label: 'یوتیوب' },
  { value: 'pinterest', label: 'پینترست' },
  { value: 'threads', label: 'تردز' },
  { value: 'linkedin', label: 'لینکدین' },
  { value: 'whatsapp', label: 'واتس‌اپ' },
] as const

export type StorefrontSocialIconKey = (typeof STOREFRONT_SOCIAL_ICON_OPTIONS)[number]['value']

export function isStorefrontSocialIconKey(value: string): value is StorefrontSocialIconKey {
  return STOREFRONT_SOCIAL_ICON_OPTIONS.some((item) => item.value === value)
}

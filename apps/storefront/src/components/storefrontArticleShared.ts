export function formatArticleDate(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date(value))
}

export function buildMagArticleHref(slug: string) {
  return `/mag/${slug}`
}

export function buildMagCategoryHref(slug: string) {
  return `/mag/category/${slug}`
}

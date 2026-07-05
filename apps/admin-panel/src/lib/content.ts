import { readText } from './normalize'

export type ContentRecord = Record<string, unknown>

export const articleStatusLabels: Record<string, string> = {
  DRAFT: 'پیش نویس',
  PUBLISHED: 'منتشرشده',
}

export const contentAuditLabels: Record<string, string> = {
  ARTICLES_WITHOUT_TAG: 'مقاله‌های بدون تگ',
  ARTICLES_WITHOUT_FOCUS_KEYWORD: 'مقاله‌های بدون کلیدواژه',
  ARTICLES_WITHOUT_CATEGORY: 'مقاله‌های بدون دسته‌بندی',
  THIN_CATEGORIES: 'دسته‌بندی‌های کم‌محتوا',
}

export function toContentRecord(value: unknown): ContentRecord {
  return typeof value === 'object' && value !== null ? (value as ContentRecord) : {}
}

export function formatPersianNumber(value: number | string | null | undefined) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(numeric)) {
    return value === null || value === undefined || value === '' ? '—' : String(value)
  }

  return new Intl.NumberFormat('fa-IR').format(numeric)
}

export function formatBooleanLabel(value: unknown) {
  if (typeof value !== 'boolean') return '—'
  return value ? 'بله' : 'خیر'
}

export function formatJalaliDate(value: unknown, withTime = false) {
  if (typeof value !== 'string' || !value) return '—'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'

  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {}),
  }).format(parsed)
}

export function translateArticleStatus(status: string) {
  return (articleStatusLabels[status] ?? status) || 'نامشخص';
}

export function translateContentAuditType(type: string) {
  return contentAuditLabels[type] ?? 'پایش نامشخص';
}

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function getArticleStatus(record: ContentRecord) {
  return readText(record, ['status'], 'UNKNOWN')
}

export function getArticleStatusLabel(record: ContentRecord) {
  return translateArticleStatus(getArticleStatus(record))
}

export function getArticleTitle(record: ContentRecord) {
  return readText(record, ['title'], '—')
}

export function getArticleAuthor(record: ContentRecord) {
  const author = record.author
  if (typeof author === 'object' && author !== null) {
    return readText(author as ContentRecord, ['name', 'slug'], '—')
  }

  return readText(record, ['authorName', 'authorId'], '—')
}

export function getArticleCategory(record: ContentRecord) {
  const category = record.category
  if (typeof category === 'object' && category !== null) {
    return readText(category as ContentRecord, ['title', 'slug'], '—')
  }

  return readText(record, ['categoryTitle', 'categoryId'], '—')
}

export function getArticleTags(record: ContentRecord) {
  const tags = record.tags
  if (!Array.isArray(tags)) return []

  return tags
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null
      const relation = item as ContentRecord
      const tag = relation.tag
      if (typeof tag === 'object' && tag !== null) {
        return readText(tag as ContentRecord, ['title', 'slug'], '')
      }
      return readText(relation, ['title', 'slug'], '')
    })
    .filter((value): value is string => Boolean(value))
}

export function getArticleTagIds(record: ContentRecord) {
  const tags = record.tags
  if (!Array.isArray(tags)) return [] as number[]

  return tags
    .map((item) => {
      const relation = toContentRecord(item)
      const tag = toContentRecord(relation.tag)
      const candidate = tag.id ?? relation.tagId
      const parsed = Number(candidate)
      return Number.isNaN(parsed) ? null : parsed
    })
    .filter((value): value is number => value !== null)
}

export function countRelatedArticles(record: ContentRecord) {
  const countRecord = toContentRecord(record._count)
  const parsed = Number(countRecord.articles ?? 0)
  return Number.isNaN(parsed) ? 0 : parsed
}

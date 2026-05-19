import type { FeedItem, StatItem, TableRow } from '@flower-marketplace/frontend-core'

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

export function toArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.map((item) => toRecord(item))
  }

  const record = toRecord(value)
  if (Array.isArray(record.data)) {
    return record.data.map((item) => toRecord(item))
  }

  return []
}

export function readText(record: Record<string, unknown>, keys: string[], fallback = '—') {
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && value !== '') {
      return String(value)
    }
  }
  return fallback
}

export function readCount(value: unknown) {
  if (Array.isArray(value)) return value.length

  const record = toRecord(value)
  const numericKeys = ['total', 'count', 'totalCount', 'openCount', 'itemsCount']
  for (const key of numericKeys) {
    const candidate = record[key]
    if (typeof candidate === 'number') return candidate
  }

  if (Array.isArray(record.data)) {
    return record.data.length
  }

  return 0
}

export function makeRows(
  items: Record<string, unknown>[],
  columns: Array<{ key: string; source: string[] }>,
): TableRow[] {
  return items.map((item, index) => {
    const row: TableRow = {
      id: readText(item, ['id'], String(index + 1)),
    }

    for (const column of columns) {
      row[column.key] = readText(item, column.source)
    }

    return row
  })
}

export function makeFeed(items: Record<string, unknown>[], fallbackTitle: string): FeedItem[] {
  return items.slice(0, 6).map((item, index) => ({
    id: readText(item, ['id', 'key'], String(index + 1)),
    title: readText(item, ['title', 'topic', 'status', 'type'], fallbackTitle),
    meta: readText(item, ['createdAt', 'updatedAt', 'status'], 'backend event'),
    description: readText(item, ['message', 'description', 'note', 'reason'], 'جزئیات این رخداد بعد از اتصال کامل UI detail view نمایش داده می‌شود.'),
    tone: index % 3 === 0 ? 'warning' : index % 3 === 1 ? 'success' : 'danger',
  }))
}

export function makeStats(entries: Array<{ label: string; value: unknown; detail: string; tone?: StatItem['tone'] }>): StatItem[] {
  return entries.map((entry) => ({
    label: entry.label,
    value: String(readCount(entry.value)),
    delta: 'live backend',
    detail: entry.detail,
    tone: entry.tone,
  }))
}


export function readBoolean(record: Record<string, unknown>, keys: string[], fallback = false) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'boolean') return value
  }
  return fallback
}

export function readNumber(record: Record<string, unknown>, keys: string[], fallback = 0) {
  let value: unknown = record

  for (const key of keys) {
    if (typeof value !== 'object' || value === null) return fallback
    value = (value as Record<string, unknown>)[key]
  }

  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

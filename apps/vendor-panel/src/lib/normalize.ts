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

  if (Array.isArray(record.recentOrders)) {
    return record.recentOrders.map((item) => toRecord(item))
  }

  if (Array.isArray(record.recentTickets)) {
    return record.recentTickets.map((item) => toRecord(item))
  }

  if (Array.isArray(record.recentTransactions)) {
    return record.recentTransactions.map((item) => toRecord(item))
  }

  if (Array.isArray(record.timeline)) {
    return record.timeline.map((item) => toRecord(item))
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

export function readNestedCount(value: unknown, keys: string[]) {
  const record = toRecord(value)
  for (const key of keys) {
    const candidate = record[key]
    if (typeof candidate === 'number') return candidate
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
  return items.slice(0, 8).map((item, index) => ({
    id: readText(item, ['id'], String(index + 1)),
    title: readText(item, ['summary', 'topic', 'title', 'aggregateType', 'status'], fallbackTitle),
    meta: readText(item, ['createdAt', 'updatedAt', 'status'], 'vendor event'),
    description: readText(item, ['description', 'note', 'message', 'reason'], 'جزئیات بیشتر این آیتم بعدا در detail view نمایش داده می‌شود.'),
    tone: index % 3 === 0 ? 'success' : index % 3 === 1 ? 'warning' : 'danger',
  }))
}

export function makeStats(entries: Array<{ label: string; value: string; delta: string; detail: string; tone?: StatItem['tone'] }>): StatItem[] {
  return entries.map((entry) => ({
    label: entry.label,
    value: entry.value,
    delta: entry.delta,
    detail: entry.detail,
    tone: entry.tone,
  }))
}

export function formatFaNumber(value: number | string) {
  return new Intl.NumberFormat('fa-IR').format(typeof value === 'string' ? Number(value) : value)
}

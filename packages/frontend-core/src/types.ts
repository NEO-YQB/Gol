import type { ReactNode } from 'react'

export type NavItem = {
  key: string
  label: string
  hint?: string
  badge?: string
  active?: boolean
}

export type NavSection = {
  title: string
  items: NavItem[]
}

export type ShellAction = {
  label: string
  tone?: 'primary' | 'secondary' | 'ghost'
}

export type ShellAccountAction = {
  label: string
  onClick?: () => void
  tone?: 'default' | 'danger'
}

export type ShellAccountMenu = {
  profileLabel?: string
  storeName?: string
  phoneNumber?: string
  statusLabel?: string
  quickStats?: Array<{
    label: string
    value: string
  }>
  actions?: ShellAccountAction[]
}

export type StatTone = 'primary' | 'success' | 'warning' | 'danger'

export type StatItem = {
  label: string
  value: string
  delta: string
  detail: string
  hint?: string
  tone?: StatTone
}

export type TableColumn = {
  key: string
  label: string
}

export type TableRow = {
  id: string
  [key: string]: string
}

export type FeedItem = {
  id: string
  title: string
  meta: string
  description: string
  tone?: StatTone
}

export type SpotlightMetric = {
  label: string
  value: string
}

export type SpotlightProps = {
  eyebrow: string
  title: string
  description: string
  metrics: SpotlightMetric[]
  children?: ReactNode
}

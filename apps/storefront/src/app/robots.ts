import { MetadataRoute } from 'next'
import { getStorefrontSeoSettings } from '../lib/storefront'

type ParsedRobotsTxt = {
  rules: MetadataRoute.Robots['rules']
  host?: string
}

function parseRobotsTxt(text: string): ParsedRobotsTxt {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const groups: Array<{ userAgent: string; allow?: string[]; disallow?: string[] }> = []
  let current = { userAgent: '*' } as { userAgent: string; allow?: string[]; disallow?: string[] }
  let host: string | undefined

  for (const line of lines) {
    const [key, ...rest] = line.split(':')
    const value = rest.join(':').trim()
    if (!value) continue

    if (/^user-agent$/i.test(key)) {
      if (current.allow?.length || current.disallow?.length || current.userAgent !== '*') groups.push(current)
      current = { userAgent: value }
      continue
    }

    if (/^allow$/i.test(key)) {
      current.allow ||= []
      current.allow.push(value)
      continue
    }

    if (/^disallow$/i.test(key)) {
      current.disallow ||= []
      current.disallow.push(value)
      continue
    }

    if (/^host$/i.test(key)) {
      host = value
    }
  }

  if (current.allow?.length || current.disallow?.length || current.userAgent !== '*') groups.push(current)

  return {
    rules: groups.length ? groups : { userAgent: '*', allow: '/' },
    host,
  }
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getStorefrontSeoSettings()
  const siteUrl = seo?.siteUrl || 'https://golino.shop'
  const rulesText = seo?.robotsTxt?.trim()
  const parsed = rulesText ? parseRobotsTxt(rulesText) : { rules: { userAgent: '*', allow: '/' } }

  return {
    rules: parsed.rules,
    sitemap: `${siteUrl}/sitemap.xml`,
    ...(parsed.host ? { host: parsed.host } : {}),
  }
}

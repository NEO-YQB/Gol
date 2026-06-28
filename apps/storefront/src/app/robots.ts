import { MetadataRoute } from 'next'
import { getStorefrontSeoSettings } from '../lib/storefront'

function parseRobotsTxt(text: string): MetadataRoute.Robots['rules'] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const groups: Array<{ userAgent: string; allow?: string[]; disallow?: string[] }> = []
  let current = { userAgent: '*' } as { userAgent: string; allow?: string[]; disallow?: string[] }

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
    }
  }

  if (current.allow?.length || current.disallow?.length || current.userAgent !== '*') groups.push(current)
  return groups.length ? groups : { userAgent: '*', allow: '/' }
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getStorefrontSeoSettings()
  const siteUrl = seo?.siteUrl || 'https://golino.shop'
  const rules = seo?.robotsTxt?.trim()

  return {
    rules: rules ? parseRobotsTxt(rules) : { userAgent: '*', allow: '/' },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}

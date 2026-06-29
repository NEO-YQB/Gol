import { MetadataRoute } from 'next'
import {
  getAllStorefrontProductsForSitemap,
  getCategories,
  getProductTypes,
  getStorefrontArticleCategories,
  getStorefrontLatestArticles,
  getStorefrontSeoSettings,
  getStores,
} from '../lib/storefront'

function buildUrl(siteUrl: string, path: string) {
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}

function toLastModified(value?: string | null) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seo = await getStorefrontSeoSettings()
  const siteUrl = seo?.siteUrl || 'https://golino.shop'

  const [products, categories, stores, productTypes, articles, articleCategories] = await Promise.all([
    getAllStorefrontProductsForSitemap(100),
    getCategories(),
    getStores(),
    getProductTypes(),
    getStorefrontLatestArticles(200),
    getStorefrontArticleCategories(),
  ])

  const urls: MetadataRoute.Sitemap = [
    { url: buildUrl(siteUrl, '/'), changeFrequency: 'daily', priority: 1 },
    { url: buildUrl(siteUrl, '/shop'), changeFrequency: 'daily', priority: 0.9 },
    { url: buildUrl(siteUrl, '/mag'), changeFrequency: 'daily', priority: 0.8 },
  ]

  for (const product of products) {
    urls.push({
      url: buildUrl(siteUrl, `/products/${product.slug}`),
      lastModified: toLastModified(product.updatedAt || product.createdAt),
      changeFrequency: 'weekly',
      priority: 0.9,
    })
  }

  for (const category of categories) {
    urls.push({
      url: buildUrl(siteUrl, `/categories/${category.slug}`),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  for (const store of stores) {
    urls.push({
      url: buildUrl(siteUrl, `/stores/${store.slug}`),
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  for (const type of productTypes) {
    urls.push({
      url: buildUrl(siteUrl, `/product-types/${type.slug}`),
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  for (const article of articles) {
    urls.push({
      url: buildUrl(siteUrl, `/mag/${article.slug}`),
      lastModified: toLastModified(article.updatedAt || article.createdAt || article.publishedAt),
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  }

  for (const category of articleCategories) {
    urls.push({
      url: buildUrl(siteUrl, `/mag/${category.slug}`),
      changeFrequency: 'monthly',
      priority: 0.5,
    })
  }

  return urls
}

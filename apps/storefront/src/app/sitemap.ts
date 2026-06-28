import { MetadataRoute } from 'next'
import { getCategories, getStorefrontArticleCategories, getStorefrontLatestArticles, getStores, getStorefrontSeoSettings, getProductTypes } from '../lib/storefront'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seo = await getStorefrontSeoSettings()
  const siteUrl = seo?.siteUrl || 'https://golino.shop'

  const [categories, stores, productTypes, articles, articleCategories] = await Promise.all([
    getCategories(),
    getStores(),
    getProductTypes(),
    getStorefrontLatestArticles(50),
    getStorefrontArticleCategories(),
  ])

  const urls: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/mag`, changeFrequency: 'daily', priority: 0.8 },
  ]

  for (const category of categories) {
    urls.push({ url: `${siteUrl}/categories/${category.slug}`, changeFrequency: 'weekly', priority: 0.8 })
  }
  for (const store of stores) {
    urls.push({ url: `${siteUrl}/stores/${store.slug}`, changeFrequency: 'weekly', priority: 0.7 })
  }
  for (const type of productTypes) {
    urls.push({ url: `${siteUrl}/product-types/${type.slug}`, changeFrequency: 'weekly', priority: 0.7 })
  }
  for (const article of articles) {
    urls.push({ url: `${siteUrl}/mag/${article.slug}`, changeFrequency: 'monthly', priority: 0.6 })
  }
  for (const category of articleCategories) {
    urls.push({ url: `${siteUrl}/mag/${category.slug}`, changeFrequency: 'monthly', priority: 0.5 })
  }

  return urls
}

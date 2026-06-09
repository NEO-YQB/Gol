import { StorefrontArticleArchivePage } from '../../components/StorefrontArticleArchivePage'
import { StorefrontShell } from '../../components/StorefrontShell'
import {
  buildArchiveMetadata,
  buildCollectionPageJsonLd,
  getStorefrontArticleArchive,
  getStorefrontArticleCategories,
  getStorefrontLatestArticles,
} from '../../lib/storefront'

export async function generateMetadata() {
  return buildArchiveMetadata({
    title: 'مجله گلینو | مقالات گل، هدیه و ایده‌های مناسبتی',
    description: 'آرشیو مقاله‌های گلینو درباره گل، باکس هدیه، ایده‌های مناسبتی، راهنمای خرید و نکات الهام‌بخش.',
    path: '/mag',
    indexable: true,
    keywords: ['مجله گلینو', 'وبلاگ گل', 'مقالات گل و هدیه', 'راهنمای خرید گل', 'ایده هدیه'],
  })
}

export default async function MagArchivePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = (await searchParams) ?? {}
  const currentPage = typeof query.page === 'string' ? Number(query.page) || 1 : 1
  const archive = await getStorefrontArticleArchive({ page: currentPage, limit: 12, sort: 'NEWEST' })
  const latestArticles = await getStorefrontLatestArticles(5)
  const categories = await getStorefrontArticleCategories()
  const collectionJsonLd = buildCollectionPageJsonLd({
    title: 'مجله گلینو',
    description: 'آرشیو مقاله‌های گلینو درباره گل، هدیه و مناسبت‌ها.',
    path: '/mag',
  })

  return (
    <StorefrontShell>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
        type="application/ld+json"
      />
      <StorefrontArticleArchivePage
        articles={archive.data}
        basePath="/mag"
        categories={categories}
        currentPage={archive.meta.page}
        description="مقاله‌ها، راهنماها و ایده‌های الهام‌بخش گلینو را در این آرشیو دنبال کن."
        lastPage={archive.meta.lastPage}
        latestArticles={latestArticles}
        title="مجله گلینو"
        total={archive.meta.total}
      />
    </StorefrontShell>
  )
}

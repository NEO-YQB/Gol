import Link from 'next/link'
import {
  type ArticleCategorySummary,
  type ArticleSummary,
  resolveArticleCategoryPath,
} from '../lib/storefront'
import { storefrontShared } from './storefrontShared'
import { buildMagArticleHref, buildMagCategoryHref, formatArticleDate } from './storefrontArticleShared'

type Props = {
  title: string
  description: string
  latestArticles: ArticleSummary[]
  categories: ArticleCategorySummary[]
  articles: ArticleSummary[]
  total: number
  currentPage: number
  lastPage: number
  basePath: string
  activeCategory?: {
    title: string
    slug: string
  } | null
}

function resolvePageHref(basePath: string, page: number) {
  if (page <= 1) return basePath
  const separator = basePath.includes('?') ? '&' : '?'
  return `${basePath}${separator}page=${page}`
}

export function StorefrontArticleArchivePage({
  title,
  description,
  latestArticles,
  categories,
  articles,
  total,
  currentPage,
  lastPage,
  basePath,
  activeCategory,
}: Props) {
  const hero = latestArticles[0] || null
  const featuredGrid = latestArticles.slice(0, 5)

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[40px] bg-[linear-gradient(135deg,rgba(23,49,38,0.96),rgba(41,81,63,0.94),rgba(208,108,84,0.9))] px-6 py-7 text-white shadow-[0_22px_54px_rgba(31,41,30,0.18)] md:px-8 md:py-8">
        <div className="max-w-3xl">
          <div className="flex flex-wrap gap-2 text-xs font-bold text-white/82">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">مجله گلینو</span>
            {activeCategory ? <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">{activeCategory.title}</span> : null}
          </div>
          <h1 className="mt-4 text-3xl font-black leading-[1.7] md:text-[2.6rem]">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-white/84">{description}</p>
        </div>
      </section>

      {hero ? (
        <section className={storefrontShared.articleShowcase}>
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-[1.8rem] font-black text-[#173126] md:text-[2rem]">تازه‌ترین مطالب</h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-[#6d7a72]">آخرین نوشته‌های مجله را با یک چیدمان تمیز و خوانا اینجا ببین.</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_340px]">
            <Link className="group relative block min-h-[360px] overflow-hidden rounded-[32px] shadow-[0_18px_40px_rgba(38,24,9,0.09)]" href={buildMagArticleHref(hero.slug)}>
              {hero.coverImage ? (
                <img alt={hero.title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" src={hero.coverImage} />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(135deg,#173126_0%,#29513f_55%,#d06c54_100%)]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,31,24,0.04),rgba(16,31,24,0.78))]" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                {hero.category?.title ? (
                  <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-white/90">
                    {hero.category.title}
                  </span>
                ) : null}
                <h2 className="mt-4 text-2xl font-black leading-[1.7]">{hero.title}</h2>
                {hero.excerpt ? <p className="mt-3 max-w-2xl text-sm leading-7 text-white/84">{hero.excerpt}</p> : null}
              </div>
            </Link>

            <div className="grid gap-3">
              {featuredGrid.slice(1).map((article) => (
                <Link className="flex gap-3 rounded-[24px] border border-[#1f6a52]/10 bg-white/75 p-3 shadow-[0_12px_28px_rgba(35,31,19,0.06)] transition hover:-translate-y-0.5 hover:bg-white" href={buildMagArticleHref(article.slug)} key={article.id}>
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[18px] bg-[#efe1d2]">
                    {article.coverImage ? <img alt={article.title} className="h-full w-full object-cover" src={article.coverImage} /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="line-clamp-2 block text-sm font-black leading-7 text-[#173126]">{article.title}</strong>
                    {article.publishedAt ? <p className="mt-2 text-xs font-bold text-[#92785a]">{formatArticleDate(article.publishedAt)}</p> : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-[34px] bg-white/78 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
        <div className="flex flex-wrap gap-3">
          <Link className={`rounded-full px-4 py-2 text-sm font-bold transition ${!activeCategory ? 'bg-[#173126] text-white' : 'border border-[#1f6a52]/12 bg-[#f8f2e8] text-[#173126]'}`} href="/mag">
            همه مقالات
          </Link>
          {categories.map((category) => (
            <Link
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                activeCategory?.slug === category.slug
                  ? 'bg-[#173126] text-white'
                  : 'border border-[#1f6a52]/12 bg-[#f8f2e8] text-[#173126] hover:bg-white'
              }`}
              href={buildMagCategoryHref(resolveArticleCategoryPath(categories, category))}
              key={category.id}
            >
              {category.title}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_320px]">
        <div className="space-y-4">
          {articles.length ? articles.map((article) => (
            <article className="rounded-[30px] border border-[#1f6a52]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,242,233,0.92))] p-5 shadow-[0_14px_34px_rgba(52,36,17,0.05)]" key={article.id}>
              <div className="grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
                <Link className="overflow-hidden rounded-[24px] bg-[#efe1d2]" href={buildMagArticleHref(article.slug)}>
                  {article.coverImage ? <img alt={article.title} className="h-full w-full object-cover transition duration-500 hover:scale-105" src={article.coverImage} /> : null}
                </Link>
                <div>
                  <div className="flex flex-wrap gap-2 text-xs font-bold text-[#92785a]">
                    {article.category ? (
                      <Link
                        className="rounded-full bg-[#f4ecdf] px-3 py-1"
                        href={buildMagCategoryHref(resolveArticleCategoryPath(categories, article.category.slug))}
                      >
                        {article.category.title}
                      </Link>
                    ) : null}
                    {article.publishedAt ? <span>{formatArticleDate(article.publishedAt)}</span> : null}
                    {article.readingTimeMinutes ? <span>{`${new Intl.NumberFormat('fa-IR').format(article.readingTimeMinutes)} دقیقه مطالعه`}</span> : null}
                  </div>
                  <Link className="mt-3 block text-2xl font-black leading-[1.7] text-[#173126]" href={buildMagArticleHref(article.slug)}>
                    {article.title}
                  </Link>
                  {article.excerpt ? <p className="mt-3 text-sm leading-8 text-[#6e6152]">{article.excerpt}</p> : null}
                  <div className="mt-5">
                    <Link className="inline-flex rounded-full border border-[#1f6a52]/12 bg-white px-4 py-2 text-sm font-bold text-[#173126] transition hover:bg-[#173126] hover:text-white" href={buildMagArticleHref(article.slug)}>
                      مطالعه مقاله
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          )) : (
            <div className={storefrontShared.emptyState}>هنوز مقاله‌ای برای این بخش منتشر نشده است.</div>
          )}

          {lastPage > 1 ? (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {Array.from({ length: lastPage }, (_, index) => index + 1).map((pageNumber) => (
                <Link
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    pageNumber === currentPage
                      ? 'bg-[#173126] text-white'
                      : 'border border-[#1f6a52]/12 bg-white text-[#173126]'
                  }`}
                  href={resolvePageHref(basePath, pageNumber)}
                  key={pageNumber}
                >
                  {new Intl.NumberFormat('fa-IR').format(pageNumber)}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="space-y-5">
          <section className="rounded-[30px] bg-white/80 px-5 py-5 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
            <h3 className="text-lg font-black text-[#173126]">دسته‌بندی‌ها</h3>
            <div className="mt-4 grid gap-3">
              {categories.map((category) => (
                <Link className="flex items-center justify-between rounded-[20px] bg-[#f9f4ec] px-4 py-3 text-sm font-bold text-[#173126]" href={buildMagCategoryHref(resolveArticleCategoryPath(categories, category))} key={category.id}>
                  <span>{category.title}</span>
                  <span className="text-xs text-[#92785a]">{new Intl.NumberFormat('fa-IR').format(category._count?.articles || 0)}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] bg-[linear-gradient(180deg,rgba(247,251,248,0.9),rgba(255,255,255,0.82))] px-5 py-5 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
            <h3 className="text-lg font-black text-[#173126]">خلاصه این صفحه</h3>
            <div className="mt-4 space-y-3 text-sm leading-8 text-[#6e6152]">
              <p>{`${new Intl.NumberFormat('fa-IR').format(total)} مقاله در این آرشیو قابل مشاهده است.`}</p>
              <p>برای مطالعه دقیق‌تر، وارد صفحه هر مقاله شو و از فهرست هدینگ‌ها و مسیر ناوبری استفاده کن.</p>
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}

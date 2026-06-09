import Link from 'next/link'
import { type PublicArticleDetail } from '../lib/storefront'
import { buildMagCategoryHref, formatArticleDate } from './storefrontArticleShared'

type Props = {
  detail: PublicArticleDetail
}

function contentWithAnchors(html: string) {
  let index = 0
  return html.replace(/<h([1-6])([^>]*)>(.*?)<\/h\1>/gi, (_match, level, attrs, inner) => {
    index += 1
    const plainText = String(inner).replace(/<[^>]*>/g, ' ').trim()
    const slug = `section-${index}-${plainText
      .toLowerCase()
      .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')}`
    return `<h${level}${attrs} id="${slug}" class="scroll-mt-28">${inner}</h${level}>`
  })
}

function resolveHeadingIds(content: string, toc: Array<{ level: number; text: string }> = []) {
  let index = 0
  return toc.map((item) => {
    index += 1
    const slug = `section-${index}-${item.text
      .toLowerCase()
      .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')}`
    return { ...item, id: slug }
  })
}

export function StorefrontArticleDetailPage({ detail }: Props) {
  const article = detail.article
  const toc = resolveHeadingIds(article.content, article.tableOfContents || [])
  const html = contentWithAnchors(article.content)
  const breadcrumbItems = detail.breadcrumbs?.items || []
  const categoryPath = breadcrumbItems.slice(1, -1).map((item) => item.slug).join('/') || article.category.slug

  return (
    <div className="space-y-8">
      <nav aria-label="breadcrumb" className="rounded-[28px] bg-white/72 px-5 py-4 shadow-[0_10px_26px_rgba(52,36,17,0.05)]">
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#6e6152]">
          <Link className="font-bold text-[#173126]" href="/">خانه</Link>
          {breadcrumbItems.map((item, index) => {
            const href =
              index === 0
                ? '/mag'
                : index === breadcrumbItems.length - 1
                  ? `/mag/${article.slug}`
                  : buildMagCategoryHref(breadcrumbItems.slice(1, index + 1).map((entry) => entry.slug).join('/'))
            return (
              <span className="flex items-center gap-2" key={`${item.position}-${item.slug}`}>
                <span className="text-[#b8a18a]">/</span>
                <Link className="font-bold text-[#173126]" href={href}>{item.name}</Link>
              </span>
            )
          })}
        </div>
      </nav>

      <section className="overflow-hidden rounded-[40px] bg-[linear-gradient(135deg,rgba(23,49,38,0.96),rgba(41,81,63,0.94),rgba(208,108,84,0.88))] text-white shadow-[0_22px_54px_rgba(31,41,30,0.18)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="px-6 py-8 md:px-8">
            <div className="flex flex-wrap gap-2 text-xs font-bold text-white/82">
              <Link className="rounded-full border border-white/16 bg-white/10 px-3 py-2" href="/mag">مجله گلینو</Link>
              <Link className="rounded-full border border-white/16 bg-white/10 px-3 py-2" href={buildMagCategoryHref(categoryPath)}>{article.category.title}</Link>
            </div>
            <h1 className="mt-5 text-3xl font-black leading-[1.8] md:text-[2.8rem]">{article.title}</h1>
            {article.excerpt ? <p className="mt-4 max-w-3xl text-sm leading-8 text-white/84">{article.excerpt}</p> : null}
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-white/82">
              {article.publishedAt ? <span>{formatArticleDate(article.publishedAt)}</span> : null}
              {article.readingTimeMinutes ? <span>{`${new Intl.NumberFormat('fa-IR').format(article.readingTimeMinutes)} دقیقه مطالعه`}</span> : null}
              <span>{article.author.name}</span>
            </div>
          </div>
          <div className="min-h-[280px] bg-[#e7dccf]">
            {article.coverImage ? <img alt={article.title} className="h-full w-full object-cover" src={article.coverImage} /> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <article className="rounded-[34px] bg-white/84 px-6 py-6 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
          <div
            className="prose prose-lg max-w-none prose-headings:text-[#173126] prose-p:text-[#5f564c] prose-p:leading-8 prose-li:text-[#5f564c] prose-strong:text-[#173126] prose-a:text-[#1f6a52]"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {article.tags.length ? (
            <div className="mt-8 border-t border-[#efe4d6] pt-6">
              <h2 className="text-lg font-black text-[#173126]">برچسب‌ها</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {article.tags.map((item) => (
                  <span className="rounded-full border border-[#1f6a52]/12 bg-[#f8f2e8] px-4 py-2 text-sm font-bold text-[#173126]" key={item.tag.id}>
                    {item.tag.title}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </article>

        <aside className="space-y-5">
          <section className="rounded-[30px] bg-white/84 px-5 py-5 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
            <h3 className="text-lg font-black text-[#173126]">خلاصه مطلب</h3>
            <div className="mt-4 grid gap-3">
              {toc.length ? toc.map((item) => (
                <a
                  className={`rounded-[18px] px-3 py-2 text-sm font-bold text-[#173126] transition hover:bg-[#f8f2e8] ${item.level > 2 ? 'mr-4 text-[#5f564c]' : 'bg-[#fbf7f1]'}`}
                  href={`#${item.id}`}
                  key={item.id}
                >
                  {item.text}
                </a>
              )) : <p className="text-sm leading-7 text-[#6e6152]">برای این مقاله هنوز فهرست هدینگ‌ها در دسترس نیست.</p>}
            </div>
          </section>

          <section className="rounded-[30px] bg-white/84 px-5 py-5 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
            <h3 className="text-lg font-black text-[#173126]">مشخصات مقاله</h3>
            <div className="mt-4 space-y-3 text-sm leading-8 text-[#5f564c]">
              <p><strong className="text-[#173126]">نویسنده:</strong> {article.author.name}</p>
              <p><strong className="text-[#173126]">دسته‌بندی:</strong> {article.category.title}</p>
              {article.publishedAt ? <p><strong className="text-[#173126]">تاریخ انتشار:</strong> {formatArticleDate(article.publishedAt)}</p> : null}
              {article.readingTimeMinutes ? <p><strong className="text-[#173126]">زمان مطالعه:</strong> {`${new Intl.NumberFormat('fa-IR').format(article.readingTimeMinutes)} دقیقه`}</p> : null}
            </div>
          </section>

          <section className="rounded-[30px] bg-[linear-gradient(180deg,rgba(247,251,248,0.9),rgba(255,255,255,0.82))] px-5 py-5 shadow-[0_14px_34px_rgba(52,36,17,0.06)]">
            <h3 className="text-lg font-black text-[#173126]">ادامه مطالعه</h3>
            <p className="mt-3 text-sm leading-8 text-[#6e6152]">
              برای مرور مقاله‌های بیشتر و موضوعات مشابه، به آرشیو مجله یا دسته‌بندی این مطلب برگرد.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="rounded-full bg-[#173126] px-4 py-2 text-sm font-bold text-white" href="/mag">
                آرشیو مقالات
              </Link>
              <Link className="rounded-full border border-[#1f6a52]/12 bg-white px-4 py-2 text-sm font-bold text-[#173126]" href={buildMagCategoryHref(categoryPath)}>
                مقالات این دسته
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}

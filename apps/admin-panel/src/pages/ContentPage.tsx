import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { makeRows, readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type ContentRecord = Record<string, unknown>

const articleColumns = [
  { key: 'id', label: 'شناسه' },
  { key: 'title', label: 'عنوان' },
  { key: 'status', label: 'وضعیت' },
  { key: 'slug', label: 'slug' },
  { key: 'author', label: 'نویسنده' },
]

const auditColumns = [
  { key: 'type', label: 'audit' },
  { key: 'count', label: 'count' },
  { key: 'message', label: 'جزئیات' },
  { key: 'target', label: 'target' },
]

function getArticleStatus(record: ContentRecord) {
  return readText(record, ['status'], 'UNKNOWN')
}

function getArticleTitle(record: ContentRecord) {
  return readText(record, ['title'], '—')
}

function getArticleAuthor(record: ContentRecord) {
  const author = record.author
  if (typeof author === 'object' && author !== null) {
    return readText(author as ContentRecord, ['name', 'slug'], '—')
  }

  return readText(record, ['authorName', 'authorId'], '—')
}

function getArticleCategory(record: ContentRecord) {
  const category = record.category
  if (typeof category === 'object' && category !== null) {
    return readText(category as ContentRecord, ['title', 'slug'], '—')
  }

  return readText(record, ['categoryTitle', 'categoryId'], '—')
}

function getArticleTags(record: ContentRecord) {
  const tags = record.tags
  if (!Array.isArray(tags)) return []

  return tags
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null
      const relation = item as ContentRecord
      const tag = relation.tag
      if (typeof tag === 'object' && tag !== null) {
        return readText(tag as ContentRecord, ['title', 'slug'], '')
      }
      return readText(relation, ['title', 'slug'], '')
    })
    .filter((value): value is string => Boolean(value))
}

function formatPersianNumber(value: number | string) {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(numeric)) {
    return String(value)
  }

  return new Intl.NumberFormat('fa-IR').format(numeric)
}

function formatJalaliDate(value: unknown) {
  if (typeof value !== 'string' || !value) return '—'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'

  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed)
}

function statusOptions(items: ContentRecord[]) {
  const unique = Array.from(new Set(items.map((item) => getArticleStatus(item))))
  return ['ALL', ...unique]
}

export function ContentPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [articles, setArticles] = useState<ContentRecord[]>([])
  const [categories, setCategories] = useState<ContentRecord[]>([])
  const [tags, setTags] = useState<ContentRecord[]>([])
  const [authors, setAuthors] = useState<ContentRecord[]>([])
  const [audits, setAudits] = useState<ContentRecord[]>([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<ContentRecord | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [articlesPayload, categoriesPayload, tagsPayload, auditsPayload, authorsPayload] =
          await Promise.all([
            adminApi.getArticles(session),
            adminApi.getArticleCategories(session),
            adminApi.getArticleTags(session),
            adminApi.getContentAudits(session),
            adminApi.getAuthors(session),
          ])

        if (!active) return

        const articleList = toArray(articlesPayload)
        setArticles(articleList)
        setCategories(toArray(categoriesPayload))
        setTags(toArray(tagsPayload))
        setAudits(toArray(auditsPayload))
        setAuthors(toArray(authorsPayload))
        if (articleList.length > 0) {
          setSelectedArticleId(readText(articleList[0], ['id'], ''))
        }
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری content workspace')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [session])

  useEffect(() => {
    if (!selectedArticleId) {
      setSelectedArticle(null)
      setDetailError(null)
      return
    }

    const articleId = selectedArticleId
    let active = true

    async function loadDetail() {
      setDetailLoading(true)
      setDetailError(null)
      try {
        const payload = await adminApi.getArticleDetail(session, articleId)
        if (!active) return
        setSelectedArticle((payload as Record<string, unknown>) ?? null)
      } catch (loadError) {
        if (!active) return
        setDetailError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری جزئیات مقاله')
      } finally {
        if (active) setDetailLoading(false)
      }
    }

    void loadDetail()
    return () => {
      active = false
    }
  }, [selectedArticleId, session])

  const filteredArticles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return articles.filter((item) => {
      const matchesStatus = statusFilter === 'ALL' || getArticleStatus(item) === statusFilter
      if (!matchesStatus) return false
      if (!normalizedSearch) return true

      const haystack = [
        readText(item, ['id'], ''),
        getArticleTitle(item),
        getArticleStatus(item),
        readText(item, ['slug'], ''),
        getArticleAuthor(item),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [articles, search, statusFilter])

  useEffect(() => {
    if (filteredArticles.length === 0) {
      return
    }

    const hasSelected = filteredArticles.some((item) => readText(item, ['id'], '') === selectedArticleId)
    if (!hasSelected) {
      setSelectedArticleId(readText(filteredArticles[0], ['id'], ''))
    }
  }, [filteredArticles, selectedArticleId])

  const articleRows = useMemo(
    () =>
      makeRows(filteredArticles.slice(0, 20), [
        { key: 'id', source: ['id'] },
        { key: 'title', source: ['title'] },
        { key: 'status', source: ['status'] },
        { key: 'slug', source: ['slug'] },
        { key: 'author', source: ['authorName', 'authorId'] },
      ]),
    [filteredArticles],
  )

  const auditRows = useMemo(
    () =>
      makeRows(audits.slice(0, 10), [
        { key: 'type', source: ['type', 'title'] },
        { key: 'count', source: ['count', 'status'] },
        { key: 'message', source: ['message', 'slug'] },
        { key: 'target', source: ['category', 'articleId'] },
      ]),
    [audits],
  )

  const stats = useMemo(
    () => [
      {
        label: 'مقاله‌ها',
        value: formatPersianNumber(articles.length),
        delta: `${formatPersianNumber(filteredArticles.length)} در view فعلی`,
        detail: 'content/articles workspace',
        tone: 'primary' as const,
      },
      {
        label: 'نویسنده‌ها',
        value: formatPersianNumber(authors.length),
        delta: 'editorial ownership',
        detail: 'author profile و ownership content',
        tone: 'success' as const,
      },
      {
        label: 'taxonomyها',
        value: formatPersianNumber(categories.length + tags.length),
        delta: `${formatPersianNumber(categories.length)} category / ${formatPersianNumber(tags.length)} tag`,
        detail: 'pillar-cluster و tag structure',
        tone: 'warning' as const,
      },
      {
        label: 'auditها',
        value: formatPersianNumber(audits.length),
        delta: 'SEO hygiene',
        detail: 'thin taxonomy و missing metadata checks',
        tone: 'danger' as const,
      },
    ],
    [articles.length, filteredArticles.length, authors.length, categories.length, tags.length, audits.length],
  )

  const selectedSummary = selectedArticle
    ? [
        { label: 'عنوان', value: getArticleTitle(selectedArticle) },
        { label: 'وضعیت', value: getArticleStatus(selectedArticle) },
        { label: 'slug', value: readText(selectedArticle, ['slug'], '—') },
        { label: 'نویسنده', value: getArticleAuthor(selectedArticle) },
        { label: 'دسته‌بندی', value: getArticleCategory(selectedArticle) },
        {
          label: 'تگ‌ها',
          value: getArticleTags(selectedArticle).length > 0 ? getArticleTags(selectedArticle).slice(0, 3).join(' / ') : 'بدون تگ',
        },
        {
          label: 'زمان مطالعه',
          value: readText(selectedArticle, ['readingTimeMinutes'], '—') === '—'
            ? '—'
            : `${formatPersianNumber(readText(selectedArticle, ['readingTimeMinutes'], '0'))} دقیقه`,
        },
        { label: 'انتشار', value: formatJalaliDate(selectedArticle.publishedAt) },
        { label: 'آخرین بروزرسانی', value: formatJalaliDate(selectedArticle.updatedAt) },
        { label: 'meta title', value: readText(selectedArticle, ['metaTitle'], '—') },
        { label: 'focus keyword', value: readText(selectedArticle, ['focusKeyword'], '—') },
      ]
    : []

  const editorialSignals = useMemo(
    () => [
      {
        label: 'بدون تگ',
        value: formatPersianNumber(articles.filter((item) => getArticleTags(item).length === 0).length),
      },
      {
        label: 'بدون focus keyword',
        value: formatPersianNumber(
          articles.filter((item) => readText(item, ['focusKeyword'], '') === '').length,
        ),
      },
      {
        label: 'بدون meta title',
        value: formatPersianNumber(
          articles.filter((item) => readText(item, ['metaTitle'], '') === '').length,
        ),
      },
    ],
    [articles],
  )

  const taxonomyPreview = useMemo(
    () => ({
      categories: categories
        .slice(0, 4)
        .map((item) => readText(item, ['title', 'slug'], '—'))
        .filter((value) => value !== '—'),
      tags: tags
        .slice(0, 5)
        .map((item) => readText(item, ['title', 'slug'], '—'))
        .filter((value) => value !== '—'),
      authors: authors
        .slice(0, 4)
        .map((item) => readText(item, ['name', 'slug'], '—'))
        .filter((value) => value !== '—'),
    }),
    [authors, categories, tags],
  )

  return (
    <div className="fm-stack">
      <LoadableState error={error} loading={loading}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="Editorial workspace"
          title="workspace محتوا و SEO"
          description="این صفحه حالا فقط یک لیست مقاله نیست؛ search، filter، article selection، detail summary و audit visibility را در یک editorial workspace جمع می‌کند."
          actions={<Pill tone="primary">SEO-first workspace</Pill>}
        >
          <div className="content-toolbar">
            <div className="fm-field content-search">
              <label htmlFor="content-search">جستجو</label>
              <input
                id="content-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="شناسه، عنوان، slug، نویسنده یا وضعیت"
                value={search}
              />
            </div>

            <div className="content-filters">
              {statusOptions(articles).map((status) => (
                <button
                  className={`content-filter-chip${status === statusFilter ? ' is-active' : ''}`}
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  type="button"
                >
                  {status === 'ALL' ? 'همه' : status}
                </button>
              ))}
            </div>
          </div>

          <div className="content-layout">
            <div className="content-table-card">
              <DataTable columns={articleColumns} rows={articleRows} />
              {filteredArticles.length > 0 ? (
                <div className="content-selection-list">
                  {filteredArticles.slice(0, 8).map((item) => {
                    const articleId = readText(item, ['id'], '')
                    return (
                      <button
                        className={`content-selection-item${selectedArticleId === articleId ? ' is-active' : ''}`}
                        key={articleId}
                        onClick={() => setSelectedArticleId(articleId)}
                        type="button"
                      >
                        <strong>{getArticleTitle(item)}</strong>
                        <span>{readText(item, ['slug'], '—')}</span>
                        <small>
                          {getArticleStatus(item)} / {getArticleAuthor(item)}
                        </small>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="fm-message">با این فیلترها مقاله‌ای پیدا نشد.</div>
              )}
            </div>

            <div className="content-detail-column">
              <SectionCard
                eyebrow="Selected article"
                title={selectedArticleId ? `جزئیات مقاله #${selectedArticleId}` : 'هیچ مقاله‌ای انتخاب نشده'}
                description="این بلوک summary detail را از `/content/articles/:id` می‌گیرد و در مرحله بعد به full editorial detail مجهز می‌شود."
                actions={<Pill tone="success">detail ready</Pill>}
              >
                <div className="content-signal-grid">
                  {editorialSignals.map((item) => (
                    <article className="content-signal-item" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
                {detailLoading ? <div className="fm-message">در حال بارگذاری جزئیات مقاله...</div> : null}
                {detailError ? <div className="fm-message fm-message--danger">{detailError}</div> : null}
                {!detailLoading && !detailError && selectedSummary.length > 0 ? (
                  <div className="content-detail-grid">
                    {selectedSummary.map((item) => (
                      <article className="content-detail-item" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </article>
                    ))}
                    <article className="content-detail-item content-detail-item--wide">
                      <span>editorial readiness</span>
                      <strong>
                        در مرحله بعدی، tag assignment، category relation، reading time، TOC و history مقاله به همین detail workspace اضافه می‌شوند.
                      </strong>
                    </article>
                  </div>
                ) : null}
                {!detailLoading && !detailError && selectedSummary.length === 0 ? (
                  <div className="fm-message">برای مشاهده summary یک مقاله را از لیست انتخاب کن.</div>
                ) : null}
              </SectionCard>

              <SectionCard
                eyebrow="Taxonomy & audits"
                title="taxonomyها و auditهای محتوایی"
                description="editorial team باید هم‌زمان visibility روی category/tag structure و auditهای SEO داشته باشد."
                actions={<Pill tone="warning">editorial maturity</Pill>}
              >
                <div className="content-taxonomy-summary">
                  <article>
                    <span>categoryها</span>
                    <strong>{formatPersianNumber(categories.length)}</strong>
                  </article>
                  <article>
                    <span>tagها</span>
                    <strong>{formatPersianNumber(tags.length)}</strong>
                  </article>
                  <article>
                    <span>authorها</span>
                    <strong>{formatPersianNumber(authors.length)}</strong>
                  </article>
                </div>
                <div className="content-preview-grid">
                  <article className="content-preview-card">
                    <span>categoryهای شاخص</span>
                    <strong>{taxonomyPreview.categories.join(' / ') || 'هنوز دسته‌بندی ثبت نشده'}</strong>
                  </article>
                  <article className="content-preview-card">
                    <span>tagهای شاخص</span>
                    <strong>{taxonomyPreview.tags.join(' / ') || 'هنوز تگی ثبت نشده'}</strong>
                  </article>
                  <article className="content-preview-card">
                    <span>نویسنده‌های فعال</span>
                    <strong>{taxonomyPreview.authors.join(' / ') || 'هنوز نویسنده‌ای ثبت نشده'}</strong>
                  </article>
                </div>
                <DataTable columns={auditColumns} rows={auditRows} />
              </SectionCard>
            </div>
          </div>
        </SectionCard>
      </LoadableState>
    </div>
  )
}

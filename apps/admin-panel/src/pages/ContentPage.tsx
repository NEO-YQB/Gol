import { DataTable, Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import {
  countRelatedArticles,
  formatJalaliDate,
  formatPersianNumber,
  getArticleAuthor,
  getArticleCategory,
  getArticleStatus,
  getArticleStatusLabel,
  getArticleTags,
  getArticleTitle,
  toContentRecord,
  translateContentAuditType,
} from '../lib/content'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type ContentPageProps = {
  session: AuthSession
  onCreateArticle: () => void
  onEditArticle: (articleId: string) => void
}

type ContentRecord = Record<string, unknown>

const articleColumns = [
  { key: 'title', label: 'مقاله' },
  { key: 'status', label: 'وضعیت' },
  { key: 'author', label: 'نویسنده' },
  { key: 'category', label: 'دسته بندی' },
  { key: 'updatedAt', label: 'آخرین بروزرسانی' },
]

const auditColumns = [
  { key: 'type', label: 'نوع audit' },
  { key: 'count', label: 'تعداد' },
  { key: 'message', label: 'جزئیات' },
  { key: 'target', label: 'هدف' },
]

const statusFilterOptions = [
  { value: 'ALL', label: 'همه وضعیت ها' },
  { value: 'DRAFT', label: 'پیش نویس' },
  { value: 'PUBLISHED', label: 'منتشرشده' },
] as const

function toNumericId(value: string) {
  const parsed = Number(value)
  return Number.isNaN(parsed) || parsed <= 0 ? undefined : parsed
}

export function ContentPage({ session, onCreateArticle, onEditArticle }: ContentPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [articles, setArticles] = useState<ContentRecord[]>([])
  const [categories, setCategories] = useState<ContentRecord[]>([])
  const [tags, setTags] = useState<ContentRecord[]>([])
  const [authors, setAuthors] = useState<ContentRecord[]>([])
  const [audits, setAudits] = useState<ContentRecord[]>([])
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilterOptions)[number]['value']>('ALL')
  const [authorFilter, setAuthorFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [tagFilter, setTagFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<ContentRecord | null>(null)

  useEffect(() => {
    let active = true

    async function loadReferenceData() {
      try {
        const [categoriesPayload, tagsPayload, auditsPayload, authorsPayload] = await Promise.all([
          adminApi.getArticleCategories(session),
          adminApi.getArticleTags(session),
          adminApi.getContentAudits(session),
          adminApi.getAuthors(session),
        ])

        if (!active) return

        setCategories(toArray(categoriesPayload))
        setTags(toArray(tagsPayload))
        setAudits(toArray(auditsPayload))
        setAuthors(toArray(authorsPayload))
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری داده های مرجع محتوا')
      }
    }

    void loadReferenceData()
    return () => {
      active = false
    }
  }, [session])

  useEffect(() => {
    let active = true

    async function loadArticles() {
      setLoading(true)
      setError(null)

      try {
        const payload = await adminApi.getArticles(session, {
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          authorId: authorFilter === 'ALL' ? undefined : toNumericId(authorFilter),
          categoryId: categoryFilter === 'ALL' ? undefined : toNumericId(categoryFilter),
          tagId: tagFilter === 'ALL' ? undefined : toNumericId(tagFilter),
          page: 1,
          limit: 100,
        })

        if (!active) return

        const articleList = toArray(payload)
        setArticles(articleList)
        if (articleList.length === 0) {
          setSelectedArticleId(null)
          setSelectedArticle(null)
          return
        }

        const hasSelected = articleList.some((item) => readText(item, ['id'], '') === selectedArticleId)
        setSelectedArticleId(hasSelected ? selectedArticleId : readText(articleList[0], ['id'], ''))
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری کارتابل محتوا')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadArticles()
    return () => {
      active = false
    }
  }, [authorFilter, categoryFilter, selectedArticleId, session, statusFilter, tagFilter])

  useEffect(() => {
    if (!selectedArticleId) {
      setSelectedArticle(null)
      setDetailError(null)
      return
    }

    let active = true

    async function loadDetail() {
      setDetailLoading(true)
      setDetailError(null)
      try {
        const payload = await adminApi.getArticleDetail(session, selectedArticleId)
        if (!active) return
        setSelectedArticle(toContentRecord(payload))
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
    if (!normalizedSearch) return articles

    return articles.filter((item) => {
      const haystack = [
        readText(item, ['id'], ''),
        getArticleTitle(item),
        getArticleStatusLabel(item),
        readText(item, ['slug'], ''),
        getArticleAuthor(item),
        getArticleCategory(item),
        getArticleTags(item).join(' '),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [articles, search])

  useEffect(() => {
    if (filteredArticles.length === 0) return

    const hasSelected = filteredArticles.some((item) => readText(item, ['id'], '') === selectedArticleId)
    if (!hasSelected) {
      setSelectedArticleId(readText(filteredArticles[0], ['id'], ''))
    }
  }, [filteredArticles, selectedArticleId])

  const articleRows = useMemo(
    () =>
      filteredArticles.slice(0, 20).map((item, index) => ({
        id: readText(item, ['id'], String(index + 1)),
        title: getArticleTitle(item),
        status: getArticleStatusLabel(item),
        author: getArticleAuthor(item),
        category: getArticleCategory(item),
        updatedAt: formatJalaliDate(item.updatedAt, true),
      })),
    [filteredArticles],
  )

  const auditRows = useMemo(
    () =>
      audits.slice(0, 10).map((item, index) => ({
        id: readText(item, ['type', 'id'], String(index + 1)),
        type: translateContentAuditType(readText(item, ['type'], 'UNKNOWN')),
        count: formatPersianNumber(readText(item, ['count'], '0')),
        message: readText(item, ['message'], '—'),
        target: readText(item, ['category', 'articleId', 'target'], 'همه محتواها'),
      })),
    [audits],
  )

  const stats = useMemo(
    () => [
      {
        label: 'مقاله ها',
        value: formatPersianNumber(articles.length),
        delta: `${formatPersianNumber(filteredArticles.length)} در نمای فعلی`,
        detail: 'کارتابل اصلی مقاله ها',
        tone: 'primary' as const,
      },
      {
        label: 'نویسنده ها',
        value: formatPersianNumber(authors.length),
        delta: 'مالکیت تحریریه',
        detail: 'پروفایل نویسنده و ownership محتوا',
        tone: 'success' as const,
      },
      {
        label: 'taxonomyها',
        value: formatPersianNumber(categories.length + tags.length),
        delta: `${formatPersianNumber(categories.length)} دسته / ${formatPersianNumber(tags.length)} تگ`,
        detail: 'ساختار دسته بندی و تگ',
        tone: 'warning' as const,
      },
      {
        label: 'auditها',
        value: formatPersianNumber(audits.length),
        delta: 'بهداشت سئو',
        detail: 'سیگنال های محتوایی و SEO',
        tone: 'danger' as const,
      },
    ],
    [articles.length, filteredArticles.length, authors.length, categories.length, tags.length, audits.length],
  )

  const selectedSummary = selectedArticle
    ? [
        { label: 'عنوان', value: getArticleTitle(selectedArticle) },
        { label: 'وضعیت', value: getArticleStatusLabel(selectedArticle) },
        { label: 'اسلاگ', value: readText(selectedArticle, ['slug'], '—') },
        { label: 'نویسنده', value: getArticleAuthor(selectedArticle) },
        { label: 'دسته بندی', value: getArticleCategory(selectedArticle) },
        {
          label: 'تگ ها',
          value: getArticleTags(selectedArticle).length > 0 ? getArticleTags(selectedArticle).slice(0, 4).join(' / ') : 'بدون تگ',
        },
        {
          label: 'زمان مطالعه',
          value:
            readText(selectedArticle, ['readingTimeMinutes'], '') === ''
              ? '—'
              : `${formatPersianNumber(readText(selectedArticle, ['readingTimeMinutes'], '0'))} دقیقه`,
        },
        { label: 'انتشار', value: formatJalaliDate(selectedArticle.publishedAt, true) },
        { label: 'آخرین بروزرسانی', value: formatJalaliDate(selectedArticle.updatedAt, true) },
        { label: 'meta title', value: readText(selectedArticle, ['metaTitle'], '—') },
        { label: 'کلیدواژه کانونی', value: readText(selectedArticle, ['focusKeyword'], '—') },
        { label: 'robots index', value: typeof selectedArticle.robotsIndex === 'boolean' ? (selectedArticle.robotsIndex ? 'فعال' : 'غیرفعال') : '—' },
        { label: 'robots follow', value: typeof selectedArticle.robotsFollow === 'boolean' ? (selectedArticle.robotsFollow ? 'فعال' : 'غیرفعال') : '—' },
      ]
    : []

  const editorialSignals = useMemo(
    () => [
      {
        label: 'بدون تگ',
        value: formatPersianNumber(articles.filter((item) => getArticleTags(item).length === 0).length),
      },
      {
        label: 'بدون کلیدواژه',
        value: formatPersianNumber(articles.filter((item) => readText(item, ['focusKeyword'], '') === '').length),
      },
      {
        label: 'بدون meta title',
        value: formatPersianNumber(articles.filter((item) => readText(item, ['metaTitle'], '') === '').length),
      },
    ],
    [articles],
  )

  const taxonomyPreview = useMemo(
    () => ({
      categories: categories
        .slice(0, 4)
        .map((item) => `${readText(item, ['title'], '—')} (${formatPersianNumber(countRelatedArticles(item))})`)
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
          eyebrow="Content desk"
          title="کارتابل محتوا و SEO"
          description="این سطح فقط برای پایش، filter، triage و انتخاب آیتم است. ساخت و ویرایش کامل مقاله در workspace جدا انجام می شود."
          actions={
            <div className="content-header-actions">
              <Pill tone="primary">editorial ops</Pill>
              <button className="content-primary-action" onClick={onCreateArticle} type="button">
                مقاله جدید
              </button>
            </div>
          }
        >
          <div className="content-toolbar content-toolbar--dense">
            <div className="fm-field content-search">
              <label htmlFor="content-search">جستجو</label>
              <input
                id="content-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="عنوان، اسلاگ، نویسنده، دسته بندی یا تگ"
                value={search}
              />
            </div>

            <div className="content-select-grid">
              <label className="fm-field">
                <span>وضعیت</span>
                <select onChange={(event) => setStatusFilter(event.target.value as (typeof statusFilterOptions)[number]['value'])} value={statusFilter}>
                  {statusFilterOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="fm-field">
                <span>نویسنده</span>
                <select onChange={(event) => setAuthorFilter(event.target.value)} value={authorFilter}>
                  <option value="ALL">همه نویسنده ها</option>
                  {authors.map((item) => {
                    const id = readText(item, ['id'], '')
                    return (
                      <option key={id} value={id}>
                        {readText(item, ['name'], '—')}
                      </option>
                    )
                  })}
                </select>
              </label>

              <label className="fm-field">
                <span>دسته بندی</span>
                <select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
                  <option value="ALL">همه دسته ها</option>
                  {categories.map((item) => {
                    const id = readText(item, ['id'], '')
                    return (
                      <option key={id} value={id}>
                        {readText(item, ['title'], '—')}
                      </option>
                    )
                  })}
                </select>
              </label>

              <label className="fm-field">
                <span>تگ</span>
                <select onChange={(event) => setTagFilter(event.target.value)} value={tagFilter}>
                  <option value="ALL">همه تگ ها</option>
                  {tags.map((item) => {
                    const id = readText(item, ['id'], '')
                    return (
                      <option key={id} value={id}>
                        {readText(item, ['title'], '—')}
                      </option>
                    )
                  })}
                </select>
              </label>
            </div>
          </div>

          <div className="content-layout content-layout--expanded">
            <div className="content-table-card">
              <DataTable columns={articleColumns} rows={articleRows} />
              {filteredArticles.length > 0 ? (
                <div className="content-selection-list">
                  {filteredArticles.slice(0, 8).map((item) => {
                    const articleId = readText(item, ['id'], '')
                    const isActive = selectedArticleId === articleId
                    return (
                      <article className={`content-selection-item${isActive ? ' is-active' : ''}`} key={articleId}>
                        <div className="content-selection-head">
                          <div>
                            <strong>{getArticleTitle(item)}</strong>
                            <span>{readText(item, ['slug'], '—')}</span>
                          </div>
                          <Pill tone={getArticleStatus(item) === 'PUBLISHED' ? 'success' : 'warning'}>
                            {getArticleStatusLabel(item)}
                          </Pill>
                        </div>
                        <small>
                          {getArticleAuthor(item)} / {getArticleCategory(item)}
                        </small>
                        <div className="content-selection-meta">
                          <span>{formatJalaliDate(item.updatedAt, true)}</span>
                          <button onClick={() => setSelectedArticleId(articleId)} type="button">
                            مشاهده خلاصه
                          </button>
                          <button onClick={() => onEditArticle(articleId)} type="button">
                            ویرایش کامل
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="fm-message">با این فیلترها مقاله ای پیدا نشد.</div>
              )}
            </div>

            <div className="content-detail-column">
              <SectionCard
                eyebrow="Selected article"
                title={selectedArticleId ? `خلاصه مقاله #${selectedArticleId}` : 'هیچ مقاله ای انتخاب نشده'}
                description="این بلوک برای تصمیم سریع است. برای نگارش، SEO و taxonomy باید وارد workspace جدا شوید."
                actions={
                  selectedArticleId ? (
                    <button className="content-secondary-action" onClick={() => onEditArticle(selectedArticleId)} type="button">
                      باز کردن editor
                    </button>
                  ) : null
                }
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
                      <span>گام بعدی روی این مقاله</span>
                      <strong>
                        برای ویرایش متن، SEO، نویسنده، دسته بندی و تگ ها وارد editor workspace شوید تا در surface متمرکز کار کنید.
                      </strong>
                    </article>
                  </div>
                ) : null}
                {!detailLoading && !detailError && selectedSummary.length === 0 ? (
                  <div className="fm-message">برای مشاهده خلاصه یک مقاله را از لیست انتخاب کن.</div>
                ) : null}
              </SectionCard>

              <SectionCard
                eyebrow="Taxonomy & audits"
                title="taxonomyها و auditهای محتوایی"
                description="visibility روی دسته بندی، تگ، نویسنده و auditها از همین صفحه حفظ می شود، ولی مدیریت سنگین در editor workspace انجام می شود."
                actions={<Pill tone="warning">SEO maturity</Pill>}
              >
                <div className="content-taxonomy-summary">
                  <article>
                    <span>دسته بندی ها</span>
                    <strong>{formatPersianNumber(categories.length)}</strong>
                  </article>
                  <article>
                    <span>تگ ها</span>
                    <strong>{formatPersianNumber(tags.length)}</strong>
                  </article>
                  <article>
                    <span>نویسنده ها</span>
                    <strong>{formatPersianNumber(authors.length)}</strong>
                  </article>
                </div>
                <div className="content-preview-grid">
                  <article className="content-preview-card">
                    <span>دسته های شاخص</span>
                    <strong>{taxonomyPreview.categories.join(' / ') || 'هنوز دسته بندی ثبت نشده'}</strong>
                  </article>
                  <article className="content-preview-card">
                    <span>تگ های شاخص</span>
                    <strong>{taxonomyPreview.tags.join(' / ') || 'هنوز تگی ثبت نشده'}</strong>
                  </article>
                  <article className="content-preview-card">
                    <span>نویسنده های فعال</span>
                    <strong>{taxonomyPreview.authors.join(' / ') || 'هنوز نویسنده ای ثبت نشده'}</strong>
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

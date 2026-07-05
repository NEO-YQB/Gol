import { Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import {
  formatJalaliDate,
  formatPersianNumber,
  getArticleAuthor,
  getArticleCategory,
  getArticleStatus,
  getArticleStatusLabel,
  getArticleTags,
  getArticleTitle,
  toContentRecord,
} from '../lib/content'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type ContentPageProps = {
  session: AuthSession
  onCreateArticle: () => void
  onEditArticle: (articleId: string) => void
}

type ContentRecord = Record<string, unknown>

const statusFilterOptions = [
  { value: 'ALL', label: 'همه وضعیت‌ها' },
  { value: 'DRAFT', label: 'پیش‌نویس' },
  { value: 'PUBLISHED', label: 'منتشرشده' },
] as const

const articleSelectionPageSize = 8
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
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilterOptions)[number]['value']>('ALL')
  const [authorFilter, setAuthorFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [tagFilter, setTagFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [articleSelectionPage, setArticleSelectionPage] = useState(1)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<ContentRecord | null>(null)
  useNoticeEffect(detailError, 'error')

  useEffect(() => {
    let active = true

    async function loadReferenceData() {
      try {
        const [categoriesPayload, tagsPayload, authorsPayload] = await Promise.all([
          adminApi.getArticleCategories(session),
          adminApi.getArticleTags(session),
          adminApi.getAuthors(session),
        ])

        if (!active) return

        setCategories(toArray(categoriesPayload))
        setTags(toArray(tagsPayload))
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
      if (!selectedArticleId) return
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
    setArticleSelectionPage(1)
  }, [search, statusFilter, authorFilter, categoryFilter, tagFilter, articles.length])

  useEffect(() => {
    if (filteredArticles.length === 0) return

    const hasSelected = filteredArticles.some((item) => readText(item, ['id'], '') === selectedArticleId)
    if (!hasSelected) {
      setSelectedArticleId(readText(filteredArticles[0], ['id'], ''))
    }
  }, [filteredArticles, selectedArticleId])

  const stats = useMemo(
    () => [
      {
        label: 'مقاله‌ها',
        value: formatPersianNumber(articles.length),
        delta: `${formatPersianNumber(filteredArticles.length)} در فیلتر`,
        detail: '',
        tone: 'primary' as const,
      },
      {
        label: 'نویسنده‌ها',
        value: formatPersianNumber(authors.length),
        delta: 'مالکیت تحریریه',
        detail: '',
        tone: 'success' as const,
      },
      {
        label: 'تاکسونومی',
        value: formatPersianNumber(categories.length + tags.length),
        delta: `${formatPersianNumber(categories.length)} دسته / ${formatPersianNumber(tags.length)} تگ`,
        detail: '',
        tone: 'warning' as const,
      },
    ],
    [articles.length, filteredArticles.length, authors.length, categories.length, tags.length],
  )

  const selectedSummary = selectedArticle
    ? [
        { label: 'عنوان', value: getArticleTitle(selectedArticle) },
        { label: 'وضعیت', value: getArticleStatusLabel(selectedArticle) },
        { label: 'اسلاگ', value: readText(selectedArticle, ['slug'], '—') },
        { label: 'نویسنده', value: getArticleAuthor(selectedArticle) },
        { label: 'دسته‌بندی', value: getArticleCategory(selectedArticle) },
        {
          label: 'برچسب‌ها',
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
        { label: 'آخرین به‌روزرسانی', value: formatJalaliDate(selectedArticle.updatedAt, true) },
        { label: 'عنوان متا', value: readText(selectedArticle, ['metaTitle'], '—') },
        { label: 'توضیح متا', value: readText(selectedArticle, ['metaDescription'], '—') },
        { label: 'کلیدواژه کانونی', value: readText(selectedArticle, ['focusKeyword'], '—') },
        { label: 'اجازه دیده‌شدن در جستجو', value: typeof selectedArticle.robotsIndex === 'boolean' ? (selectedArticle.robotsIndex ? 'فعال' : 'غیرفعال') : '—' },
        { label: 'اجازه دنبال‌کردن پیوندها', value: typeof selectedArticle.robotsFollow === 'boolean' ? (selectedArticle.robotsFollow ? 'فعال' : 'غیرفعال') : '—' },
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
        label: 'بدون عنوان متا',
        value: formatPersianNumber(articles.filter((item) => readText(item, ['metaTitle'], '') === '').length),
      },
    ],
    [articles],
  )

  const queueSummary = useMemo(
    () => [
      {
        label: 'منتشرشده',
        value: formatPersianNumber(articles.filter((item) => getArticleStatus(item) === 'PUBLISHED').length),
      },
      {
        label: 'پیش‌نویس',
        value: formatPersianNumber(articles.filter((item) => getArticleStatus(item) !== 'PUBLISHED').length),
      },
      {
        label: 'نیازمند تکمیل سئو',
        value: formatPersianNumber(
          articles.filter(
            (item) =>
              readText(item, ['metaTitle'], '') === '' ||
              readText(item, ['metaDescription'], '') === '' ||
              readText(item, ['focusKeyword'], '') === '',
          ).length,
        ),
      },
    ],
    [articles],
  )

  const articleSelectionPageCount = Math.max(1, Math.ceil(filteredArticles.length / articleSelectionPageSize))
  const articleSelectionItems = filteredArticles.slice(
    (articleSelectionPage - 1) * articleSelectionPageSize,
    articleSelectionPage * articleSelectionPageSize,
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
          eyebrow="کارتابل محتوا"
          title="مقاله‌ها"
          actions={
            <div className="content-header-actions">
              <button className="content-primary-action" onClick={onCreateArticle} type="button">
                مقاله جدید
              </button>
            </div>
          }
        >
          <div className="content-toolbar content-toolbar--dense">
            <div className="content-queue-grid">
              {queueSummary.map((item) => (
                <article className="content-queue-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>

            <div className="fm-field content-search">
              <label htmlFor="content-search">جستجو</label>
              <input
                id="content-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="عنوان، اسلاگ، نویسنده، دسته‌بندی یا تگ"
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
                  <option value="ALL">همه نویسنده‌ها</option>
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
                <span>دسته‌بندی</span>
                <select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
                  <option value="ALL">همه دسته‌ها</option>
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
                  <option value="ALL">همه برچسب‌ها</option>
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

          <div className="content-layout">
            <div className="content-table-card content-table-card--full">
              <div className="content-results-head">
                <strong>فهرست مقاله‌ها</strong>
                <span>
                  {formatPersianNumber(filteredArticles.length)} نتیجه از {formatPersianNumber(articles.length)} مقاله
                </span>
              </div>
              {filteredArticles.length > 0 ? (
                <>
                  <div className="content-selection-list">
                    {articleSelectionItems.map((item) => {
                      const articleId = readText(item, ['id'], '')
                      const isActive = selectedArticleId === articleId
                      return (
                        <article className={`content-selection-item${isActive ? ' is-active' : ''}`} key={articleId} onClick={() => setSelectedArticleId(articleId)} role="button" tabIndex={0}>
                          <strong>{getArticleTitle(item)}</strong>
                          <span>{getArticleAuthor(item)}</span>
                          <span>{getArticleCategory(item)}</span>
                          <small>{readText(item, ['slug'], '—')}</small>
                          <Pill tone={getArticleStatus(item) === 'PUBLISHED' ? 'success' : 'warning'}>
                            {getArticleStatusLabel(item)}
                          </Pill>
                          <span>{formatJalaliDate(item.updatedAt, true)}</span>
                          <button className="content-selection-edit" onClick={(event) => { event.stopPropagation(); onEditArticle(articleId) }} type="button">
                            ویرایش
                          </button>
                        </article>
                      )
                    })}
                  </div>
                  {filteredArticles.length > articleSelectionPageSize ? (
                    <div className="vendors-pagination">
                      <button
                        className="vendors-page-button"
                        disabled={articleSelectionPage <= 1}
                        onClick={() => setArticleSelectionPage((current) => Math.max(1, current - 1))}
                        type="button"
                      >
                        مقاله‌های قبل
                      </button>
                      <span>{`صفحه ${formatPersianNumber(articleSelectionPage)} از ${formatPersianNumber(articleSelectionPageCount)}`}</span>
                      <button
                        className="vendors-page-button"
                        disabled={articleSelectionPage >= articleSelectionPageCount}
                        onClick={() => setArticleSelectionPage((current) => Math.min(articleSelectionPageCount, current + 1))}
                        type="button"
                      >
                        مقاله‌های بعد
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="fm-message">با این فیلترها مقاله‌ای پیدا نشد.</div>
              )}
            </div>

            <div className="content-detail-column">
              <SectionCard
                eyebrow="انتخاب‌شده"
                title={selectedArticle ? getArticleTitle(selectedArticle) : selectedArticleId ? `مقاله #${selectedArticleId}` : 'انتخاب نشده'}
                actions={
                  selectedArticleId ? (
                    <button className="content-secondary-action" onClick={() => onEditArticle(selectedArticleId)} type="button">
                      ویرایش
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
                {!detailLoading && !detailError && selectedSummary.length > 0 ? (
                  <div className="content-detail-grid">
                    {selectedSummary.map((item) => (
                      <article className="content-detail-item" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </article>
                    ))}
                    <article className="content-detail-item content-detail-item--wide">
                      <span>خلاصه کوتاه</span>
                      <strong>{readText(selectedArticle ?? {}, ['excerpt'], 'هنوز خلاصه کوتاه ثبت نشده است.')}</strong>
                    </article>
                  </div>
                ) : null}
                {!detailLoading && !detailError && selectedSummary.length === 0 ? (
                  <div className="fm-message">برای مشاهده خلاصه یک مقاله را از لیست انتخاب کن.</div>
                ) : null}
              </SectionCard>
            </div>
          </div>
        </SectionCard>


      </LoadableState>
    </div>
  )
}

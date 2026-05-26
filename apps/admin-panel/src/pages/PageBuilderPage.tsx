import { Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi, apiConfig } from '../lib/api'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type PageBuilderPageProps = {
  session: AuthSession
  onCreatePage: () => void
  onEditPage: (pageId: string) => void
}

type PageRecord = Record<string, unknown>

function formatDate(value: string | undefined) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getStorefrontHref(slug: string) {
  const origin =
    import.meta.env.VITE_STOREFRONT_BASE_URL ??
    import.meta.env.VITE_STOREFRONT_URL ??
    apiConfig.origin.replace(/\/v1$/, '')
  if (slug === '/') return origin
  return `${origin}/${slug.replace(/^\/+/, '')}`
}

export function PageBuilderPage({ session, onCreatePage, onEditPage }: PageBuilderPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pages, setPages] = useState<PageRecord[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useNoticeEffect(error, 'error')
  useNoticeEffect(message, 'success')

  async function loadPages() {
    setLoading(true)
    setError(null)

    try {
      const payload = await adminApi.getStorefrontPages(session)
      setPages(toArray(payload))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'بارگذاری صفحات انجام نشد')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPages()
  }, [])

  async function handleDelete(page: PageRecord) {
    const pageId = readText(page, ['id'], '')
    const pageTitle = readText(page, ['title'], 'این صفحه')

    if (!pageId) return

    const confirmed = window.confirm(`حذف ${pageTitle} انجام شود؟ این عمل برگشت‌پذیر نیست.`)
    if (!confirmed) return

    setDeletingId(pageId)
    setError(null)
    setMessage(null)

    try {
      await adminApi.deleteStorefrontPage(session, pageId)
      setPages((current) => current.filter((item) => readText(item, ['id'], '') !== pageId))
      setMessage('صفحه با موفقیت حذف شد.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'حذف صفحه انجام نشد')
    } finally {
      setDeletingId(null)
    }
  }

  const stats = useMemo(() => {
    const activeCount = pages.filter((page) => page.isActive === true).length
    const draftCount = pages.length - activeCount
    const homeCount = pages.filter((page) => readText(page, ['pageType'], '') === 'HOME').length

    return { activeCount, draftCount, homeCount }
  }, [pages])

  return (
    <div className="fm-stack">
      <SectionCard
        eyebrow="storefront cms"
        title="مدیریت صفحه‌های فرانت‌استور"
        description="این بخش برای ساخت، انتشار و نگهداری صفحه اصلی، لندینگ‌ها و کمپین‌های صفحه‌ساز طراحی شده است."
        actions={
          <button className="fm-button fm-button--primary" onClick={onCreatePage} type="button">
            ساخت صفحه جدید
          </button>
        }
      >
        <div className="page-builder-stats">
          <div className="page-builder-stat">
            <strong>{pages.length}</strong>
            <span>کل صفحه‌ها</span>
          </div>
          <div className="page-builder-stat">
            <strong>{stats.activeCount}</strong>
            <span>منتشرشده</span>
          </div>
          <div className="page-builder-stat">
            <strong>{stats.draftCount}</strong>
            <span>غیرفعال / پیش‌نویس</span>
          </div>
          <div className="page-builder-stat">
            <strong>{stats.homeCount}</strong>
            <span>homepage</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="page index"
        title="فهرست صفحه‌ها"
        description="لیست زیر چیدمان فعلی صفحات قابل‌مدیریت storefront را نشان می‌دهد. برای ویرایش یا حذف، از actionهای هر کارت استفاده کن."
      >
        <LoadableState error={error} loading={loading}>
          <div className="page-builder-list">
            {pages.length === 0 ? (
              <div className="fm-message">هنوز صفحه‌ای ساخته نشده است. از دکمه ساخت صفحه جدید شروع کن.</div>
            ) : null}
            {pages.map((page) => {
              const pageId = readText(page, ['id'], '')
              const slug = readText(page, ['slug'], '/')
              const pageType = readText(page, ['pageType'], 'LANDING')
              const blocksCount = readText(page, ['blocksCount'], '0')
              const isActive = page.isActive === true

              return (
                <article className="page-builder-card" key={pageId}>
                  <div className="page-builder-card__header">
                    <div>
                      <p className="page-builder-card__eyebrow">{pageType}</p>
                      <h3>{readText(page, ['title'], 'بدون عنوان')}</h3>
                      <p className="page-builder-card__slug">{slug}</p>
                    </div>
                    <div className="page-builder-card__pills">
                      <Pill tone={isActive ? 'success' : 'warning'}>
                        {isActive ? 'فعال' : 'غیرفعال'}
                      </Pill>
                      <Pill>{`${blocksCount} بلاک`}</Pill>
                    </div>
                  </div>

                  <dl className="page-builder-card__meta">
                    <div>
                      <dt>آخرین به‌روزرسانی</dt>
                      <dd>{formatDate(readText(page, ['updatedAt'], ''))}</dd>
                    </div>
                    <div>
                      <dt>زمان انتشار</dt>
                      <dd>{formatDate(readText(page, ['publishedAt'], ''))}</dd>
                    </div>
                    <div>
                      <dt>متای صفحه</dt>
                      <dd>{readText(page, ['metaTitle'], '—')}</dd>
                    </div>
                  </dl>

                  <div className="page-builder-card__actions">
                    <button className="fm-button fm-button--primary" onClick={() => onEditPage(pageId)} type="button">
                      ویرایش صفحه
                    </button>
                    <a className="fm-button fm-button--ghost" href={getStorefrontHref(slug)} rel="noreferrer" target="_blank">
                      مشاهده در استور
                    </a>
                    <button
                      className="fm-button fm-button--secondary"
                      disabled={deletingId === pageId}
                      onClick={() => void handleDelete(page)}
                      type="button"
                    >
                      {deletingId === pageId ? 'در حال حذف...' : 'حذف'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </LoadableState>
      </SectionCard>
    </div>
  )
}

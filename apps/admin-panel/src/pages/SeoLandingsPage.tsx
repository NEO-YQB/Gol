import { Pill, SectionCard, StatCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import { formatPersianNumber, formatJalaliDate } from '../lib/content'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type SeoLandingsPageProps = {
  session: AuthSession
  onCreateLanding: () => void
  onEditLanding: (landingId: number) => void
}

type LandingRecord = Record<string, unknown>

export function SeoLandingsPage({ session, onCreateLanding, onEditLanding }: SeoLandingsPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [landings, setLandings] = useState<LandingRecord[]>([])
  const [search, setSearch] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null)
  useNoticeEffect(deleteMessage, 'success')
  useNoticeEffect(error, 'error')

  useEffect(() => {
    let active = true

    async function loadLandings() {
      setLoading(true)
      setError(null)

      try {
        const payload = await adminApi.getSeoLandings(session)
        if (!active) return
        setLandings(toArray(payload))
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری لندینگ‌ها')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadLandings()
    return () => {
      active = false
    }
  }, [session, deleteMessage])

  const filteredLandings = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return landings
    return landings.filter((item) => {
      const haystack = [
        readText(item, ['internalName'], ''),
        readText(item, ['slug'], ''),
        readText(item, ['category', 'name'], ''),
        readText(item, ['metaTitle'], ''),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [landings, search])

  const stats = useMemo(
    () => [
      {
        label: 'لندینگ‌ها',
        value: formatPersianNumber(landings.length),
        delta: `${formatPersianNumber(filteredLandings.length)} در نمای فعلی`,
        detail: 'لندینگ‌های سئو تعریف‌شده',
        hint: 'تعداد کل لندینگ‌های تعریف‌شده و تعداد نمایش داده‌شده با فیلتر فعلی.',
        tone: 'primary' as const,
      },
      {
        label: 'فعال',
        value: formatPersianNumber(landings.filter((item) => item.isActive === true).length),
        delta: 'وضعیت ایندکس',
        detail: 'لندینگ‌های فعال در لیست سفید',
        hint: 'فقط لندینگ‌های فعال توسط استورفرانت مچ و رندر می‌شوند.',
        tone: 'success' as const,
      },
      {
        label: 'غیرفعال',
        value: formatPersianNumber(landings.filter((item) => item.isActive !== true).length),
        delta: 'خارج از لیست سفید',
        detail: 'لندینگ‌های غیرفعال',
        hint: 'این لندینگ‌ها در حال حاضر در استورفرانت استفاده نمی‌شوند.',
        tone: 'warning' as const,
      },
    ],
    [landings, filteredLandings.length],
  )

  async function handleDelete(id: number) {
    setDeleting(true)
    setError(null)
    setDeleteMessage(null)
    try {
      await adminApi.deleteSeoLanding(session, id)
      setDeleteMessage('لندینگ با موفقیت حذف شد.')
      setDeleteConfirmId(null)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'حذف لندینگ ناموفق بود')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fm-stack">
      <LoadableState error={error} loading={loading}>
        <div className="fm-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        <SectionCard
          eyebrow="کارتابل لندینگ‌های سئو"
          title="لندینگ‌های ترکیبی (SEO Landings)"
          description="مدیریت لندینگ‌های سئو شده از ترکیب دسته‌بندی‌ها و فیلترها."
          hint="لندینگ‌های فعال در لیست سفید قرار دارند و توسط استورفرانت برای صفحات آرشیو رندر می‌شوند."
          actions={
            <div className="content-header-actions">
              <Pill tone="primary">سئو هوشمند</Pill>
              <button className="content-primary-action" onClick={onCreateLanding} type="button">
                لندینگ جدید
              </button>
            </div>
          }
        >
          <div className="content-toolbar content-toolbar--dense">
            <div className="fm-field content-search">
              <label htmlFor="seo-landing-search">جستجو</label>
              <input
                id="seo-landing-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="نام داخلی، اسلاگ، دسته‌بندی یا عنوان متا"
                value={search}
              />
            </div>
          </div>

          <div className="content-table-card content-table-card--full">
            <div className="content-results-head">
              <strong>فهرست لندینگ‌ها</strong>
              <span>
                {formatPersianNumber(filteredLandings.length)} نتیجه از {formatPersianNumber(landings.length)} لندینگ
              </span>
            </div>
            {filteredLandings.length > 0 ? (
              <div className="content-selection-list">
                {filteredLandings.map((item) => {
                  const id = Number(readText(item, ['id'], '0'))
                  const categoryName = readText(item, ['category', 'name'], '—')
                  const filterConfig = Array.isArray(item.filterConfig) ? item.filterConfig : []
                  const filterLabels = filterConfig.map((f: Record<string, unknown>) => readText(f, ['label'], readText(f, ['type'], ''))).filter(Boolean)

                  return (
                    <article className="content-selection-item" key={id}>
                      <div className="content-selection-head">
                        <div>
                          <strong>{readText(item, ['internalName'], '—')}</strong>
                          <span>/categories/{readText(item, ['category', 'slug'], '')}/{readText(item, ['slug'], '')}</span>
                        </div>
                        <Pill tone={item.isActive === true ? 'success' : 'warning'}>
                          {item.isActive === true ? 'فعال' : 'غیرفعال'}
                        </Pill>
                      </div>
                      <small>
                        {categoryName}
                        {filterLabels.length > 0 ? ` / ${filterLabels.join(' + ')}` : ''}
                      </small>
                      <div className="content-selection-meta">
                        <span>{formatJalaliDate(item.createdAt, true)}</span>
                        <div className="content-selection-actions">
                          <button onClick={() => onEditLanding(id)} type="button">
                            ویرایش
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(deleteConfirmId === id ? null : id)}
                            type="button"
                          >
                            {deleteConfirmId === id ? 'لغو' : 'حذف'}
                          </button>
                          {deleteConfirmId === id ? (
                            <button
                              className="content-primary-action"
                              disabled={deleting}
                              onClick={() => handleDelete(id)}
                              type="button"
                            >
                              {deleting ? 'در حال حذف...' : 'تایید حذف'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="fm-message">
                {search.trim() ? 'با این فیلترها لندینگی پیدا نشد.' : 'هنوز لندینگ سئویی تعریف نشده است. اولین لندینگ خود را بسازید.'}
              </div>
            )}
          </div>
        </SectionCard>
      </LoadableState>
    </div>
  )
}

import { DataTable, Pill, SectionCard, StatCard } from '@frontend-core'
import { useEffect, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { adminApi } from '../lib/api'
import { makeRows, makeStats, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

const articleColumns = [
  { key: 'title', label: 'عنوان' },
  { key: 'status', label: 'وضعیت' },
  { key: 'slug', label: 'slug' },
  { key: 'author', label: 'نویسنده' },
]

export function ContentPage({ session }: { session: AuthSession }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState(() => makeStats([]))
  const [articleRows, setArticleRows] = useState([] as ReturnType<typeof makeRows>)
  const [auditRows, setAuditRows] = useState([] as ReturnType<typeof makeRows>)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [articles, categories, tags, audits] = await Promise.all([
          adminApi.getArticles(session),
          adminApi.getArticleCategories(session),
          adminApi.getArticleTags(session),
          adminApi.getContentAudits(session),
        ])

        if (!active) return

        setStats(
          makeStats([
            { label: 'مقاله‌ها', value: articles, detail: 'content/articles', tone: 'primary' },
            { label: 'دسته‌بندی‌ها', value: categories, detail: 'tree-friendly taxonomy', tone: 'success' },
            { label: 'تگ‌ها', value: tags, detail: 'listing + search-ready taxonomy', tone: 'warning' },
            { label: 'auditها', value: audits, detail: 'SEO hygiene and editorial checks', tone: 'danger' },
          ]),
        )

        setArticleRows(
          makeRows(toArray(articles).slice(0, 8), [
            { key: 'title', source: ['title'] },
            { key: 'status', source: ['status'] },
            { key: 'slug', source: ['slug'] },
            { key: 'author', source: ['authorName', 'authorId'] },
          ]),
        )

        setAuditRows(
          makeRows(toArray(audits).slice(0, 8), [
            { key: 'title', source: ['type', 'title'] },
            { key: 'status', source: ['count', 'status'] },
            { key: 'slug', source: ['slug', 'message'] },
            { key: 'author', source: ['category', 'articleId'] },
          ]),
        )
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
          title="مقاله‌های موجود"
          description="پایه route برای مدیریت article, author, category, tag و جستجوی milestone 22."
          actions={<Pill tone="primary">SEO-first</Pill>}
        >
          <DataTable columns={articleColumns} rows={articleRows} />
        </SectionCard>

        <SectionCard
          eyebrow="Audit visibility"
          title="auditهای محتوایی"
          description="سطح اولیه برای thin taxonomy، مقاله‌های بدون tag یا بدون focus keyword."
          actions={<Pill tone="warning">editorial maturity</Pill>}
        >
          <DataTable columns={articleColumns} rows={auditRows} />
        </SectionCard>
      </LoadableState>
    </div>
  )
}

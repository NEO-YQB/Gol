import { FormatTextarea, Pill, SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { LoadableState } from '../components/LoadableState'
import { useNoticeEffect } from '../components/NoticeCenter'
import { adminApi } from '../lib/api'
import {
  countRelatedArticles,
  formatBooleanLabel,
  formatJalaliDate,
  formatPersianNumber,
  getArticleAuthor,
  getArticleCategory,
  getArticleStatusLabel,
  getArticleTagIds,
  getArticleTags,
  getArticleTitle,
  normalizeSlug,
  toContentRecord,
  translateContentAuditType,
} from '../lib/content'
import { readText, toArray } from '../lib/normalize'
import type { AuthSession } from '../lib/session'

type ContentWorkspacePageProps = {
  session: AuthSession
  mode: 'create' | 'edit'
  articleId: string | null
  onBack: () => void
}

type ContentRecord = Record<string, unknown>

type ArticleFormState = {
  title: string
  slug: string
  excerpt: string
  coverImage: string
  focusKeyword: string
  seoNotes: string
  content: string
  status: 'DRAFT' | 'PUBLISHED'
  authorId: string
  categoryId: string
  tagIds: string[]
  metaTitle: string
  metaDescription: string
  canonicalUrl: string
  robotsIndex: boolean
  robotsFollow: boolean
  ogTitle: string
  ogDescription: string
  ogImage: string
}

type CategoryFormState = {
  title: string
  slug: string
  description: string
  introText: string
  parentId: string
  coverImage: string
  metaTitle: string
  metaDescription: string
  canonicalUrl: string
  robotsIndex: boolean
  robotsFollow: boolean
  ogTitle: string
  ogDescription: string
  ogImage: string
}

type TagFormState = {
  title: string
  slug: string
  description: string
  introText: string
  metaTitle: string
  metaDescription: string
  canonicalUrl: string
  robotsIndex: boolean
  robotsFollow: boolean
  ogTitle: string
  ogDescription: string
  ogImage: string
}

type AuthorFormState = {
  name: string
  slug: string
  bio: string
  seoBio: string
  avatarImage: string
  isActive: boolean
  userId: string
}

type ContentAccordionKey =
  | 'taxonomy'
  | 'seo'
  | 'preview'
  | 'signals'
  | 'manager'
  | 'author'
  | 'audits'
  | 'categoryManager'
  | 'tagManager'

function createEmptyArticleForm(): ArticleFormState {
  return {
    title: '',
    slug: '',
    excerpt: '',
    coverImage: '',
    focusKeyword: '',
    seoNotes: '',
    content: '<p></p>',
    status: 'DRAFT',
    authorId: '',
    categoryId: '',
    tagIds: [],
    metaTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    robotsIndex: true,
    robotsFollow: true,
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
  }
}

function createEmptyCategoryForm(): CategoryFormState {
  return {
    title: '',
    slug: '',
    description: '',
    introText: '',
    parentId: '',
    coverImage: '',
    metaTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    robotsIndex: true,
    robotsFollow: true,
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
  }
}

function createEmptyTagForm(): TagFormState {
  return {
    title: '',
    slug: '',
    description: '',
    introText: '',
    metaTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    robotsIndex: true,
    robotsFollow: true,
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
  }
}

function createEmptyAuthorForm(): AuthorFormState {
  return {
    name: '',
    slug: '',
    bio: '',
    seoBio: '',
    avatarImage: '',
    isActive: true,
    userId: '',
  }
}

function toOptionalNumber(value: string) {
  const parsed = Number(value)
  return Number.isNaN(parsed) || parsed <= 0 ? undefined : parsed
}

function toOptionalText(value: string) {
  const normalized = value.trim()
  return normalized === '' ? undefined : normalized
}

function stripHtml(html: string) {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ')
  }

  const temp = document.createElement('div')
  temp.innerHTML = html
  return temp.textContent || temp.innerText || ''
}

function countMatches(text: string, pattern: RegExp) {
  return (text.match(pattern) || []).length
}

function clampText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength).trim()}...`
}

function buildSearchSnippetTitle(title: string, metaTitle: string) {
  return metaTitle.trim() || title.trim() || 'عنوان مقاله'
}

function buildSearchSnippetDescription(excerpt: string, metaDescription: string, contentText: string) {
  if (metaDescription.trim()) return metaDescription.trim()
  if (excerpt.trim()) return excerpt.trim()
  if (contentText.trim()) return clampText(contentText.trim(), 160)
  return 'توضیح متا یا خلاصه کوتاه هنوز تکمیل نشده است.'
}

function mapArticleToForm(article: ContentRecord): ArticleFormState {
  return {
    title: readText(article, ['title'], ''),
    slug: readText(article, ['slug'], ''),
    excerpt: readText(article, ['excerpt'], ''),
    coverImage: readText(article, ['coverImage'], ''),
    focusKeyword: readText(article, ['focusKeyword'], ''),
    seoNotes: readText(article, ['seoNotes'], ''),
    content: readText(article, ['content'], '<p></p>'),
    status: readText(article, ['status'], 'DRAFT') === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
    authorId: readText(article, ['authorId'], ''),
    categoryId: readText(article, ['categoryId'], ''),
    tagIds: getArticleTagIds(article).map((item) => String(item)),
    metaTitle: readText(article, ['metaTitle'], ''),
    metaDescription: readText(article, ['metaDescription'], ''),
    canonicalUrl: readText(article, ['canonicalUrl'], ''),
    robotsIndex: typeof article.robotsIndex === 'boolean' ? article.robotsIndex : true,
    robotsFollow: typeof article.robotsFollow === 'boolean' ? article.robotsFollow : true,
    ogTitle: readText(article, ['ogTitle'], ''),
    ogDescription: readText(article, ['ogDescription'], ''),
    ogImage: readText(article, ['ogImage'], ''),
  }
}

function mapCategoryToForm(category: ContentRecord): CategoryFormState {
  return {
    title: readText(category, ['title'], ''),
    slug: readText(category, ['slug'], ''),
    description: readText(category, ['description'], ''),
    introText: readText(category, ['introText'], ''),
    parentId: readText(category, ['parentId'], ''),
    coverImage: readText(category, ['coverImage'], ''),
    metaTitle: readText(category, ['metaTitle'], ''),
    metaDescription: readText(category, ['metaDescription'], ''),
    canonicalUrl: readText(category, ['canonicalUrl'], ''),
    robotsIndex: typeof category.robotsIndex === 'boolean' ? category.robotsIndex : true,
    robotsFollow: typeof category.robotsFollow === 'boolean' ? category.robotsFollow : true,
    ogTitle: readText(category, ['ogTitle'], ''),
    ogDescription: readText(category, ['ogDescription'], ''),
    ogImage: readText(category, ['ogImage'], ''),
  }
}

function mapTagToForm(tag: ContentRecord): TagFormState {
  return {
    title: readText(tag, ['title'], ''),
    slug: readText(tag, ['slug'], ''),
    description: readText(tag, ['description'], ''),
    introText: readText(tag, ['introText'], ''),
    metaTitle: readText(tag, ['metaTitle'], ''),
    metaDescription: readText(tag, ['metaDescription'], ''),
    canonicalUrl: readText(tag, ['canonicalUrl'], ''),
    robotsIndex: typeof tag.robotsIndex === 'boolean' ? tag.robotsIndex : true,
    robotsFollow: typeof tag.robotsFollow === 'boolean' ? tag.robotsFollow : true,
    ogTitle: readText(tag, ['ogTitle'], ''),
    ogDescription: readText(tag, ['ogDescription'], ''),
    ogImage: readText(tag, ['ogImage'], ''),
  }
}

function mapAuthorToForm(author: ContentRecord): AuthorFormState {
  return {
    name: readText(author, ['name'], ''),
    slug: readText(author, ['slug'], ''),
    bio: readText(author, ['bio'], ''),
    seoBio: readText(author, ['seoBio'], ''),
    avatarImage: readText(author, ['avatarImage'], ''),
    isActive: typeof author.isActive === 'boolean' ? author.isActive : true,
    userId: readText(author, ['userId'], ''),
  }
}

export function ContentWorkspacePage({ session, mode, articleId, onBack }: ContentWorkspacePageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  useNoticeEffect(submitMessage, 'success')
  const [referenceVersion, setReferenceVersion] = useState(0)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>(mode)
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(articleId)
  const [articleDetail, setArticleDetail] = useState<ContentRecord | null>(null)
  const [categories, setCategories] = useState<ContentRecord[]>([])
  const [tags, setTags] = useState<ContentRecord[]>([])
  const [authors, setAuthors] = useState<ContentRecord[]>([])
  const [audits, setAudits] = useState<ContentRecord[]>([])
  const [articleForm, setArticleForm] = useState<ArticleFormState>(() => createEmptyArticleForm())
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('new')
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(() => createEmptyCategoryForm())
  const [selectedTagId, setSelectedTagId] = useState<string>('new')
  const [tagForm, setTagForm] = useState<TagFormState>(() => createEmptyTagForm())
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>('new')
  const [authorForm, setAuthorForm] = useState<AuthorFormState>(() => createEmptyAuthorForm())
  const [openSections, setOpenSections] = useState<Record<ContentAccordionKey, boolean>>({
    taxonomy: false,
    seo: false,
    preview: false,
    signals: false,
    manager: false,
    author: false,
    audits: false,
    categoryManager: false,
    tagManager: false,
  })

  useEffect(() => {
    setEditorMode(mode)
    setCurrentArticleId(articleId)
    setSubmitMessage(null)
  }, [articleId, mode])

  useEffect(() => {
    let active = true

    async function loadWorkspace() {
      setLoading(true)
      setError(null)

      try {
        const [categoriesPayload, tagsPayload, authorsPayload, auditsPayload, articlePayload] = await Promise.all([
          adminApi.getArticleCategories(session),
          adminApi.getArticleTags(session),
          adminApi.getAuthors(session),
          adminApi.getContentAudits(session),
          currentArticleId ? adminApi.getArticleDetail(session, currentArticleId) : Promise.resolve(null),
        ])

        if (!active) return

        const nextCategories = toArray(categoriesPayload)
        const nextTags = toArray(tagsPayload)
        const nextAuthors = toArray(authorsPayload)

        setCategories(nextCategories)
        setTags(nextTags)
        setAuthors(nextAuthors)
        setAudits(toArray(auditsPayload))

        if (currentArticleId && articlePayload) {
          const articleRecord = toContentRecord(articlePayload)
          setArticleDetail(articleRecord)
          setArticleForm(mapArticleToForm(articleRecord))
        } else {
          setArticleDetail(null)
          setArticleForm((previous) => {
            const empty = createEmptyArticleForm()
            return {
              ...empty,
              authorId: previous.authorId || readText(nextAuthors[0] ?? {}, ['id'], ''),
              categoryId: previous.categoryId || readText(nextCategories[0] ?? {}, ['id'], ''),
            }
          })
        }

        setSelectedCategoryId((previous) => {
          if (previous !== 'new' && nextCategories.some((item) => readText(item, ['id'], '') === previous)) {
            return previous
          }
          return 'new'
        })

        setSelectedTagId((previous) => {
          if (previous !== 'new' && nextTags.some((item) => readText(item, ['id'], '') === previous)) {
            return previous
          }
          return 'new'
        })

        setSelectedAuthorId((previous) => {
          if (previous !== 'new' && nextAuthors.some((item) => readText(item, ['id'], '') === previous)) {
            return previous
          }
          return 'new'
        })
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'خطا در بارگذاری میزکار محتوا')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadWorkspace()
    return () => {
      active = false
    }
  }, [currentArticleId, referenceVersion, session])

  useEffect(() => {
    if (selectedCategoryId === 'new') {
      setCategoryForm(createEmptyCategoryForm())
      return
    }

    const category = categories.find((item) => readText(item, ['id'], '') === selectedCategoryId)
    if (category) {
      setCategoryForm(mapCategoryToForm(category))
    }
  }, [categories, selectedCategoryId])

  useEffect(() => {
    if (selectedTagId === 'new') {
      setTagForm(createEmptyTagForm())
      return
    }

    const tag = tags.find((item) => readText(item, ['id'], '') === selectedTagId)
    if (tag) {
      setTagForm(mapTagToForm(tag))
    }
  }, [selectedTagId, tags])

  useEffect(() => {
    if (selectedAuthorId === 'new') {
      setAuthorForm(createEmptyAuthorForm())
      return
    }

    const author = authors.find((item) => readText(item, ['id'], '') === selectedAuthorId)
    if (author) {
      setAuthorForm(mapAuthorToForm(author))
    }
  }, [authors, selectedAuthorId])

  const selectedCategoryRecord = useMemo(
    () => categories.find((item) => readText(item, ['id'], '') === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  )

  const selectedTagRecord = useMemo(
    () => tags.find((item) => readText(item, ['id'], '') === selectedTagId) ?? null,
    [selectedTagId, tags],
  )

  const selectedAuthorRecord = useMemo(
    () => authors.find((item) => readText(item, ['id'], '') === selectedAuthorId) ?? null,
    [authors, selectedAuthorId],
  )

  const contentPlainText = useMemo(() => stripHtml(articleForm.content).replace(/\s+/g, ' ').trim(), [articleForm.content])
  const wordCount = useMemo(() => (contentPlainText ? contentPlainText.split(' ').filter(Boolean).length : 0), [contentPlainText])
  const h2Count = useMemo(() => countMatches(articleForm.content, /<h2\b/gi), [articleForm.content])
  const internalLinkCount = useMemo(() => countMatches(articleForm.content, /href="(\/|https?:\/\/[^\"]*?(blog|products))/gi), [articleForm.content])
  const editorSignals = useMemo(
    () => [
      { label: 'تعداد کلمات', value: formatPersianNumber(wordCount) },
      { label: 'H2', value: formatPersianNumber(h2Count) },
      { label: 'لینک داخلی', value: formatPersianNumber(internalLinkCount) },
      { label: 'برچسب‌های انتخابی', value: formatPersianNumber(articleForm.tagIds.length) },
    ],
    [articleForm.tagIds.length, h2Count, internalLinkCount, wordCount],
  )

  const seoChecklist = useMemo(
    () => [
      {
        label: 'عنوان متا',
        value: articleForm.metaTitle.trim() ? `${formatPersianNumber(articleForm.metaTitle.trim().length)} کاراکتر` : 'نیازمند تکمیل',
      },
      {
        label: 'توضیح متا',
        value: articleForm.metaDescription.trim() ? `${formatPersianNumber(articleForm.metaDescription.trim().length)} کاراکتر` : 'نیازمند تکمیل',
      },
      {
        label: 'کلیدواژه کانونی',
        value: articleForm.focusKeyword.trim() ? articleForm.focusKeyword : 'نیازمند تعریف',
      },
      {
        label: 'نشانی یکتا',
        value: articleForm.canonicalUrl.trim() ? 'تنظیم شده' : 'پیش‌فرض سامانه',
      },
    ],
    [articleForm.canonicalUrl, articleForm.focusKeyword, articleForm.metaDescription, articleForm.metaTitle],
  )

  const searchPreview = useMemo(
    () => ({
      title: buildSearchSnippetTitle(articleForm.title, articleForm.metaTitle),
      description: buildSearchSnippetDescription(articleForm.excerpt, articleForm.metaDescription, contentPlainText),
      slug: articleForm.slug.trim() || 'article-slug',
    }),
    [articleForm.excerpt, articleForm.metaDescription, articleForm.metaTitle, articleForm.slug, articleForm.title, contentPlainText],
  )

  const categoryChecklist = useMemo(
    () => [
      {
        label: 'اسلاگ',
        value: categoryForm.slug.trim() ? 'آماده' : 'خالی',
      },
      {
        label: 'متای سئو',
        value: categoryForm.metaTitle.trim() || categoryForm.metaDescription.trim() ? 'تنظیم شده' : 'نیازمند تکمیل',
      },
      {
        label: 'ساختار',
        value: categoryForm.parentId ? 'زیرمجموعه' : 'ریشه',
      },
    ],
    [categoryForm.metaDescription, categoryForm.metaTitle, categoryForm.parentId, categoryForm.slug],
  )

  const tagChecklist = useMemo(
    () => [
      {
        label: 'اسلاگ',
        value: tagForm.slug.trim() ? 'آماده' : 'خالی',
      },
      {
        label: 'متای سئو',
        value: tagForm.metaTitle.trim() || tagForm.metaDescription.trim() ? 'تنظیم شده' : 'نیازمند تکمیل',
      },
      {
        label: 'متن معرفی',
        value: tagForm.introText.trim() ? 'ثبت شده' : 'خالی',
      },
    ],
    [tagForm.introText, tagForm.metaDescription, tagForm.metaTitle, tagForm.slug],
  )

  const authorChecklist = useMemo(
    () => [
      {
        label: 'اسلاگ',
        value: authorForm.slug.trim() ? 'آماده' : 'خالی',
      },
      {
        label: 'پروفایل سئو',
        value: authorForm.seoBio.trim() ? 'ثبت شده' : 'نیازمند تکمیل',
      },
      {
        label: 'اتصال کاربری',
        value: authorForm.userId.trim() ? `شناسه ${formatPersianNumber(authorForm.userId)}` : 'بدون اتصال',
      },
    ],
    [authorForm.seoBio, authorForm.slug, authorForm.userId],
  )

  const workspaceMeta = useMemo(
    () => [
      { label: 'حالت', value: editorMode === 'edit' ? 'ویرایش مقاله' : 'ساخت مقاله جدید' },
      { label: 'وضعیت', value: articleDetail ? getArticleStatusLabel(articleDetail) : editorMode === 'create' ? 'پیش‌نویس جدید' : '—' },
      { label: 'انتشار', value: articleDetail ? formatJalaliDate(articleDetail.publishedAt, true) : 'هنوز منتشر نشده' },
      { label: 'نویسنده', value: articleDetail ? getArticleAuthor(articleDetail) : 'هنوز انتخاب نشده' },
      { label: 'دسته‌بندی', value: articleDetail ? getArticleCategory(articleDetail) : 'هنوز انتخاب نشده' },
      {
        label: 'ربات‌ها',
        value: `${formatBooleanLabel(articleForm.robotsIndex)} / ${formatBooleanLabel(articleForm.robotsFollow)}`,
      },
    ],
    [articleDetail, articleForm.robotsFollow, articleForm.robotsIndex, editorMode],
  )

  const auditPreview = useMemo(
    () =>
      audits.slice(0, 4).map((item) => ({
        id: `${readText(item, ['type'], 'audit')}-${readText(item, ['count'], '0')}`,
        title: translateContentAuditType(readText(item, ['type'], 'UNKNOWN')),
        detail: readText(item, ['message'], '—'),
        count: formatPersianNumber(readText(item, ['count'], '0')),
      })),
    [audits],
  )

  function updateArticleForm<Key extends keyof ArticleFormState>(key: Key, value: ArticleFormState[Key]) {
    setArticleForm((current) => ({ ...current, [key]: value }))
  }

  function updateCategoryForm<Key extends keyof CategoryFormState>(key: Key, value: CategoryFormState[Key]) {
    setCategoryForm((current) => ({ ...current, [key]: value }))
  }

  function updateTagForm<Key extends keyof TagFormState>(key: Key, value: TagFormState[Key]) {
    setTagForm((current) => ({ ...current, [key]: value }))
  }

  function updateAuthorForm<Key extends keyof AuthorFormState>(key: Key, value: AuthorFormState[Key]) {
    setAuthorForm((current) => ({ ...current, [key]: value }))
  }

  function toggleTag(tagId: string) {
    setArticleForm((current) => ({
      ...current,
      tagIds: current.tagIds.includes(tagId)
        ? current.tagIds.filter((item) => item !== tagId)
        : [...current.tagIds, tagId],
    }))
  }

  function toggleSection(section: ContentAccordionKey) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }))
  }

  async function handleArticleSubmit(nextStatus?: 'DRAFT' | 'PUBLISHED') {
    if (!articleForm.title.trim() || !articleForm.slug.trim() || !articleForm.content.trim()) {
      setError('عنوان، اسلاگ و محتوای مقاله الزامی هستند.')
      return
    }

    if (!articleForm.authorId || !articleForm.categoryId) {
      setError('انتخاب نویسنده و دسته‌بندی برای مقاله الزامی است.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSubmitMessage(null)

    const payload = {
      title: articleForm.title.trim(),
      slug: articleForm.slug.trim(),
      excerpt: toOptionalText(articleForm.excerpt),
      coverImage: toOptionalText(articleForm.coverImage),
      focusKeyword: toOptionalText(articleForm.focusKeyword),
      seoNotes: toOptionalText(articleForm.seoNotes),
      content: articleForm.content,
      status: nextStatus ?? articleForm.status,
      authorId: Number(articleForm.authorId),
      categoryId: Number(articleForm.categoryId),
      tagIds: articleForm.tagIds.map((item) => Number(item)),
      metaTitle: toOptionalText(articleForm.metaTitle),
      metaDescription: toOptionalText(articleForm.metaDescription),
      canonicalUrl: toOptionalText(articleForm.canonicalUrl),
      robotsIndex: articleForm.robotsIndex,
      robotsFollow: articleForm.robotsFollow,
      ogTitle: toOptionalText(articleForm.ogTitle),
      ogDescription: toOptionalText(articleForm.ogDescription),
      ogImage: toOptionalText(articleForm.ogImage),
    }

    try {
      const payloadResult =
        editorMode === 'edit' && currentArticleId
          ? await adminApi.updateArticle(session, currentArticleId, payload)
          : await adminApi.createArticle(session, payload)

      const articleRecord = toContentRecord(payloadResult)
      const nextArticleId = readText(articleRecord, ['id'], currentArticleId ?? '')

      setArticleDetail(articleRecord)
      setArticleForm(mapArticleToForm(articleRecord))
      setEditorMode('edit')
      setCurrentArticleId(nextArticleId || currentArticleId)
      setSubmitMessage(nextStatus === 'PUBLISHED' ? 'مقاله با وضعیت منتشرشده ذخیره شد.' : 'مقاله با موفقیت ذخیره شد.')
      setReferenceVersion((current) => current + 1)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ذخیره مقاله ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCategorySubmit() {
    if (!categoryForm.title.trim() || !categoryForm.slug.trim()) {
      setError('عنوان و اسلاگ دسته‌بندی الزامی هستند.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSubmitMessage(null)

    const payload = {
      title: categoryForm.title.trim(),
      slug: categoryForm.slug.trim(),
      description: toOptionalText(categoryForm.description),
      introText: toOptionalText(categoryForm.introText),
      parentId: categoryForm.parentId === '' ? undefined : Number(categoryForm.parentId),
      coverImage: toOptionalText(categoryForm.coverImage),
      metaTitle: toOptionalText(categoryForm.metaTitle),
      metaDescription: toOptionalText(categoryForm.metaDescription),
      canonicalUrl: toOptionalText(categoryForm.canonicalUrl),
      robotsIndex: categoryForm.robotsIndex,
      robotsFollow: categoryForm.robotsFollow,
      ogTitle: toOptionalText(categoryForm.ogTitle),
      ogDescription: toOptionalText(categoryForm.ogDescription),
      ogImage: toOptionalText(categoryForm.ogImage),
    }

    try {
      const payloadResult =
        selectedCategoryId === 'new'
          ? await adminApi.createArticleCategory(session, payload)
          : await adminApi.updateArticleCategory(session, selectedCategoryId, payload)

      const categoryRecord = toContentRecord(payloadResult)
      const nextCategoryId = readText(categoryRecord, ['id'], '')
      setSelectedCategoryId(nextCategoryId || 'new')
      setSubmitMessage(selectedCategoryId === 'new' ? 'دسته‌بندی جدید ثبت شد.' : 'دسته‌بندی با موفقیت به روز شد.')
      setReferenceVersion((current) => current + 1)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ذخیره دسته‌بندی ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTagSubmit() {
    if (!tagForm.title.trim() || !tagForm.slug.trim()) {
      setError('عنوان و اسلاگ تگ الزامی هستند.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSubmitMessage(null)

    const payload = {
      title: tagForm.title.trim(),
      slug: tagForm.slug.trim(),
      description: toOptionalText(tagForm.description),
      introText: toOptionalText(tagForm.introText),
      metaTitle: toOptionalText(tagForm.metaTitle),
      metaDescription: toOptionalText(tagForm.metaDescription),
      canonicalUrl: toOptionalText(tagForm.canonicalUrl),
      robotsIndex: tagForm.robotsIndex,
      robotsFollow: tagForm.robotsFollow,
      ogTitle: toOptionalText(tagForm.ogTitle),
      ogDescription: toOptionalText(tagForm.ogDescription),
      ogImage: toOptionalText(tagForm.ogImage),
    }

    try {
      const payloadResult =
        selectedTagId === 'new'
          ? await adminApi.createArticleTag(session, payload)
          : await adminApi.updateArticleTag(session, selectedTagId, payload)

      const tagRecord = toContentRecord(payloadResult)
      const nextTagId = readText(tagRecord, ['id'], '')
      setSelectedTagId(nextTagId || 'new')
      setSubmitMessage(selectedTagId === 'new' ? 'تگ جدید ثبت شد.' : 'تگ با موفقیت به روز شد.')
      setReferenceVersion((current) => current + 1)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ذخیره تگ ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAuthorSubmit() {
    if (!authorForm.name.trim() || !authorForm.slug.trim()) {
      setError('نام و اسلاگ نویسنده الزامی هستند.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSubmitMessage(null)

    const payload = {
      name: authorForm.name.trim(),
      slug: authorForm.slug.trim(),
      bio: toOptionalText(authorForm.bio),
      seoBio: toOptionalText(authorForm.seoBio),
      avatarImage: toOptionalText(authorForm.avatarImage),
      isActive: authorForm.isActive,
      userId: toOptionalNumber(authorForm.userId),
    }

    try {
      const payloadResult =
        selectedAuthorId === 'new'
          ? await adminApi.createAuthor(session, payload)
          : await adminApi.updateAuthor(session, selectedAuthorId, payload)

      const authorRecord = toContentRecord(payloadResult)
      const nextAuthorId = readText(authorRecord, ['id'], '')
      setSelectedAuthorId(nextAuthorId || 'new')
      setSubmitMessage(selectedAuthorId === 'new' ? 'نویسنده جدید ثبت شد.' : 'نویسنده با موفقیت به روز شد.')
      setReferenceVersion((current) => current + 1)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ذخیره نویسنده ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fm-stack">
      <LoadableState error={error} loading={loading}>
        <SectionCard
          eyebrow="میزکار نگارش"
          title={editorMode === 'edit' ? `ویرایشگر مقاله #${currentArticleId ?? '—'}` : 'ساخت مقاله جدید'}
          description="این صفحه برای نوشتن، ویرایش، سئو و مدیریت دسته‌ها و برچسب‌ها طراحی شده تا کاربر در یک مسیر متمرکز بماند."
          hint="از بالا به پایین حرکت کن: اول هویت مقاله، بعد متن، بعد سئو و در پایان دسته‌ها، برچسب‌ها و نویسنده را بررسی کن."
          actions={
            <div className="content-workspace-topbar-actions">
              <Pill tone={editorMode === 'edit' ? 'success' : 'warning'}>
                {editorMode === 'edit' ? 'در حال ویرایش' : 'مقاله جدید'}
              </Pill>
              <button className="content-secondary-action" onClick={onBack} type="button">
                بازگشت به کارتابل
              </button>
              <button className="content-secondary-action" disabled={submitting} onClick={() => handleArticleSubmit('DRAFT')} type="button">
                {submitting && articleForm.status === 'DRAFT' ? 'در حال ذخیره...' : 'ذخیره پیش‌نویس'}
              </button>
              <button className="content-primary-action" disabled={submitting} onClick={() => handleArticleSubmit('PUBLISHED')} type="button">
                {submitting ? 'در حال ذخیره...' : editorMode === 'edit' ? 'به‌روزرسانی و انتشار' : 'ذخیره و انتشار'}
              </button>
            </div>
          }
        >
          <div className="content-workspace-stack">
            <div className="content-workspace-meta-grid">
              {workspaceMeta.map((item) => (
                <article className="content-workspace-meta-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>

            <div className="content-workspace-form-grid">
              <SectionCard
                eyebrow="هسته مقاله"
                title="هویت مقاله و کنترل انتشار"
                description="عنوان، اسلاگ، نویسنده، دسته‌بندی و وضعیت انتشار را از اینجا کنترل کن."
                hint="اگر این بخش درست پر شود، بقیه کار بسیار ساده‌تر پیش می‌رود."
                actions={<Pill tone="primary">هسته نگارش</Pill>}
              >
                <div className="content-editor-grid">
                  <label className="fm-field content-editor-field--wide">
                    <span>عنوان مقاله</span>
                    <input
                      onChange={(event) => updateArticleForm('title', event.target.value)}
                      placeholder="مثلا راهنمای نگهداری گل رز در آپارتمان"
                      value={articleForm.title}
                    />
                  </label>

                  <label className="fm-field">
                    <span>اسلاگ</span>
                    <div className="content-inline-input">
                      <input
                        onChange={(event) => updateArticleForm('slug', event.target.value)}
                        placeholder="rose-care-guide"
                        value={articleForm.slug}
                      />
                      <button onClick={() => updateArticleForm('slug', normalizeSlug(articleForm.title || articleForm.slug))} type="button">
                        ساخت خودکار
                      </button>
                    </div>
                  </label>

                  <label className="fm-field">
                    <span>وضعیت</span>
                    <select onChange={(event) => updateArticleForm('status', event.target.value === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT')} value={articleForm.status}>
                      <option value="DRAFT">پیش‌نویس</option>
                      <option value="PUBLISHED">منتشرشده</option>
                    </select>
                  </label>

                  <label className="fm-field">
                    <span>نویسنده</span>
                    <select onChange={(event) => updateArticleForm('authorId', event.target.value)} value={articleForm.authorId}>
                      <option value="">انتخاب نویسنده</option>
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
                    <select onChange={(event) => updateArticleForm('categoryId', event.target.value)} value={articleForm.categoryId}>
                      <option value="">انتخاب دسته‌بندی</option>
                      {categories.map((item) => {
                        const id = readText(item, ['id'], '')
                        const parent = toContentRecord(item.parent)
                        const parentLabel = readText(parent, ['title'], '')
                        return (
                          <option key={id} value={id}>
                            {parentLabel ? `${parentLabel} / ` : ''}
                            {readText(item, ['title'], '—')}
                          </option>
                        )
                      })}
                    </select>
                  </label>

                  <label className="fm-field content-editor-field--wide">
                    <span>تصویر کاور</span>
                    <input
                      onChange={(event) => updateArticleForm('coverImage', event.target.value)}
                      placeholder="https://..."
                      value={articleForm.coverImage}
                    />
                  </label>

                  <label className="fm-field content-editor-field--wide">
                    <span>خلاصه کوتاه</span>
                    <textarea
                      onChange={(event) => updateArticleForm('excerpt', event.target.value)}
                      placeholder="خلاصه‌ای کوتاه برای نمایش مقاله و توضیح جستجو"
                      rows={4}
                      value={articleForm.excerpt}
                    />
                  </label>
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="بدنه محتوا"
                title="متن مقاله و ویرایشگر ساختار"
                description="این بلوک برای نگارش متمرکز، پیش‌نمایش و ارزیابی ساختار محتوایی است."
                hint="متن اصلی را اینجا کامل کن و بعد با بخش سیگنال‌ها کیفیت ساختار را بسنج."
                actions={<Pill tone="success">آماده نگارش</Pill>}
              >
                <FormatTextarea
                  id="article-content"
                  onChange={(value) => updateArticleForm('content', value)}
                  placeholder="محتوای کامل مقاله را اینجا بنویس..."
                  value={articleForm.content}
                />
              </SectionCard>

              <SectionCard
                eyebrow="تاکسونومی"
                title="برچسب‌ها و ارتباط‌های محتوایی"
                description="برچسب‌های مقاله را همین‌جا مدیریت کن تا ارتباط مقاله با بقیه محتوا از همان ابتدا روشن باشد."
                hint="اگر مقاله به سختی پیدا می‌شود یا به مطالب دیگر وصل نیست، معمولا مشکل از همین بخش است."
                actions={
                  <div className="content-accordion-actions">
                    <Pill tone="warning">ارتباط محتوایی</Pill>
                    <button
                      aria-expanded={openSections.taxonomy}
                      className={`content-accordion-trigger${openSections.taxonomy ? ' is-open' : ''}`}
                      onClick={() => toggleSection('taxonomy')}
                      type="button"
                    >
                      {openSections.taxonomy ? 'بستن' : 'باز کردن'}
                    </button>
                  </div>
                }
              >
                {openSections.taxonomy ? (
                  <div className="content-tag-grid">
                    {tags.length ? (
                      tags.map((item) => {
                        const id = readText(item, ['id'], '')
                        const checked = articleForm.tagIds.includes(id)
                        return (
                          <label className={`content-tag-toggle${checked ? ' is-active' : ''}`} key={id}>
                            <input
                              checked={checked}
                              onChange={() => toggleTag(id)}
                              type="checkbox"
                            />
                            <span>{readText(item, ['title'], '—')}</span>
                            <small>{formatPersianNumber(countRelatedArticles(item))} مقاله</small>
                          </label>
                        )
                      })
                    ) : (
                      <div className="fm-message">هنوز تگی ثبت نشده است.</div>
                    )}
                  </div>
                ) : (
                  <div className="content-collapsed-note">برای مدیریت ارتباط‌های محتوایی و برچسب‌های مقاله این بخش را باز کن.</div>
                )}
              </SectionCard>

              <SectionCard
                eyebrow="کنترل سئو"
                title="کنترل‌های سئو و دیده‌شدن"
                description="فیلدهای توضیح جستجو، وضعیت دیده‌شدن و پیش‌نمایش شبکه‌های اجتماعی را اینجا کامل کن."
                hint="اگر می‌خواهی صفحه در جستجو و اشتراک‌گذاری ظاهر درستی داشته باشد، این بخش را با دقت پر کن."
                actions={
                  <div className="content-accordion-actions">
                    <Pill tone="danger">سئو محور</Pill>
                    <button
                      aria-expanded={openSections.seo}
                      className={`content-accordion-trigger${openSections.seo ? ' is-open' : ''}`}
                      onClick={() => toggleSection('seo')}
                      type="button"
                    >
                      {openSections.seo ? 'بستن' : 'باز کردن'}
                    </button>
                  </div>
                }
              >
                {openSections.seo ? (
                <div className="content-editor-grid">
                  <label className="fm-field">
                    <span>کلیدواژه کانونی</span>
                    <input onChange={(event) => updateArticleForm('focusKeyword', event.target.value)} value={articleForm.focusKeyword} />
                  </label>

                  <label className="fm-field">
                    <span>نشانی یکتا</span>
                    <input onChange={(event) => updateArticleForm('canonicalUrl', event.target.value)} placeholder="https://..." value={articleForm.canonicalUrl} />
                  </label>

                  <label className="fm-field content-editor-field--wide">
                    <span>عنوان متا</span>
                    <input onChange={(event) => updateArticleForm('metaTitle', event.target.value)} value={articleForm.metaTitle} />
                  </label>

                  <label className="fm-field content-editor-field--wide">
                    <span>توضیح متا</span>
                    <textarea onChange={(event) => updateArticleForm('metaDescription', event.target.value)} rows={4} value={articleForm.metaDescription} />
                  </label>

                  <label className="fm-field content-editor-field--wide">
                    <span>عنوان پیش‌نمایش شبکه‌های اجتماعی</span>
                    <input onChange={(event) => updateArticleForm('ogTitle', event.target.value)} value={articleForm.ogTitle} />
                  </label>

                  <label className="fm-field content-editor-field--wide">
                    <span>توضیح پیش‌نمایش شبکه‌های اجتماعی</span>
                    <textarea onChange={(event) => updateArticleForm('ogDescription', event.target.value)} rows={4} value={articleForm.ogDescription} />
                  </label>

                  <label className="fm-field content-editor-field--wide">
                    <span>تصویر پیش‌نمایش</span>
                    <input onChange={(event) => updateArticleForm('ogImage', event.target.value)} placeholder="https://..." value={articleForm.ogImage} />
                  </label>

                  <label className="fm-field content-editor-field--wide">
                    <span>یادداشت سئو</span>
                    <textarea onChange={(event) => updateArticleForm('seoNotes', event.target.value)} rows={5} value={articleForm.seoNotes} />
                  </label>

                  <div className="content-toggle-grid content-editor-field--wide">
                    <label className="content-boolean-toggle">
                      <input checked={articleForm.robotsIndex} onChange={(event) => updateArticleForm('robotsIndex', event.target.checked)} type="checkbox" />
                      <span>صفحه اجازه دیده‌شدن در جستجو داشته باشد</span>
                    </label>
                    <label className="content-boolean-toggle">
                      <input checked={articleForm.robotsFollow} onChange={(event) => updateArticleForm('robotsFollow', event.target.checked)} type="checkbox" />
                      <span>پیوندهای صفحه قابل دنبال‌کردن باشند</span>
                    </label>
                  </div>
                </div>
                ) : (
                  <div className="content-collapsed-note">برای تکمیل سئو، دیده‌شدن و پیش‌نمایش اشتراک‌گذاری این بخش را باز کن.</div>
                )}
              </SectionCard>

              <SectionCard
                eyebrow="پیش‌نمایش سئو"
                title="اسنیپت زنده و آمادگی انتشار"
                description="قبل از انتشار، خروجی تقریبی عنوان، توضیح و مسیر صفحه را در همین‌جا مرور کن."
                hint="این بخش کمک می‌کند قبل از انتشار بفهمی مقاله در نتیجه جستجو تقریبا چه شکلی دیده می‌شود."
                actions={
                  <div className="content-accordion-actions">
                    <Pill tone="primary">پیش‌نمایش جستجو</Pill>
                    <button
                      aria-expanded={openSections.preview}
                      className={`content-accordion-trigger${openSections.preview ? ' is-open' : ''}`}
                      onClick={() => toggleSection('preview')}
                      type="button"
                    >
                      {openSections.preview ? 'بستن' : 'باز کردن'}
                    </button>
                  </div>
                }
              >
                {openSections.preview ? (
                  <>
                    <div className="content-snippet-card">
                      <small>{`/blog/${searchPreview.slug}`}</small>
                      <strong>{searchPreview.title}</strong>
                      <p>{searchPreview.description}</p>
                    </div>

                    <div className="content-workspace-checklist-grid">
                      <article className="content-workspace-check-item">
                        <span>خلاصه کوتاه</span>
                        <strong>
                          {articleForm.excerpt.trim()
                            ? `${formatPersianNumber(articleForm.excerpt.trim().length)} کاراکتر`
                            : 'نیازمند تکمیل'}
                        </strong>
                      </article>
                      <article className="content-workspace-check-item">
                        <span>وضعیت دیده‌شدن</span>
                        <strong>{articleForm.robotsIndex ? 'قابل دیده‌شدن' : 'پنهان از جستجو'} / {articleForm.robotsFollow ? 'پیوندها قابل دنبال‌کردن' : 'پیوندها غیرقابل دنبال‌کردن'}</strong>
                      </article>
                      <article className="content-workspace-check-item">
                        <span>تصویر پیش‌نمایش</span>
                        <strong>{articleForm.ogImage.trim() ? 'ثبت شده' : 'هنوز ثبت نشده'}</strong>
                      </article>
                    </div>
                  </>
                ) : (
                  <div className="content-collapsed-note">برای دیدن پیش‌نمایش نهایی صفحه و آمادگی انتشار این بخش را باز کن.</div>
                )}
              </SectionCard>
            </div>

            <div className="content-helper-sections">
              <SectionCard
                eyebrow="سیگنال تحریریه"
                title="سیگنال‌های سریع برای نگارش و سئو"
                description="این بخش‌های کمکی پایین صفحه مانده‌اند تا ستون اصلی نگارش تنگ و کشیده نشود."
                hint="اگر نمی‌خواهی مدام بالا و پایین بروی، این بخش یک جمع‌بندی کوتاه از کیفیت متن و سئو به تو می‌دهد."
                actions={
                  <button
                    aria-expanded={openSections.signals}
                    className={`content-accordion-trigger${openSections.signals ? ' is-open' : ''}`}
                    onClick={() => toggleSection('signals')}
                    type="button"
                  >
                    {openSections.signals ? 'بستن' : 'باز کردن'}
                  </button>
                }
              >
                {openSections.signals ? (
                  <>
                    <div className="content-workspace-signal-grid">
                      {editorSignals.map((item) => (
                        <article className="content-workspace-signal-item" key={item.label}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </article>
                      ))}
                    </div>
                    <div className="content-workspace-checklist-grid">
                      {seoChecklist.map((item) => (
                        <article className="content-workspace-check-item" key={item.label}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="content-collapsed-note">برای مشاهده سیگنال‌های سریع نگارش و سئو این بخش را باز کن.</div>
                )}
              </SectionCard>

              <SectionCard
                eyebrow="مدیریت تاکسونومی"
                title="مدیریت دسته‌بندی و برچسب"
                description="مدیریت دسته و برچسب در همین صفحه حاضر است تا بدون خروج از روند اصلی، ساختار محتوا را کامل کنی."
                hint="اگر هنگام نگارش متوجه شدی دسته یا برچسب کم است، لازم نیست از این صفحه خارج شوی."
                actions={
                  <button
                    aria-expanded={openSections.manager}
                    className={`content-accordion-trigger${openSections.manager ? ' is-open' : ''}`}
                    onClick={() => toggleSection('manager')}
                    type="button"
                  >
                    {openSections.manager ? 'بستن' : 'باز کردن'}
                  </button>
                }
              >
                {openSections.manager ? (
                  <div className="content-manager-grid">
                  <div className="content-manager-card">
                    <div className="content-manager-head">
                      <div>
                        <strong>دسته‌بندی ها</strong>
                      </div>
                      <button
                        aria-expanded={openSections.categoryManager}
                        className={`content-accordion-trigger content-accordion-trigger--sub${openSections.categoryManager ? ' is-open' : ''}`}
                        onClick={() => toggleSection('categoryManager')}
                        type="button"
                      >
                        {openSections.categoryManager ? 'بستن' : 'باز کردن'}
                      </button>
                    </div>
                    {openSections.categoryManager ? (
                    <>
                    <div className="content-manager-head-actions content-manager-head-actions--stacked">
                      <button onClick={() => setSelectedCategoryId('new')} type="button">دسته جدید</button>
                      <label className="fm-field content-select-field">
                        <span>انتخاب دسته</span>
                        <select onChange={(event) => setSelectedCategoryId(event.target.value)} value={selectedCategoryId}>
                          <option value="new">ایجاد دسته جدید</option>
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
                    </div>
                    <div className="content-editor-grid">
                      <label className="fm-field">
                        <span>عنوان</span>
                        <input onChange={(event) => updateCategoryForm('title', event.target.value)} value={categoryForm.title} />
                      </label>
                      <label className="fm-field">
                        <span>اسلاگ</span>
                        <div className="content-inline-input">
                          <input onChange={(event) => updateCategoryForm('slug', event.target.value)} value={categoryForm.slug} />
                          <button onClick={() => updateCategoryForm('slug', normalizeSlug(categoryForm.title || categoryForm.slug))} type="button">ساخت</button>
                        </div>
                      </label>
                      <label className="fm-field">
                        <span>دسته والد</span>
                        <select onChange={(event) => updateCategoryForm('parentId', event.target.value)} value={categoryForm.parentId}>
                          <option value="">بدون والد</option>
                          {categories
                            .filter((item) => readText(item, ['id'], '') !== selectedCategoryId)
                            .map((item) => {
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
                        <span>دیده‌شدن</span>
                        <div className="content-toggle-grid">
                          <label className="content-boolean-toggle">
                            <input checked={categoryForm.robotsIndex} onChange={(event) => updateCategoryForm('robotsIndex', event.target.checked)} type="checkbox" />
                            <span>در جستجو دیده شود</span>
                          </label>
                          <label className="content-boolean-toggle">
                            <input checked={categoryForm.robotsFollow} onChange={(event) => updateCategoryForm('robotsFollow', event.target.checked)} type="checkbox" />
                            <span>پیوندها دنبال شوند</span>
                          </label>
                        </div>
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>توضیح</span>
                        <textarea onChange={(event) => updateCategoryForm('description', event.target.value)} rows={3} value={categoryForm.description} />
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>متن معرفی</span>
                        <textarea onChange={(event) => updateCategoryForm('introText', event.target.value)} rows={4} value={categoryForm.introText} />
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>تصویر کاور</span>
                        <input
                          onChange={(event) => updateCategoryForm('coverImage', event.target.value)}
                          placeholder="https://..."
                          value={categoryForm.coverImage}
                        />
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>عنوان متا</span>
                        <input onChange={(event) => updateCategoryForm('metaTitle', event.target.value)} value={categoryForm.metaTitle} />
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>توضیح متا</span>
                        <textarea onChange={(event) => updateCategoryForm('metaDescription', event.target.value)} rows={3} value={categoryForm.metaDescription} />
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>نشانی یکتا</span>
                        <input
                          onChange={(event) => updateCategoryForm('canonicalUrl', event.target.value)}
                          placeholder="https://..."
                          value={categoryForm.canonicalUrl}
                        />
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>عنوان پیش‌نمایش شبکه‌های اجتماعی</span>
                        <input onChange={(event) => updateCategoryForm('ogTitle', event.target.value)} value={categoryForm.ogTitle} />
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>توضیح پیش‌نمایش شبکه‌های اجتماعی</span>
                        <textarea onChange={(event) => updateCategoryForm('ogDescription', event.target.value)} rows={3} value={categoryForm.ogDescription} />
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>تصویر پیش‌نمایش</span>
                        <input
                          onChange={(event) => updateCategoryForm('ogImage', event.target.value)}
                          placeholder="https://..."
                          value={categoryForm.ogImage}
                        />
                      </label>
                    </div>
                    <div className="content-mini-checklist">
                      {categoryChecklist.map((item) => (
                        <article className="content-mini-checklist-item" key={item.label}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </article>
                      ))}
                    </div>
                    <div className="content-manager-footer">
                      <button className="content-primary-action" disabled={submitting} onClick={handleCategorySubmit} type="button">
                        {selectedCategoryId === 'new' ? 'ثبت دسته‌بندی' : 'به‌روزرسانی دسته‌بندی'}
                      </button>
                      {selectedCategoryRecord ? (
                        <small>
                          {formatPersianNumber(countRelatedArticles(selectedCategoryRecord))} مقاله / والد: {readText(toContentRecord(selectedCategoryRecord.parent), ['title'], 'ندارد')}
                        </small>
                      ) : null}
                    </div>
                    </>
                    ) : (
                      <div className="content-collapsed-note">برای ایجاد یا ویرایش دسته‌بندی، این زیر بخش را باز کن.</div>
                    )}
                  </div>

                  <div className="content-manager-card">
                    <div className="content-manager-head">
                      <div>
                        <strong>برچسب‌ها</strong>
                      </div>
                      <button
                        aria-expanded={openSections.tagManager}
                        className={`content-accordion-trigger content-accordion-trigger--sub${openSections.tagManager ? ' is-open' : ''}`}
                        onClick={() => toggleSection('tagManager')}
                        type="button"
                      >
                        {openSections.tagManager ? 'بستن' : 'باز کردن'}
                      </button>
                    </div>
                    {openSections.tagManager ? (
                    <>
                    <div className="content-manager-head-actions content-manager-head-actions--stacked">
                      <button onClick={() => setSelectedTagId('new')} type="button">تگ جدید</button>
                      <label className="fm-field content-select-field">
                        <span>انتخاب تگ</span>
                        <select onChange={(event) => setSelectedTagId(event.target.value)} value={selectedTagId}>
                          <option value="new">ایجاد تگ جدید</option>
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
                    <div className="content-editor-grid">
                      <label className="fm-field">
                        <span>عنوان</span>
                        <input onChange={(event) => updateTagForm('title', event.target.value)} value={tagForm.title} />
                      </label>
                      <label className="fm-field">
                        <span>اسلاگ</span>
                        <div className="content-inline-input">
                          <input onChange={(event) => updateTagForm('slug', event.target.value)} value={tagForm.slug} />
                          <button onClick={() => updateTagForm('slug', normalizeSlug(tagForm.title || tagForm.slug))} type="button">ساخت</button>
                        </div>
                      </label>
                      <label className="fm-field">
                        <span>دیده‌شدن</span>
                        <div className="content-toggle-grid">
                          <label className="content-boolean-toggle">
                            <input checked={tagForm.robotsIndex} onChange={(event) => updateTagForm('robotsIndex', event.target.checked)} type="checkbox" />
                            <span>در جستجو دیده شود</span>
                          </label>
                          <label className="content-boolean-toggle">
                            <input checked={tagForm.robotsFollow} onChange={(event) => updateTagForm('robotsFollow', event.target.checked)} type="checkbox" />
                            <span>پیوندها دنبال شوند</span>
                          </label>
                        </div>
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>توضیح</span>
                        <textarea onChange={(event) => updateTagForm('description', event.target.value)} rows={3} value={tagForm.description} />
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>متن معرفی</span>
                        <textarea onChange={(event) => updateTagForm('introText', event.target.value)} rows={4} value={tagForm.introText} />
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>عنوان متا</span>
                        <input onChange={(event) => updateTagForm('metaTitle', event.target.value)} value={tagForm.metaTitle} />
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>توضیح متا</span>
                        <textarea onChange={(event) => updateTagForm('metaDescription', event.target.value)} rows={3} value={tagForm.metaDescription} />
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>نشانی یکتا</span>
                        <input
                          onChange={(event) => updateTagForm('canonicalUrl', event.target.value)}
                          placeholder="https://..."
                          value={tagForm.canonicalUrl}
                        />
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>عنوان پیش‌نمایش شبکه‌های اجتماعی</span>
                        <input onChange={(event) => updateTagForm('ogTitle', event.target.value)} value={tagForm.ogTitle} />
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>توضیح پیش‌نمایش شبکه‌های اجتماعی</span>
                        <textarea onChange={(event) => updateTagForm('ogDescription', event.target.value)} rows={3} value={tagForm.ogDescription} />
                      </label>
                      <label className="fm-field content-editor-field--wide">
                        <span>تصویر پیش‌نمایش</span>
                        <input
                          onChange={(event) => updateTagForm('ogImage', event.target.value)}
                          placeholder="https://..."
                          value={tagForm.ogImage}
                        />
                      </label>
                    </div>
                    <div className="content-mini-checklist">
                      {tagChecklist.map((item) => (
                        <article className="content-mini-checklist-item" key={item.label}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </article>
                      ))}
                    </div>
                    <div className="content-manager-footer">
                      <button className="content-primary-action" disabled={submitting} onClick={handleTagSubmit} type="button">
                        {selectedTagId === 'new' ? 'ثبت تگ' : 'به‌روزرسانی تگ'}
                      </button>
                      {selectedTagRecord ? <small>{formatPersianNumber(countRelatedArticles(selectedTagRecord))} مقاله متصل</small> : null}
                    </div>
                    </>
                    ) : (
                      <div className="content-collapsed-note">برای ایجاد یا ویرایش تگ، این زیر بخش را باز کن.</div>
                    )}
                  </div>
                </div>
                ) : (
                  <div className="content-collapsed-note">برای مدیریت دسته‌بندی‌ها و تگ‌ها این بخش را باز کن.</div>
                )}
              </SectionCard>

              <SectionCard
                eyebrow="مدیریت نویسنده"
                title="مدیریت نویسنده‌ها"
                description="مالکیت محتوایی و پروفایل نویسنده را بدون خروج از این صفحه مدیریت کن."
                hint="اگر نویسنده درست انتخاب یا تعریف نشود، گزارش‌ها و نسبت‌دادن محتوا هم اشتباه می‌شود."
                actions={
                  <button
                    aria-expanded={openSections.author}
                    className={`content-accordion-trigger${openSections.author ? ' is-open' : ''}`}
                    onClick={() => toggleSection('author')}
                    type="button"
                  >
                    {openSections.author ? 'بستن' : 'باز کردن'}
                  </button>
                }
              >
                {openSections.author ? (
                  <div className="content-manager-card">
                  <div className="content-manager-head">
                    <strong>نویسنده</strong>
                  </div>
                    <div className="content-manager-head-actions content-manager-head-actions--stacked">
                      <button onClick={() => setSelectedAuthorId('new')} type="button">نویسنده جدید</button>
                      <label className="fm-field content-select-field">
                        <span>انتخاب نویسنده</span>
                        <select onChange={(event) => setSelectedAuthorId(event.target.value)} value={selectedAuthorId}>
                          <option value="new">ایجاد نویسنده جدید</option>
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
                    </div>
                  <div className="content-editor-grid">
                    <label className="fm-field">
                      <span>نام</span>
                      <input onChange={(event) => updateAuthorForm('name', event.target.value)} value={authorForm.name} />
                    </label>
                    <label className="fm-field">
                      <span>اسلاگ</span>
                      <div className="content-inline-input">
                        <input onChange={(event) => updateAuthorForm('slug', event.target.value)} value={authorForm.slug} />
                        <button onClick={() => updateAuthorForm('slug', normalizeSlug(authorForm.name || authorForm.slug))} type="button">ساخت</button>
                      </div>
                    </label>
                    <label className="fm-field">
                      <span>شناسه کاربر</span>
                      <input onChange={(event) => updateAuthorForm('userId', event.target.value)} placeholder="اختیاری" value={authorForm.userId} />
                    </label>
                    <label className="content-boolean-toggle content-boolean-toggle--panel">
                      <input checked={authorForm.isActive} onChange={(event) => updateAuthorForm('isActive', event.target.checked)} type="checkbox" />
                      <span>نویسنده فعال باشد</span>
                    </label>
                    <label className="fm-field content-editor-field--wide">
                      <span>بیوگرافی</span>
                      <textarea onChange={(event) => updateAuthorForm('bio', event.target.value)} rows={4} value={authorForm.bio} />
                    </label>
                    <label className="fm-field content-editor-field--wide">
                      <span>معرفی سئویی</span>
                      <textarea onChange={(event) => updateAuthorForm('seoBio', event.target.value)} rows={4} value={authorForm.seoBio} />
                    </label>
                    <label className="fm-field content-editor-field--wide">
                      <span>آواتار</span>
                      <input onChange={(event) => updateAuthorForm('avatarImage', event.target.value)} placeholder="https://..." value={authorForm.avatarImage} />
                    </label>
                  </div>
                  <div className="content-mini-checklist">
                    {authorChecklist.map((item) => (
                      <article className="content-mini-checklist-item" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </article>
                    ))}
                  </div>
                  <div className="content-manager-footer">
                    <button className="content-primary-action" disabled={submitting} onClick={handleAuthorSubmit} type="button">
                      {selectedAuthorId === 'new' ? 'ثبت نویسنده' : 'به‌روزرسانی نویسنده'}
                    </button>
                    {selectedAuthorRecord ? (
                      <small>
                        {formatPersianNumber(countRelatedArticles(selectedAuthorRecord))} مقاله / وضعیت: {authorForm.isActive ? 'فعال' : 'غیرفعال'}
                      </small>
                    ) : null}
                  </div>
                </div>
                ) : (
                  <div className="content-collapsed-note">برای مدیریت پروفایل نویسنده و اتصال کاربری این بخش را باز کن.</div>
                )}
              </SectionCard>

              <SectionCard
                eyebrow="فید پایش"
                title="پایش‌های محتوایی فعال"
                description="نمای خلاصه پایش‌ها همیشه کنار ویرایشگر می‌ماند تا تصمیم‌های محتوایی از سئو جدا نشوند."
                hint="اگر مطمئن نیستی مقاله آماده انتشار هست یا نه، این بخش معمولا سریع‌ترین هشدارها را نشان می‌دهد."
                actions={
                  <button
                    aria-expanded={openSections.audits}
                    className={`content-accordion-trigger${openSections.audits ? ' is-open' : ''}`}
                    onClick={() => toggleSection('audits')}
                    type="button"
                  >
                    {openSections.audits ? 'بستن' : 'باز کردن'}
                  </button>
                }
              >
                {openSections.audits ? (
                  <>
                    <div className="content-audit-preview-grid">
                      {auditPreview.length ? (
                        auditPreview.map((item) => (
                          <article className="content-audit-preview-item" key={item.id}>
                            <span>{item.title}</span>
                            <strong>{item.count}</strong>
                            <small>{item.detail}</small>
                          </article>
                        ))
                      ) : (
                        <div className="fm-message">فعلا پایش فعالی دیده نمی‌شود.</div>
                      )}
                    </div>
                    {articleDetail ? (
                      <div className="content-workspace-summary-note">
                        مقاله فعلی با عنوان «{getArticleTitle(articleDetail)}» در وضعیت {getArticleStatusLabel(articleDetail)} است و در دسته «{getArticleCategory(articleDetail)}» قرار دارد.
                        {getArticleTags(articleDetail).length > 0 ? ` برچسب‌های متصل: ${getArticleTags(articleDetail).join(' / ')}` : ' هنوز تگی به آن متصل نشده است.'}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="content-collapsed-note">برای مرور پایش‌های محتوایی و وضعیت مقاله فعلی این بخش را باز کن.</div>
                )}
              </SectionCard>
            </div>
          </div>
        </SectionCard>
      </LoadableState>
    </div>
  )
}

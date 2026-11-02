import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { cx } from '../cx'

type RichTextEditorProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
  toolbarActions?: (editor: {
    insertContentAtCursor: (content: string) => void
  }) => ReactNode
}

type SeoInsight = {
  label: string
  value: string
  tone: 'good' | 'warn' | 'neutral'
}

function stripHtml(html: string) {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ')
  }

  const temp = document.createElement('div')
  temp.innerHTML = html
  return temp.textContent || temp.innerText || ''
}

function buildSeoInsights(html: string): SeoInsight[] {
  if (typeof DOMParser === 'undefined') {
    return []
  }

  const doc = new DOMParser().parseFromString(html || '<p></p>', 'text/html')
  const text = stripHtml(html)
    .replace(/\s+/g, ' ')
    .trim()
  const words = text ? text.split(' ').filter(Boolean).length : 0
  const h2 = doc.querySelectorAll('h2').length
  const h3 = doc.querySelectorAll('h3').length
  const h1 = doc.querySelectorAll('h1').length
  const links = Array.from(doc.querySelectorAll('a[href]'))
  const internalLinks = links.filter((link) => {
    const href = link.getAttribute('href') || ''
    return href.startsWith('/') || href.includes('/blog/') || href.includes('/products/')
  }).length
  const images = Array.from(doc.querySelectorAll('img'))
  const imagesWithoutAlt = images.filter((image) => !image.getAttribute('alt')?.trim()).length

  return [
    { label: 'تعداد کلمات', value: String(words), tone: words >= 120 ? 'good' : words > 0 ? 'warn' : 'neutral' },
    { label: 'H2', value: String(h2), tone: h2 >= 1 ? 'good' : 'warn' },
    { label: 'H3', value: String(h3), tone: h3 >= 1 ? 'good' : 'neutral' },
    { label: 'لینک داخلی', value: String(internalLinks), tone: internalLinks >= 1 ? 'good' : 'warn' },
    { label: 'کل لینک‌ها', value: String(links.length), tone: links.length >= 1 ? 'good' : 'warn' },
    { label: 'تصویر بدون alt', value: String(imagesWithoutAlt), tone: imagesWithoutAlt === 0 ? 'good' : 'warn' },
    { label: 'H1 داخل متن', value: String(h1), tone: h1 === 0 ? 'good' : 'warn' },
  ]
}

function buildOutline(html: string) {
  if (typeof DOMParser === 'undefined') {
    return [] as Array<{ tag: string; text: string }>
  }

  const doc = new DOMParser().parseFromString(html || '<p></p>', 'text/html')
  return Array.from(doc.querySelectorAll('h2, h3, h4')).map((node) => ({
    tag: node.tagName.toLowerCase(),
    text: (node.textContent || '').trim() || 'عنوان بدون متن',
  }))
}

function toolbarButtonClass(isActive = false) {
  return cx('fm-rich-editor-chip', isActive && 'is-active')
}

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = 'متن را اینجا بنویسید...',
  rows = 10,
  className,
  toolbarActions,
}: RichTextEditorProps) {
  const [mode, setMode] = useState<'visual' | 'preview' | 'html'>('visual')

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto', 'tel'],
        HTMLAttributes: {},
      }),
      Image,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        id: id ?? '',
        class: 'fm-rich-editor-surface',
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return

    const currentHtml = editor.getHTML()
    const nextHtml = value || ''
    if (currentHtml !== nextHtml) {
      editor.commands.setContent(nextHtml || '<p></p>', { emitUpdate: false })
    }
  }, [editor, value])

  const seoInsights = useMemo(() => buildSeoInsights(value || ''), [value])
  const outline = useMemo(() => buildOutline(value || ''), [value])
  const plainText = useMemo(() => stripHtml(value || '').trim(), [value])

  const [linkDialog, setLinkDialog] = useState<{
    isOpen: boolean
    href: string
    targetBlank: boolean
    isNofollow: boolean
    isSponsored: boolean
    isNoopener: boolean
    hasExistingLink: boolean
  }>({
    isOpen: false,
    href: '',
    targetBlank: false,
    isNofollow: false,
    isSponsored: false,
    isNoopener: false,
    hasExistingLink: false,
  })

  const [imageDialog, setImageDialog] = useState<{
    isOpen: boolean
    src: string
    alt: string
  }>({
    isOpen: false,
    src: '',
    alt: '',
  })

  function isInternalLink(url: string) {
    const trimmed = url.trim()
    if (!trimmed) return true
    return !/^https?:\/\//i.test(trimmed) || trimmed.includes('golino.shop')
  }

  function openLinkDialog() {
    if (!editor) return

    const previousHref = (editor.getAttributes('link').href as string | undefined) || ''
    const previousTarget = (editor.getAttributes('link').target as string | undefined) || ''
    const previousRel = ((editor.getAttributes('link').rel as string | undefined) || '').toLowerCase()

    const relTokens = previousRel ? previousRel.split(/\s+/) : []
    const hasExisting = Boolean(previousHref)
    const isInternal = isInternalLink(previousHref)

    setLinkDialog({
      isOpen: true,
      href: previousHref,
      targetBlank: previousTarget === '_blank' || (!hasExisting && !isInternal),
      isNofollow: relTokens.includes('nofollow'),
      isSponsored: relTokens.includes('sponsored'),
      isNoopener: relTokens.includes('noopener') || (!hasExisting && !isInternal),
      hasExistingLink: hasExisting,
    })
  }

  function handleHrefChange(nextHref: string) {
    setLinkDialog((prev) => {
      const wasEmpty = !prev.href.trim()
      const isInternal = isInternalLink(nextHref)

      if (wasEmpty && !isInternal && !prev.hasExistingLink) {
        return {
          ...prev,
          href: nextHref,
          targetBlank: true,
          isNoopener: true,
        }
      } else if (isInternal && !prev.hasExistingLink) {
        return {
          ...prev,
          href: nextHref,
          targetBlank: false,
          isNofollow: false,
          isSponsored: false,
          isNoopener: false,
        }
      }

      return { ...prev, href: nextHref }
    })
  }

  function handleSaveLink() {
    if (!editor) return

    const trimmedHref = linkDialog.href.trim()
    if (!trimmedHref) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      setLinkDialog((prev) => ({ ...prev, isOpen: false }))
      return
    }

    const relTokens: string[] = []
    if (linkDialog.isNofollow) relTokens.push('nofollow')
    if (linkDialog.isSponsored) relTokens.push('sponsored')
    if (linkDialog.isNoopener || linkDialog.targetBlank) {
      relTokens.push('noopener', 'noreferrer')
    }

    const uniqueRel = Array.from(new Set(relTokens)).join(' ')

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({
        href: trimmedHref,
        target: linkDialog.targetBlank ? '_blank' : null,
        rel: uniqueRel || null,
      })
      .run()

    setLinkDialog((prev) => ({ ...prev, isOpen: false }))
  }

  function handleRemoveLink() {
    if (!editor) return
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setLinkDialog((prev) => ({ ...prev, isOpen: false }))
  }

  function openImageDialog() {
    if (!editor) return
    const currentSrc = (editor.getAttributes('image').src as string | undefined) || ''
    const currentAlt = (editor.getAttributes('image').alt as string | undefined) || ''
    setImageDialog({
      isOpen: true,
      src: currentSrc,
      alt: currentAlt,
    })
  }

  function handleSaveImage() {
    if (!editor) return
    const trimmedSrc = imageDialog.src.trim()
    if (!trimmedSrc) {
      setImageDialog((prev) => ({ ...prev, isOpen: false }))
      return
    }

    const trimmedAlt = imageDialog.alt.trim() || 'تصویر محتوا'
    editor.chain().focus().setImage({ src: trimmedSrc, alt: trimmedAlt }).run()
    setImageDialog((prev) => ({ ...prev, isOpen: false }))
  }

  if (!editor) {
    return <div className={cx('fm-rich-editor', className)} />
  }

  return (
    <div className={cx('fm-rich-editor', className)}>
      <div className="fm-rich-editor-toolbar">
        <div className="fm-rich-editor-actions">
          <button className={toolbarButtonClass(mode === 'visual')} onClick={() => setMode('visual')} type="button">
            نگارش
          </button>
          <button className={toolbarButtonClass(mode === 'preview')} onClick={() => setMode('preview')} type="button">
            پیش‌نمایش
          </button>
          <button className={toolbarButtonClass(mode === 'html')} onClick={() => setMode('html')} type="button">
            کد HTML
          </button>
        </div>
      </div>

      <div className="fm-rich-editor-layout">
        <div className="fm-rich-editor-stage">
          {mode === 'visual' ? <EditorContent editor={editor} /> : null}
          {mode === 'preview' ? <article className="fm-rich-editor-preview" dangerouslySetInnerHTML={{ __html: value || '<p>هنوز محتوایی ثبت نشده است.</p>' }} /> : null}
          {mode === 'html' ? (
            <textarea
              className="fm-rich-editor-html"
              id={id}
              onChange={(event) => onChange(event.target.value)}
              rows={rows}
              value={value}
            />
          ) : null}
        </div>

        {mode === 'visual' ? (
          <div className="fm-rich-editor-tools">
            <button className={toolbarButtonClass(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} type="button">
              ضخیم
            </button>
            <button className={toolbarButtonClass(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} type="button">
              ایتالیک
            </button>
            <button className={toolbarButtonClass(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()} type="button">
              زیرخط
            </button>
            <button className={toolbarButtonClass(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} type="button">
              H2
            </button>
            <button className={toolbarButtonClass(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} type="button">
              H3
            </button>
            <button className={toolbarButtonClass(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} type="button">
              لیست
            </button>
            <button className={toolbarButtonClass(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} type="button">
              شماره‌دار
            </button>
            <button className={toolbarButtonClass(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()} type="button">
              نقل‌قول
            </button>
            <button className={toolbarButtonClass(editor.isActive({ textAlign: 'right' }))} onClick={() => editor.chain().focus().setTextAlign('right').run()} type="button">
              راست
            </button>
            <button className={toolbarButtonClass(editor.isActive({ textAlign: 'center' }))} onClick={() => editor.chain().focus().setTextAlign('center').run()} type="button">
              وسط
            </button>
            <button className={toolbarButtonClass(editor.isActive('link'))} onClick={openLinkDialog} type="button">
              لینک
            </button>
            <button className={toolbarButtonClass()} onClick={handleRemoveLink} type="button">
              حذف لینک
            </button>
            <button className={toolbarButtonClass()} onClick={openImageDialog} type="button">
              تصویر
            </button>
            <button className={toolbarButtonClass()} onClick={() => editor.chain().focus().setHorizontalRule().run()} type="button">
              جداکننده
            </button>
            <button className={toolbarButtonClass()} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} type="button">
              پاک‌سازی
            </button>
            {toolbarActions
              ? toolbarActions({
                  insertContentAtCursor: (content: string) =>
                    editor.chain().focus().insertContent(content).run(),
                })
              : null}
          </div>
        ) : null}

        <aside className="fm-rich-editor-sidebar">
          <section className="fm-rich-editor-panel">
            <strong>پایش سئو</strong>
            <div className="fm-rich-editor-metrics">
              {seoInsights.map((item) => (
                <article className={cx('fm-rich-editor-metric', `is-${item.tone}`)} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="fm-rich-editor-panel">
            <strong>ساختار محتوا</strong>
            {outline.length ? (
              <div className="fm-rich-editor-outline">
                {outline.map((item, index) => (
                  <div className={cx('fm-rich-editor-outline-item', `is-${item.tag}`)} key={`${item.tag}-${index}`}>
                    <span>{item.tag.toUpperCase()}</span>
                    <strong>{item.text}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="fm-rich-editor-note">برای سئوی بهتر حداقل یک H2 و چند بخش معنادار بساز.</p>
            )}
          </section>

          <section className="fm-rich-editor-panel">
            <strong>خلاصه متن</strong>
            <p className="fm-rich-editor-note">
              {plainText ? `${plainText.slice(0, 240)}${plainText.length > 240 ? '...' : ''}` : 'هنوز محتوایی ثبت نشده است.'}
            </p>
          </section>
        </aside>
      </div>

      {linkDialog.isOpen ? (
        <div className="carousel-dialog" role="dialog" aria-modal="true" aria-label="تنظیمات پیوند">
          <button
            className="carousel-dialog__backdrop"
            onClick={() => setLinkDialog((prev) => ({ ...prev, isOpen: false }))}
            type="button"
            aria-label="بستن"
          />
          <div className="carousel-dialog__panel" style={{ width: 'min(92vw, 520px)' }}>
            <div className="carousel-dialog__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🔗</span>
                <h3>تنظیمات پیوند (لینک)</h3>
              </div>
              <button
                className="content-secondary-action"
                onClick={() => setLinkDialog((prev) => ({ ...prev, isOpen: false }))}
                type="button"
              >
                بستن
              </button>
            </div>

            <div className="carousel-dialog__body">
              <label className="fm-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>آدرس پیوند (URL)</span>
                  {linkDialog.href.trim() ? (
                    <span
                      style={{
                        fontSize: '0.78rem',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontWeight: 700,
                        backgroundColor: isInternalLink(linkDialog.href)
                          ? 'rgba(31, 106, 82, 0.12)'
                          : 'rgba(197, 151, 77, 0.15)',
                        color: isInternalLink(linkDialog.href) ? '#1f6a52' : '#92611a',
                      }}
                    >
                      {isInternalLink(linkDialog.href) ? 'پیوند داخلی گلینو' : 'پیوند خارجی'}
                    </span>
                  ) : null}
                </div>
                <input
                  autoFocus
                  dir="ltr"
                  onChange={(event) => handleHrefChange(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveLink()
                    }
                  }}
                  placeholder="https://... یا /categories/..."
                  value={linkDialog.href}
                />
              </label>

              <div
                style={{
                  display: 'grid',
                  gap: '12px',
                  background: 'rgba(244, 237, 226, 0.45)',
                  padding: '14px 16px',
                  borderRadius: '20px',
                  border: '1px solid rgba(214, 196, 171, 0.45)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--fm-text-primary, #173126)' }}>
                    ویژگی‌ها و صفات سئو (SEO Attributes)
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--fm-text-secondary, #627166)' }}>
                    کنترل دستی رفتار پیوند
                  </span>
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input
                    checked={linkDialog.targetBlank}
                    onChange={(e) => setLinkDialog((prev) => ({ ...prev, targetBlank: e.target.checked }))}
                    style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#1f6a52', cursor: 'pointer' }}
                    type="checkbox"
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '0.86rem', color: 'var(--fm-text-primary, #173126)' }}>
                      باز شدن در تب جدید (target="_blank")
                    </strong>
                    <small style={{ color: 'var(--fm-text-secondary, #627166)', fontSize: '0.78rem', lineHeight: '1.5' }}>
                      صفحه در زبانه جدید باز شود (مناسب لینک‌های خارجی جهت حفظ کاربر در سایت)
                    </small>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input
                    checked={linkDialog.isNofollow}
                    onChange={(e) => setLinkDialog((prev) => ({ ...prev, isNofollow: e.target.checked }))}
                    style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#1f6a52', cursor: 'pointer' }}
                    type="checkbox"
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '0.86rem', color: 'var(--fm-text-primary, #173126)' }}>
                      نوفالو (rel="nofollow")
                    </strong>
                    <small style={{ color: 'var(--fm-text-secondary, #627166)', fontSize: '0.78rem', lineHeight: '1.5' }}>
                      جلوگیری از خروج اعتبار پیج‌رنک به مقصد پیوند (سیگنال رسمی به گوگل)
                    </small>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input
                    checked={linkDialog.isSponsored}
                    onChange={(e) => setLinkDialog((prev) => ({ ...prev, isSponsored: e.target.checked }))}
                    style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#1f6a52', cursor: 'pointer' }}
                    type="checkbox"
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '0.86rem', color: 'var(--fm-text-primary, #173126)' }}>
                      اسپانسری و رپورتاژ (rel="sponsored")
                    </strong>
                    <small style={{ color: 'var(--fm-text-secondary, #627166)', fontSize: '0.78rem', lineHeight: '1.5' }}>
                      الزام رسمی گوگل برای لینک‌های حاصل از تبلیغات، همکاری تجاری یا رپورتاژ
                    </small>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input
                    checked={linkDialog.isNoopener}
                    onChange={(e) => setLinkDialog((prev) => ({ ...prev, isNoopener: e.target.checked }))}
                    style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#1f6a52', cursor: 'pointer' }}
                    type="checkbox"
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '0.86rem', color: 'var(--fm-text-primary, #173126)' }}>
                      امنیت پیوند (rel="noopener noreferrer")
                    </strong>
                    <small style={{ color: 'var(--fm-text-secondary, #627166)', fontSize: '0.78rem', lineHeight: '1.5' }}>
                      جلوگیری از دسترسی تب بازشده به آبجکت پنجره اصلی جهت افزایش امنیت
                    </small>
                  </div>
                </label>
              </div>
            </div>

            <div className="carousel-dialog__footer">
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="content-primary-action" onClick={handleSaveLink} type="button">
                  ثبت پیوند
                </button>
                {linkDialog.hasExistingLink ? (
                  <button
                    className="content-secondary-action"
                    onClick={handleRemoveLink}
                    style={{ color: '#b91c1c', borderColor: 'rgba(185, 28, 28, 0.3)' }}
                    type="button"
                  >
                    حذف پیوند
                  </button>
                ) : null}
              </div>
              <button
                className="content-secondary-action"
                onClick={() => setLinkDialog((prev) => ({ ...prev, isOpen: false }))}
                type="button"
              >
                لغو
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {imageDialog.isOpen ? (
        <div className="carousel-dialog" role="dialog" aria-modal="true" aria-label="درج تصویر در متن">
          <button
            className="carousel-dialog__backdrop"
            onClick={() => setImageDialog((prev) => ({ ...prev, isOpen: false }))}
            type="button"
            aria-label="بستن"
          />
          <div className="carousel-dialog__panel" style={{ width: 'min(92vw, 480px)' }}>
            <div className="carousel-dialog__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🖼️</span>
                <h3>درج تصویر در متن</h3>
              </div>
              <button
                className="content-secondary-action"
                onClick={() => setImageDialog((prev) => ({ ...prev, isOpen: false }))}
                type="button"
              >
                بستن
              </button>
            </div>

            <div className="carousel-dialog__body">
              <label className="fm-field">
                <span>آدرس تصویر (URL)</span>
                <input
                  autoFocus
                  dir="ltr"
                  onChange={(event) => setImageDialog((prev) => ({ ...prev, src: event.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveImage()
                    }
                  }}
                  placeholder="https://..."
                  value={imageDialog.src}
                />
              </label>

              <label className="fm-field">
                <span>متن جایگزین (Alt برای سئو)</span>
                <input
                  onChange={(event) => setImageDialog((prev) => ({ ...prev, alt: event.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveImage()
                    }
                  }}
                  placeholder="توضیح کوتاه تصویر برای موتورهای جستجو"
                  value={imageDialog.alt}
                />
              </label>
            </div>

            <div className="carousel-dialog__footer">
              <button className="content-primary-action" onClick={handleSaveImage} type="button">
                درج تصویر
              </button>
              <button
                className="content-secondary-action"
                onClick={() => setImageDialog((prev) => ({ ...prev, isOpen: false }))}
                type="button"
              >
                لغو
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function FormatTextarea(props: RichTextEditorProps) {
  return <RichTextEditor {...props} />
}

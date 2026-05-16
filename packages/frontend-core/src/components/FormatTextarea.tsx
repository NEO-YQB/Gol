import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { useEffect, useMemo, useState } from 'react'
import { cx } from '../cx'

type RichTextEditorProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
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
      editor.commands.setContent(nextHtml || '<p></p>', false)
    }
  }, [editor, value])

  const seoInsights = useMemo(() => buildSeoInsights(value || ''), [value])
  const outline = useMemo(() => buildOutline(value || ''), [value])
  const plainText = useMemo(() => stripHtml(value || '').trim(), [value])

  function toggleLink() {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('آدرس لینک را وارد کن', previousUrl || 'https://')

    if (url === null) return
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  function insertImage() {
    if (!editor) return

    const src = window.prompt('آدرس تصویر را وارد کن')
    if (!src) return

    const alt = window.prompt('متن alt را برای سئو وارد کن', 'توضیح تصویر') || 'توضیح تصویر'
    editor.chain().focus().setImage({ src: src.trim(), alt: alt.trim() }).run()
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
            HTML
          </button>
        </div>

        {mode === 'visual' ? (
          <div className="fm-rich-editor-actions">
            <button className={toolbarButtonClass(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} type="button">
              Bold
            </button>
            <button className={toolbarButtonClass(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} type="button">
              Italic
            </button>
            <button className={toolbarButtonClass(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()} type="button">
              Underline
            </button>
            <button className={toolbarButtonClass(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} type="button">
              H2
            </button>
            <button className={toolbarButtonClass(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} type="button">
              H3
            </button>
            <button className={toolbarButtonClass(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} type="button">
              Bullet
            </button>
            <button className={toolbarButtonClass(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} type="button">
              Number
            </button>
            <button className={toolbarButtonClass(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()} type="button">
              Quote
            </button>
            <button className={toolbarButtonClass(editor.isActive({ textAlign: 'right' }))} onClick={() => editor.chain().focus().setTextAlign('right').run()} type="button">
              راست
            </button>
            <button className={toolbarButtonClass(editor.isActive({ textAlign: 'center' }))} onClick={() => editor.chain().focus().setTextAlign('center').run()} type="button">
              وسط
            </button>
            <button className={toolbarButtonClass(editor.isActive('link'))} onClick={toggleLink} type="button">
              Link
            </button>
            <button className={toolbarButtonClass()} onClick={() => editor.chain().focus().unsetLink().run()} type="button">
              Unlink
            </button>
            <button className={toolbarButtonClass()} onClick={insertImage} type="button">
              Image
            </button>
            <button className={toolbarButtonClass()} onClick={() => editor.chain().focus().setHorizontalRule().run()} type="button">
              Divider
            </button>
            <button className={toolbarButtonClass()} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} type="button">
              Clear
            </button>
          </div>
        ) : null}
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

        <aside className="fm-rich-editor-sidebar">
          <section className="fm-rich-editor-panel">
            <strong>SEO check</strong>
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
    </div>
  )
}

export function FormatTextarea(props: RichTextEditorProps) {
  return <RichTextEditor {...props} />
}

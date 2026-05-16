import { useEffect, useMemo, useRef, useState, type ClipboardEvent } from 'react'
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

function normalizeHtml(html: string) {
  return html.trim() === '<p><br></p>' ? '' : html.trim()
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
  const headings2 = doc.querySelectorAll('h2').length
  const headings3 = doc.querySelectorAll('h3').length
  const headings1 = doc.querySelectorAll('h1').length
  const links = Array.from(doc.querySelectorAll('a[href]'))
  const internalLinks = links.filter((link) => {
    const href = link.getAttribute('href') || ''
    return href.startsWith('/') || href.includes(window.location.hostname)
  }).length
  const images = Array.from(doc.querySelectorAll('img'))
  const imagesWithoutAlt = images.filter((image) => !image.getAttribute('alt')?.trim()).length

  return [
    {
      label: 'تعداد کلمات',
      value: `${words}`,
      tone: words >= 120 ? 'good' : words > 0 ? 'warn' : 'neutral',
    },
    {
      label: 'هدینگ H2',
      value: `${headings2}`,
      tone: headings2 >= 1 ? 'good' : 'warn',
    },
    {
      label: 'هدینگ H3',
      value: `${headings3}`,
      tone: headings3 >= 1 ? 'good' : 'neutral',
    },
    {
      label: 'لینک داخلی',
      value: `${internalLinks}`,
      tone: internalLinks >= 1 ? 'good' : 'warn',
    },
    {
      label: 'کل لینک‌ها',
      value: `${links.length}`,
      tone: links.length >= 1 ? 'good' : 'warn',
    },
    {
      label: 'تصویر بدون alt',
      value: `${imagesWithoutAlt}`,
      tone: imagesWithoutAlt === 0 ? 'good' : 'warn',
    },
    {
      label: 'H1 داخل متن',
      value: `${headings1}`,
      tone: headings1 === 0 ? 'good' : 'warn',
    },
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

function buttonClass(isActive = false) {
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
  const editorRef = useRef<HTMLDivElement | null>(null)
  const [mode, setMode] = useState<'visual' | 'preview' | 'html'>('visual')
  const [selectionVersion, setSelectionVersion] = useState(0)

  const normalizedValue = value || ''
  const seoInsights = useMemo(() => buildSeoInsights(normalizedValue), [normalizedValue])
  const outline = useMemo(() => buildOutline(normalizedValue), [normalizedValue])
  const plainText = useMemo(() => stripHtml(normalizedValue), [normalizedValue])

  useEffect(() => {
    const element = editorRef.current
    if (!element) return

    if (element.innerHTML !== normalizedValue) {
      element.innerHTML = normalizedValue
    }
  }, [normalizedValue, mode])

  function emitChange(nextValue: string) {
    onChange(normalizeHtml(nextValue))
    setSelectionVersion((current) => current + 1)
  }

  function focusEditor() {
    editorRef.current?.focus()
  }

  function runCommand(command: string, commandValue?: string) {
    focusEditor()
    document.execCommand(command, false, commandValue)
    emitChange(editorRef.current?.innerHTML ?? '')
  }

  function applyBlock(tag: 'P' | 'H2' | 'H3' | 'BLOCKQUOTE') {
    focusEditor()
    document.execCommand('formatBlock', false, tag)
    emitChange(editorRef.current?.innerHTML ?? '')
  }

  function insertLink() {
    focusEditor()
    const url = window.prompt('آدرس لینک را وارد کن', 'https://')
    if (!url) return
    document.execCommand('createLink', false, url)
    emitChange(editorRef.current?.innerHTML ?? '')
  }

  function insertImage() {
    focusEditor()
    const src = window.prompt('آدرس تصویر را وارد کن')
    if (!src) return
    const alt = window.prompt('متن alt تصویر را برای سئو وارد کن', 'توضیح تصویر') || 'تصویر'
    document.execCommand('insertHTML', false, `<figure><img src="${src}" alt="${alt}" /><figcaption>${alt}</figcaption></figure>`)
    emitChange(editorRef.current?.innerHTML ?? '')
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()
    const html = event.clipboardData.getData('text/html')
    const text = event.clipboardData.getData('text/plain')

    if (html) {
      document.execCommand('insertHTML', false, html)
    } else {
      document.execCommand('insertText', false, text)
    }

    emitChange(editorRef.current?.innerHTML ?? '')
  }

  function isCommandActive(command: string) {
    try {
      return document.queryCommandState(command)
    } catch {
      return false
    }
  }

  return (
    <div className={cx('fm-rich-editor', className)} data-selection-version={selectionVersion}>
      <div className="fm-rich-editor-toolbar">
        <div className="fm-rich-editor-actions">
          <button className={buttonClass(mode === 'visual')} onClick={() => setMode('visual')} type="button">
            نگارش
          </button>
          <button className={buttonClass(mode === 'preview')} onClick={() => setMode('preview')} type="button">
            پیش‌نمایش
          </button>
          <button className={buttonClass(mode === 'html')} onClick={() => setMode('html')} type="button">
            HTML
          </button>
        </div>

        {mode === 'visual' ? (
          <div className="fm-rich-editor-actions">
            <button className={buttonClass(isCommandActive('bold'))} onClick={() => runCommand('bold')} type="button">Bold</button>
            <button className={buttonClass(isCommandActive('italic'))} onClick={() => runCommand('italic')} type="button">Italic</button>
            <button className={buttonClass()} onClick={() => applyBlock('H2')} type="button">H2</button>
            <button className={buttonClass()} onClick={() => applyBlock('H3')} type="button">H3</button>
            <button className={buttonClass()} onClick={() => applyBlock('P')} type="button">P</button>
            <button className={buttonClass()} onClick={() => applyBlock('BLOCKQUOTE')} type="button">Quote</button>
            <button className={buttonClass()} onClick={() => runCommand('insertUnorderedList')} type="button">Bullet</button>
            <button className={buttonClass()} onClick={() => runCommand('insertOrderedList')} type="button">Number</button>
            <button className={buttonClass()} onClick={insertLink} type="button">Link</button>
            <button className={buttonClass()} onClick={() => runCommand('unlink')} type="button">Unlink</button>
            <button className={buttonClass()} onClick={insertImage} type="button">Image</button>
            <button className={buttonClass()} onClick={() => runCommand('removeFormat')} type="button">Clear</button>
          </div>
        ) : null}
      </div>

      <div className="fm-rich-editor-layout">
        <div className="fm-rich-editor-stage">
          {mode === 'visual' ? (
            <div
              aria-label={placeholder}
              className="fm-rich-editor-surface"
              contentEditable
              data-placeholder={placeholder}
              id={id}
              onBlur={() => emitChange(editorRef.current?.innerHTML ?? '')}
              onInput={() => emitChange(editorRef.current?.innerHTML ?? '')}
              onPaste={handlePaste}
              ref={editorRef}
              suppressContentEditableWarning
            />
          ) : null}

          {mode === 'preview' ? (
            <article className="fm-rich-editor-preview" dangerouslySetInnerHTML={{ __html: normalizedValue || '<p>هنوز محتوایی ثبت نشده است.</p>' }} />
          ) : null}

          {mode === 'html' ? (
            <textarea
              className="fm-rich-editor-html"
              id={id}
              onChange={(event) => emitChange(event.target.value)}
              rows={rows}
              value={normalizedValue}
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
              <p className="fm-rich-editor-note">هنوز heading معناداری داخل متن ساخته نشده است.</p>
            )}
          </section>

          <section className="fm-rich-editor-panel">
            <strong>خلاصه محتوا</strong>
            <p className="fm-rich-editor-note">
              {plainText.trim()
                ? `${plainText.trim().slice(0, 220)}${plainText.trim().length > 220 ? '...' : ''}`
                : 'هنوز متنی وارد نشده است.'}
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

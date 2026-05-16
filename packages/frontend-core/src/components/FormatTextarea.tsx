import { useRef } from 'react'
import { cx } from '../cx'

type FormatAction = {
  label: string
  snippet: string
  title: string
}

type FormatTextareaProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
}

const formatActions: FormatAction[] = [
  { label: 'H2', snippet: '## عنوان بخش\n', title: 'افزودن هدینگ سطح 2' },
  { label: 'H3', snippet: '### عنوان فرعی\n', title: 'افزودن هدینگ سطح 3' },
  { label: 'Bold', snippet: '**متن مهم**', title: 'افزودن متن بولد' },
  { label: 'List', snippet: '- آیتم اول\n- آیتم دوم\n', title: 'افزودن لیست بولت‌دار' },
  { label: 'Link', snippet: '[متن لینک](https://example.com)', title: 'افزودن لینک' },
]

export function FormatTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 5,
  className,
}: FormatTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  function applySnippet(snippet: string) {
    const element = textareaRef.current
    if (!element) {
      onChange(`${value}${value ? '\n' : ''}${snippet}`)
      return
    }

    const start = element.selectionStart ?? value.length
    const end = element.selectionEnd ?? value.length
    const nextValue = `${value.slice(0, start)}${snippet}${value.slice(end)}`
    onChange(nextValue)

    queueMicrotask(() => {
      element.focus()
      const cursor = start + snippet.length
      element.setSelectionRange(cursor, cursor)
    })
  }

  return (
    <div className={cx('fm-format-textarea', className)}>
      <div className="fm-format-toolbar">
        {formatActions.map((action) => (
          <button
            className="fm-format-chip"
            key={action.label}
            onClick={() => applySnippet(action.snippet)}
            title={action.title}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </div>

      <textarea
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        ref={textareaRef}
        rows={rows}
        value={value}
      />
    </div>
  )
}

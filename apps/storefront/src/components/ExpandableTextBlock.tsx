'use client'

import { useState } from 'react'

function isHtmlContent(text: string) {
  return /<[a-z][\s\S]*>/i.test(text)
}

function stripHtml(html: string) {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  const temp = document.createElement('div')
  temp.innerHTML = html
  return temp.textContent || temp.innerText || ''
}

export function ExpandableTextBlock({
  title,
  text,
}: {
  title?: string
  text: string
}) {
  const [expanded, setExpanded] = useState(false)

  if (!text.trim()) {
    return null
  }

  const isHtml = isHtmlContent(text)

  return (
    <section className="rounded-[28px] bg-white/82 px-5 py-5 shadow-[0_14px_34px_rgba(52,36,17,0.06)] md:px-6">
      {title ? <h2 className="text-xl font-black text-[#173126]">{title}</h2> : null}
      <div
        className={`mt-4 overflow-hidden text-sm leading-8 text-[#5f564c] transition-all duration-300 ${expanded ? 'max-h-[2400px]' : 'max-h-[120px]'}`}
      >
        {isHtml ? (
          <div
            className="prose-archive prose-archive-headings prose-archive-links"
            dangerouslySetInnerHTML={{ __html: text }}
          />
        ) : (
          <div className="whitespace-pre-line">{text}</div>
        )}
      </div>
      <button
        className="mt-4 w-fit rounded-full border border-[#1f6a52]/14 bg-[#f7f2eb] px-4 py-2 text-sm font-bold text-[#1f6a52] transition hover:bg-white active:scale-[0.98]"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        {expanded ? 'بستن متن' : 'مطالعه بیشتر'}
      </button>
    </section>
  )
}

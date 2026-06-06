'use client'

import { useState } from 'react'

export function ExpandableTextBlock({
  title,
  text,
}: {
  title: string
  text: string
}) {
  const [expanded, setExpanded] = useState(false)

  if (!text.trim()) {
    return null
  }

  return (
    <section className="rounded-[28px] bg-white/82 px-5 py-5 shadow-[0_14px_34px_rgba(52,36,17,0.06)] md:px-6">
      <h2 className="text-xl font-black text-[#173126]">{title}</h2>
      <div
        className={`mt-4 overflow-hidden text-sm leading-8 text-[#5f564c] transition-all duration-300 ${expanded ? 'max-h-[1200px]' : 'max-h-[120px]'}`}
      >
        <div className="whitespace-pre-line">{text}</div>
      </div>
      <button
        className="mt-4 w-fit rounded-full border border-[#1f6a52]/14 bg-[#f7f2eb] px-4 py-2 text-sm font-bold text-[#1f6a52] transition hover:bg-white"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        {expanded ? 'بستن متن' : 'مطالعه بیشتر'}
      </button>
    </section>
  )
}

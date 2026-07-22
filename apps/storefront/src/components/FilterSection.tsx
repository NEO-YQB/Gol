'use client'

import { useState } from 'react'

type FilterSectionProps = {
  title: string
  count?: number
  defaultOpen?: boolean
  action?: React.ReactNode
  children: React.ReactNode
}

export function FilterSection({ title, count, defaultOpen = true, action, children }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className="group/section overflow-hidden rounded-[22px] border border-[#1f6a52]/8 bg-white/60 transition-all duration-300 hover:border-[#1f6a52]/18 hover:bg-white/80">
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-right transition-colors duration-200 hover:bg-[#f8f4ec]/60"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#173126]/8 text-[10px] font-black text-[#173126]/70 transition group-hover/section:bg-[#173126]/14">
            {typeof count === 'number' ? count : '•'}
          </span>
          <span className="text-sm font-black text-[#173126]">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <span
            aria-hidden="true"
            className={`flex h-5 w-5 items-center justify-center rounded-full bg-[#173126]/6 text-[10px] text-[#173126]/50 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'rotate-180' : ''}`}
          >
            ▾
          </span>
        </div>
      </button>
      <div
        className="grid transition-[grid-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr', opacity: isOpen ? 1 : 0 }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[#1f6a52]/6 px-4 pb-4 pt-3">
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}

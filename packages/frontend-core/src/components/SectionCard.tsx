import type { ReactNode } from 'react'
import { HintBadge } from './HintBadge'

type SectionCardProps = {
  eyebrow?: string
  title: string
  description?: string
  hint?: string
  actions?: ReactNode
  children: ReactNode
}

export function SectionCard({ eyebrow, title, description, hint, actions, children }: SectionCardProps) {
  return (
    <section className="fm-card fm-section-card">
      <header className="fm-section-head">
        <div>
          {eyebrow ? <p className="fm-section-eyebrow">{eyebrow}</p> : null}
          <div className="fm-section-title-row">
            <h3>{title}</h3>
            {hint ? <HintBadge text={hint} /> : null}
          </div>
          {description ? <p className="fm-section-description">{description}</p> : null}
        </div>
        {actions ? <div className="fm-section-actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  )
}

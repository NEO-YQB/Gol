import type { ReactNode } from 'react'

type SectionCardProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export function SectionCard({ eyebrow, title, description, actions, children }: SectionCardProps) {
  return (
    <section className="fm-card fm-section-card">
      <header className="fm-section-head">
        <div>
          {eyebrow ? <p className="fm-section-eyebrow">{eyebrow}</p> : null}
          <h3>{title}</h3>
          {description ? <p className="fm-section-description">{description}</p> : null}
        </div>
        {actions ? <div className="fm-section-actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  )
}

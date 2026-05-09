import type { SpotlightProps } from '../types'

export function Spotlight({ eyebrow, title, description, metrics, children }: SpotlightProps) {
  return (
    <section className="fm-spotlight">
      <div className="fm-spotlight-copy">
        <p className="fm-section-eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        <p className="fm-section-description">{description}</p>
      </div>
      <div className="fm-spotlight-metrics">
        {metrics.map((metric) => (
          <article className="fm-spotlight-metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </div>
      {children ? <div className="fm-spotlight-extra">{children}</div> : null}
    </section>
  )
}

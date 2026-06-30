import { cx } from '../cx'
import type { StatItem } from '../types'
import { HintBadge } from './HintBadge'

export function StatCard({ label, value, delta, detail, hint, tone = 'primary' }: StatItem) {
  return (
    <article className={cx('fm-card', 'fm-stat-card', `fm-stat-card--${tone}`)}>
      <div className="fm-stat-row">
        <div className="fm-stat-label">
          <p>{label}</p>
          {hint ? <HintBadge text={hint} /> : null}
        </div>
        <span>{delta}</span>
      </div>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  )
}

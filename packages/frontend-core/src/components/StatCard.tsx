import { cx } from '../cx'
import type { StatItem } from '../types'

export function StatCard({ label, value, delta, detail, tone = 'primary' }: StatItem) {
  return (
    <article className={cx('fm-card', 'fm-stat-card', `fm-stat-card--${tone}`)}>
      <div className="fm-stat-row">
        <p>{label}</p>
        <span>{delta}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

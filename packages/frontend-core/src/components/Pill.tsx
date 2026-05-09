import { cx } from '../cx'

type PillProps = {
  children: string
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger'
}

export function Pill({ children, tone = 'neutral' }: PillProps) {
  return <span className={cx('fm-pill', `fm-pill--${tone}`)}>{children}</span>
}

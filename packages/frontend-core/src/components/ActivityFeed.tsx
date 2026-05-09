import { cx } from '../cx'
import type { FeedItem } from '../types'

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  return (
    <div className="fm-feed">
      {items.map((item) => (
        <article className="fm-feed-item" key={item.id}>
          <span className={cx('fm-feed-dot', `fm-feed-dot--${item.tone ?? 'primary'}`)} />
          <div>
            <div className="fm-feed-row">
              <strong>{item.title}</strong>
              <small>{item.meta}</small>
            </div>
            <p>{item.description}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

type HintBadgeProps = {
  text: string
}

export function HintBadge({ text }: HintBadgeProps) {
  return (
    <span className="fm-hint" tabIndex={0}>
      <span aria-hidden="true" className="fm-hint__mark">
        ؟
      </span>
      <span className="fm-hint__bubble" role="tooltip">
        {text}
      </span>
    </span>
  )
}

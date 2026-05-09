import type { ReactNode } from 'react'

export function LoadableState({
  loading,
  error,
  children,
}: {
  loading: boolean
  error: string | null
  children: ReactNode
}) {
  if (loading) {
    return <div className="fm-message">در حال دریافت داده از backend...</div>
  }

  if (error) {
    return <div className="fm-message fm-message--danger">{error}</div>
  }

  return <>{children}</>
}

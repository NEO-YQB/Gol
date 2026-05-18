import type { ReactNode } from 'react'
import { useNoticeEffect } from './NoticeCenter'

export function LoadableState({
  loading,
  error,
  children,
}: {
  loading: boolean
  error: string | null
  children: ReactNode
}) {
  useNoticeEffect(error, 'error')

  if (loading) {
    return <div className="fm-message">در حال دریافت داده از سامانه...</div>
  }

  if (error) {
    return <div className="fm-message">بارگذاری این بخش انجام نشد. جزئیات در اعلان گوشه صفحه نمایش داده شد.</div>
  }

  return <>{children}</>
}

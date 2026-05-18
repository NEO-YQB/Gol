import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { CSSProperties } from 'react'

type NoticeTone = 'success' | 'error' | 'warning' | 'info'

type NoticeInput = {
  message: string
  tone?: NoticeTone
  durationMs?: number
}

type NoticeItem = NoticeInput & {
  id: string
  durationMs: number
}

type NoticeContextValue = {
  pushNotice: (input: NoticeInput) => void
  removeNotice: (id: string) => void
}

const NoticeContext = createContext<NoticeContextValue | null>(null)

const defaultDurationMs = 10000

function getNoticeTitle(tone: NoticeTone) {
  switch (tone) {
    case 'success':
      return 'انجام شد'
    case 'error':
      return 'خطا'
    case 'warning':
      return 'هشدار'
    case 'info':
    default:
      return 'اطلاع'
  }
}

function NoticeToast({ item, onClose }: { item: NoticeItem; onClose: () => void }) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onClose, item.durationMs)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [item.durationMs, onClose])

  return (
    <div className={`notice-toast notice-toast--${item.tone ?? 'info'}`} role="status">
      <svg
        aria-hidden="true"
        className="notice-toast__ring"
        style={{ ['--notice-duration' as keyof CSSProperties]: `${item.durationMs}ms` } as CSSProperties}
        viewBox="0 0 100 100"
      >
        <rect x="2" y="2" width="96" height="96" rx="18" ry="18" pathLength="100" />
      </svg>
      <div className="notice-toast__content">
        <strong>{getNoticeTitle(item.tone ?? 'info')}</strong>
        <p>{item.message}</p>
      </div>
      <button aria-label="بستن اعلان" className="notice-toast__close" onClick={onClose} type="button">
        ×
      </button>
    </div>
  )
}

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NoticeItem[]>([])
  const lastMessageRef = useRef<{ key: string; at: number } | null>(null)

  const removeNotice = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const pushNotice = useCallback(({ message, tone = 'info', durationMs = defaultDurationMs }: NoticeInput) => {
    const normalizedMessage = message.trim()
    if (!normalizedMessage) return

    const dedupeKey = `${tone}:${normalizedMessage}`
    const now = Date.now()
    if (lastMessageRef.current && lastMessageRef.current.key === dedupeKey && now - lastMessageRef.current.at < 800) {
      return
    }

    lastMessageRef.current = { key: dedupeKey, at: now }

    setItems((current) => [
      ...current,
      {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        message: normalizedMessage,
        tone,
        durationMs,
      },
    ])
  }, [])

  const value = useMemo(
    () => ({
      pushNotice,
      removeNotice,
    }),
    [pushNotice, removeNotice],
  )

  return (
    <NoticeContext.Provider value={value}>
      {children}
      <div className="notice-stack" aria-live="polite" aria-relevant="additions text">
        {items.map((item) => (
          <NoticeToast item={item} key={item.id} onClose={() => removeNotice(item.id)} />
        ))}
      </div>
    </NoticeContext.Provider>
  )
}

export function useNotice() {
  const context = useContext(NoticeContext)
  if (!context) {
    throw new Error('useNotice must be used inside NoticeProvider')
  }

  return context
}

export function useNoticeEffect(message: string | null | undefined, tone: NoticeTone = 'info') {
  const { pushNotice } = useNotice()
  const lastMessageRef = useRef<string | null>(null)

  useEffect(() => {
    const normalized = typeof message === 'string' ? message.trim() : ''
    if (!normalized) {
      lastMessageRef.current = null
      return
    }

    if (lastMessageRef.current === normalized) {
      return
    }

    lastMessageRef.current = normalized
    pushNotice({ message: normalized, tone })
  }, [message, pushNotice, tone])
}

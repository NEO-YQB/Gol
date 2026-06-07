'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CloseIcon, InfoIcon } from './storefrontIcons'
import { STOREFRONT_TOAST_EVENT, type StorefrontToastDetail } from './storefrontToast'

export function StorefrontToastHost() {
  const [toast, setToast] = useState<StorefrontToastDetail | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const dismissToast = useCallback(() => {
    setToast(null)
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    function handleToast(event: Event) {
      const customEvent = event as CustomEvent<StorefrontToastDetail>
      const detail = customEvent.detail
      if (!detail?.message) return

      setToast(detail)

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = window.setTimeout(() => {
        dismissToast()
      }, detail.duration ?? 8000)
    }

    window.addEventListener(STOREFRONT_TOAST_EVENT, handleToast as EventListener)

    return () => {
      window.removeEventListener(STOREFRONT_TOAST_EVENT, handleToast as EventListener)
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [dismissToast])

  if (!toast?.message) return null

  const tone =
    toast.variant === 'success'
      ? 'border-white/55 bg-[rgba(245,249,245,0.92)] text-[#6a716c]'
      : 'border-white/52 bg-[rgba(250,245,241,0.92)] text-[#74706a]'

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[120] md:bottom-6 md:left-6">
      <div
        className={`pointer-events-auto flex min-h-14 max-w-[min(calc(100vw-2rem),720px)] items-center gap-3 rounded-[20px] border px-3.5 py-3 shadow-[0_18px_44px_rgba(40,29,12,0.14)] backdrop-blur-xl ${tone}`}
        role="status"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/72 text-[#8b867f] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <InfoIcon />
        </div>
        <p className="text-right text-sm font-semibold leading-6 text-balance">
          {toast.message}
        </p>
        <button
          aria-label="بستن پیام"
          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#96918a] transition hover:bg-white/65 hover:text-[#6f6a63]"
          onClick={dismissToast}
          type="button"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  )
}

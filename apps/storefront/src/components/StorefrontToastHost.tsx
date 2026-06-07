'use client'

import { useEffect, useRef, useState } from 'react'
import { STOREFRONT_TOAST_EVENT, type StorefrontToastDetail } from './storefrontToast'

export function StorefrontToastHost() {
  const [toast, setToast] = useState<StorefrontToastDetail | null>(null)
  const timeoutRef = useRef<number | null>(null)

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
        setToast(null)
        timeoutRef.current = null
      }, detail.duration ?? 8000)
    }

    window.addEventListener(STOREFRONT_TOAST_EVENT, handleToast as EventListener)

    return () => {
      window.removeEventListener(STOREFRONT_TOAST_EVENT, handleToast as EventListener)
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  if (!toast?.message) return null

  const tone =
    toast.variant === 'success'
      ? 'border-[#1f6a52]/16 bg-[#edf8f2]/98 text-[#1f6a52]'
      : 'border-[#d06c54]/16 bg-[#fff6f3]/98 text-[#9f3f2c]'

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[120] flex justify-center md:bottom-6">
      <div className={`w-full max-w-[720px] rounded-[22px] border px-4 py-3 text-right text-sm font-bold leading-7 shadow-[0_20px_50px_rgba(40,29,12,0.18)] backdrop-blur-sm md:px-5 ${tone}`}>
        {toast.message}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function NearestSortButton() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  async function handleClick() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return
    }

    setIsLoading(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('sort', 'nearest')
        params.set('userLat', String(position.coords.latitude))
        params.set('userLng', String(position.coords.longitude))
        router.push(`${pathname}?${params.toString()}`)
        setIsLoading(false)
      },
      () => {
        setIsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <button
      className="rounded-full border border-[#1f6a52]/14 bg-white/80 px-4 py-2 text-sm font-bold text-[#1f6a52] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isLoading}
      onClick={handleClick}
      type="button"
    >
      {isLoading ? 'در حال گرفتن لوکیشن...' : 'مرتب‌سازی نزدیک‌ترین'}
    </button>
  )
}

'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getAddresses, readStoredSelectedAddress, readStoredToken, writeStoredSelectedAddress } from '../lib/storefrontAuth'

export function NearestSortButton() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  function pushNearest(lat: number, lng: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', 'nearest')
    params.set('userLat', String(lat))
    params.set('userLng', String(lng))
    router.push(`${pathname}?${params.toString()}`)
  }

  async function handleClick() {
    setIsLoading(true)

    const token = readStoredToken()

    if (token) {
      const storedAddress = readStoredSelectedAddress()
      if (storedAddress) {
        pushNearest(storedAddress.lat, storedAddress.lng)
        setIsLoading(false)
        return
      }

      try {
        const addresses = await getAddresses(token)
        const selectedAddress = addresses.find((item) => item.isDefault) || addresses[0]
        if (selectedAddress) {
          writeStoredSelectedAddress(selectedAddress)
          pushNearest(selectedAddress.lat, selectedAddress.lng)
          setIsLoading(false)
          return
        }
      } catch {
      }
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setIsLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        pushNearest(position.coords.latitude, position.coords.longitude)
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

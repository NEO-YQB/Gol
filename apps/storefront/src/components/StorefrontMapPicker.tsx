'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

declare global {
  interface Window {
    L?: {
      map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap
      tileLayer: (url: string, options?: Record<string, unknown>) => { addTo: (map: LeafletMap) => void }
      marker: (latlng: [number, number], options?: Record<string, unknown>) => LeafletMarker
    }
  }
}

type LeafletMap = {
  setView: (latlng: [number, number], zoom: number) => LeafletMap
  on: (event: string, handler: (event: { latlng?: { lat: number; lng: number } }) => void) => LeafletMap
  remove: () => void
}

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker
  setLatLng: (latlng: [number, number]) => LeafletMarker
  on: (event: string, handler: (event: { target?: { getLatLng?: () => { lat: number; lng: number } } }) => void) => LeafletMarker
}

const DEFAULT_LAT = 35.7219
const DEFAULT_LNG = 51.3347
const DEFAULT_ZOOM = 14
const LEAFLET_SCRIPT_ID = 'storefront-leaflet-script'
const LEAFLET_STYLE_ID = 'storefront-leaflet-style'

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL_TEMPLATE || ''
const TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || ''

function loadLeafletAssets() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.L) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    if (!document.getElementById(LEAFLET_STYLE_ID)) {
      const link = document.createElement('link')
      link.id = LEAFLET_STYLE_ID
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const existingScript = document.getElementById(LEAFLET_SCRIPT_ID) as HTMLScriptElement | null
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Leaflet load failed')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = LEAFLET_SCRIPT_ID
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Leaflet load failed'))
    document.body.appendChild(script)
  })
}

export type StorefrontMapValue = {
  lat: number
  lng: number
}

export function StorefrontMapPicker({
  value,
  onChange,
}: {
  value: StorefrontMapValue
  onChange: (nextValue: StorefrontMapValue) => void
}) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const instanceRef = useRef<{ map?: LeafletMap; marker?: LeafletMarker }>({})
  const [mapError, setMapError] = useState('')

  const initialCenter = useMemo<[number, number]>(() => [value.lat || DEFAULT_LAT, value.lng || DEFAULT_LNG], [value.lat, value.lng])

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      if (!mapRef.current) return

      try {
        if (!TILE_URL) {
          setMapError('آدرس tile provider تنظیم نشده است. مقدار map.ir یا provider نهایی را در env وارد کن.')
          return
        }

        await loadLeafletAssets()
        if (cancelled || !mapRef.current || !window.L) return

        const map = window.L.map(mapRef.current, {
          center: initialCenter,
          zoom: DEFAULT_ZOOM,
        }).setView(initialCenter, DEFAULT_ZOOM)

        window.L.tileLayer(TILE_URL, {
          attribution: TILE_ATTRIBUTION,
          maxZoom: 19,
        }).addTo(map)

        const marker = window.L.marker(initialCenter, {
          draggable: true,
        }).addTo(map)

        map.on('click', (event) => {
          const lat = event.latlng?.lat
          const lng = event.latlng?.lng
          if (typeof lat !== 'number' || typeof lng !== 'number') return
          marker.setLatLng([lat, lng])
          onChange({ lat, lng })
        })

        marker.on('dragend', (event) => {
          const latlng = event.target?.getLatLng?.()
          if (!latlng) return
          onChange({ lat: latlng.lat, lng: latlng.lng })
        })

        instanceRef.current = { map, marker }
        setMapError('')
      } catch {
        if (!cancelled) {
          setMapError('بارگذاری نقشه ممکن نشد. مختصات را فعلاً دستی وارد کن.')
        }
      }
    }

    initialize()

    return () => {
      cancelled = true
      instanceRef.current.map?.remove()
      instanceRef.current = {}
    }
  }, [initialCenter, onChange])

  useEffect(() => {
    instanceRef.current.marker?.setLatLng([value.lat, value.lng])
    instanceRef.current.map?.setView([value.lat, value.lng], DEFAULT_ZOOM)
  }, [value.lat, value.lng])

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-[28px] border border-[#1f6a52]/12 bg-[#f6efe5]">
        <div className="flex items-center justify-between gap-3 border-b border-[#1f6a52]/10 px-4 py-3">
          <div>
            <strong className="block text-sm font-black text-[#173126]">انتخاب موقعیت روی نقشه</strong>
            <p className="mt-1 text-xs leading-6 text-[#6e6152]">روی نقشه کلیک کن یا marker را جابه‌جا کن تا مختصات دقیق ذخیره شود.</p>
          </div>
          <div className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#1f6a52]">
            {`${value.lat.toFixed(5)} , ${value.lng.toFixed(5)}`}
          </div>
        </div>
        <div className="h-[320px] w-full bg-[#e7dfd4]" ref={mapRef} />
      </div>
      {mapError ? <p className="text-sm font-bold text-[#b64b36]">{mapError}</p> : null}
    </div>
  )
}

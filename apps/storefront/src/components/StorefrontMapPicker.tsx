'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

declare global {
  interface Window {
    mapboxgl?: {
      accessToken?: string
      Map: new (options: Record<string, unknown>) => MapboxMap
      Marker: new (options?: Record<string, unknown>) => MapboxMarker
      NavigationControl: new () => unknown
    }
  }
}

type MapboxMap = {
  on: (event: string, handler: (event: { lngLat?: { lat: number; lng: number } }) => void) => MapboxMap
  addControl: (control: unknown, position?: string) => void
  setCenter: (lngLat: [number, number]) => void
  remove: () => void
}

type MapboxMarker = {
  setLngLat: (lngLat: [number, number]) => MapboxMarker
  addTo: (map: MapboxMap) => MapboxMarker
  on: (event: string, handler: () => void) => MapboxMarker
  getLngLat: () => { lat: number; lng: number }
}

const DEFAULT_LAT = 35.7219
const DEFAULT_LNG = 51.3347
const DEFAULT_ZOOM = 14
const MAPBOX_GL_SCRIPT_ID = 'storefront-mapboxgl-script'
const MAPBOX_GL_STYLE_ID = 'storefront-mapboxgl-style'

const MAP_IR_API_KEY = process.env.NEXT_PUBLIC_MAP_IR_API_KEY || ''
const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_IR_STYLE_URL ||
  'https://map.ir/vector/styles/main/mapir-xyz-style.json'

function loadMapAssets() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.mapboxgl) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    if (!document.getElementById(MAPBOX_GL_STYLE_ID)) {
      const link = document.createElement('link')
      link.id = MAPBOX_GL_STYLE_ID
      link.rel = 'stylesheet'
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css'
      document.head.appendChild(link)
    }

    const existingScript = document.getElementById(MAPBOX_GL_SCRIPT_ID) as HTMLScriptElement | null
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Map SDK load failed')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = MAPBOX_GL_SCRIPT_ID
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Map SDK load failed'))
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
  const instanceRef = useRef<{ map?: MapboxMap; marker?: MapboxMarker }>({})
  const [mapError, setMapError] = useState('')

  const initialCenter = useMemo<[number, number]>(() => [value.lng || DEFAULT_LNG, value.lat || DEFAULT_LAT], [value.lat, value.lng])

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      if (!mapRef.current) return

      try {
        if (!MAP_IR_API_KEY) {
          setMapError('کلید عمومی map.ir تنظیم نشده است. مقدار NEXT_PUBLIC_MAP_IR_API_KEY را در env وارد کن.')
          return
        }

        await loadMapAssets()
        if (cancelled || !mapRef.current || !window.mapboxgl) return

        window.mapboxgl.accessToken = MAP_IR_API_KEY

        const map = new window.mapboxgl.Map({
          container: mapRef.current,
          style: MAP_STYLE_URL,
          transformRequest: (url: string) => {
            if (url.startsWith('https://map.ir')) {
              return {
                url,
                headers: {
                  'x-api-key': MAP_IR_API_KEY,
                },
              }
            }

            return { url }
          },
          center: initialCenter,
          zoom: DEFAULT_ZOOM,
        })

        map.addControl(new window.mapboxgl.NavigationControl(), 'top-left')

        const marker = new window.mapboxgl.Marker({
          draggable: true,
        })
          .setLngLat(initialCenter)
          .addTo(map)

        map.on('click', (event) => {
          const lat = event.lngLat?.lat
          const lng = event.lngLat?.lng
          if (typeof lat !== 'number' || typeof lng !== 'number') return
          marker.setLngLat([lng, lat])
          onChange({ lat, lng })
        })

        marker.on('dragend', () => {
          const latlng = marker.getLngLat()
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
    instanceRef.current.marker?.setLngLat([value.lng, value.lat])
    instanceRef.current.map?.setCenter([value.lng, value.lat])
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

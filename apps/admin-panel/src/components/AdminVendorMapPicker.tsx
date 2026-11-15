import { useEffect, useRef, useState } from 'react'
import { resolveApiBaseUrl } from '../lib/api'

declare global {
  interface Window {
    mapboxgl?: {
      accessToken?: string
      Map: new (options: Record<string, unknown>) => AdminMapboxMap
      Marker: new (options?: Record<string, unknown>) => AdminMapboxMarker
      NavigationControl: new () => unknown
      setRTLTextPlugin?: (pluginURL: string, callback?: (error?: Error) => void, lazy?: boolean) => void
    }
  }
}

type AdminMapboxMap = {
  on: (event: string, handler: (event: { lngLat?: { lat: number; lng: number } }) => void) => AdminMapboxMap
  addControl: (control: unknown, position?: string) => void
  setCenter: (lngLat: [number, number]) => void
  resize?: () => void
  remove: () => void
}

type AdminMapboxMarker = {
  setLngLat: (lngLat: [number, number]) => AdminMapboxMarker
  addTo: (map: AdminMapboxMap) => AdminMapboxMarker
  on: (event: string, handler: () => void) => AdminMapboxMarker
  getLngLat: () => { lat: number; lng: number }
}

const DEFAULT_LAT = 35.7219
const DEFAULT_LNG = 51.3347
const DEFAULT_ZOOM = 14
const MAPBOX_GL_SCRIPT_ID = 'admin-mapboxgl-script'
const MAPBOX_GL_STYLE_ID = 'admin-mapboxgl-style'

const MAP_STYLE_URL =
  import.meta.env.VITE_MAP_IR_STYLE_URL ||
  'https://map.ir/vector/styles/main/mapir-xyz-style.json'
const RTL_PLUGIN_URL =
  import.meta.env.VITE_MAP_IR_RTL_PLUGIN_URL ||
  'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.4.0/mapbox-gl-rtl-text.js'

let cachedMapConfig: { apiKey: string; styleUrl: string; rtlPluginUrl: string } | null = null

async function getMapConfig(): Promise<{ apiKey: string; styleUrl: string; rtlPluginUrl: string }> {
  if (cachedMapConfig && cachedMapConfig.apiKey) {
    return cachedMapConfig
  }

  const envKey = (import.meta.env.VITE_MAP_IR_API_KEY || '').trim()
  const envStyle = (import.meta.env.VITE_MAP_IR_STYLE_URL || '').trim()
  const envRtl = (import.meta.env.VITE_MAP_IR_RTL_PLUGIN_URL || '').trim()

  if (envKey) {
    cachedMapConfig = {
      apiKey: envKey,
      styleUrl: envStyle || MAP_STYLE_URL,
      rtlPluginUrl: envRtl || RTL_PLUGIN_URL,
    }
    return cachedMapConfig
  }

  // Fallback: fetch from backend runtime config
  try {
    const apiBase = resolveApiBaseUrl()
    const res = await fetch(`${apiBase}/mobile-app/config`, { cache: 'no-store' })
    if (res.ok) {
      const payload = (await res.json()) as { map?: { publicKey?: string; styleUrl?: string; rtlPluginUrl?: string } }
      const backendKey = payload?.map?.publicKey?.trim() || ''
      if (backendKey) {
        cachedMapConfig = {
          apiKey: backendKey,
          styleUrl: payload?.map?.styleUrl || envStyle || MAP_STYLE_URL,
          rtlPluginUrl: payload?.map?.rtlPluginUrl || envRtl || RTL_PLUGIN_URL,
        }
        return cachedMapConfig
      }
    }
  } catch (err) {
    console.warn('Failed to fetch map config from backend:', err)
  }

  return {
    apiKey: '',
    styleUrl: envStyle || MAP_STYLE_URL,
    rtlPluginUrl: envRtl || RTL_PLUGIN_URL,
  }
}

function loadMapAssets() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.mapboxgl) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    if (!document.getElementById(MAPBOX_GL_STYLE_ID)) {
      const link = document.createElement('link')
      link.id = MAPBOX_GL_STYLE_ID
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css'
      document.head.appendChild(link)
    }

    const existingScript = document.getElementById(MAPBOX_GL_SCRIPT_ID) as HTMLScriptElement | null
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        window.mapboxgl = (window as unknown as { maplibregl?: typeof window.mapboxgl }).maplibregl
        resolve()
      }, { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Map SDK load failed')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = MAPBOX_GL_SCRIPT_ID
    script.src = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js'
    script.async = true
    script.onload = () => {
      window.mapboxgl = (window as unknown as { maplibregl?: typeof window.mapboxgl }).maplibregl
      resolve()
    }
    script.onerror = () => reject(new Error('Map SDK load failed'))
    document.body.appendChild(script)
  })
}

export function AdminVendorMapPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number }
  onChange: (nextValue: { lat: number; lng: number }) => void
}) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const instanceRef = useRef<{ map?: AdminMapboxMap; marker?: AdminMapboxMarker }>({})
  const onChangeRef = useRef(onChange)
  const [mapError, setMapError] = useState('')

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      if (!mapRef.current) return

      try {
        const config = await getMapConfig()
        if (!config.apiKey) {
          setMapError('کلید عمومی map.ir تنظیم نشده است. مقدار VITE_MAP_IR_API_KEY یا MAP_IR_API_KEY را در env وارد کن.')
          return
        }

        await loadMapAssets()
        if (cancelled || !mapRef.current || !window.mapboxgl) return

        window.mapboxgl.accessToken = config.apiKey
        window.mapboxgl.setRTLTextPlugin?.(config.rtlPluginUrl, undefined, true)

        const map = new window.mapboxgl.Map({
          container: mapRef.current,
          style: config.styleUrl,
          transformRequest: (url: string) => {
            if (url.startsWith('https://map.ir')) {
              return {
                url,
                headers: {
                  'x-api-key': config.apiKey,
                },
              }
            }

            return { url }
          },
          center: [value.lng || DEFAULT_LNG, value.lat || DEFAULT_LAT],
          zoom: DEFAULT_ZOOM,
        })

        map.addControl(new window.mapboxgl.NavigationControl(), 'top-left')

        const marker = new window.mapboxgl.Marker({ draggable: true })
          .setLngLat([value.lng || DEFAULT_LNG, value.lat || DEFAULT_LAT])
          .addTo(map)

        map.on('click', (event) => {
          const lat = event.lngLat?.lat
          const lng = event.lngLat?.lng
          if (typeof lat !== 'number' || typeof lng !== 'number') return
          marker.setLngLat([lng, lat])
          onChangeRef.current({ lat, lng })
        })

        marker.on('dragend', () => {
          const latlng = marker.getLngLat()
          onChangeRef.current({ lat: latlng.lat, lng: latlng.lng })
        })

        instanceRef.current = { map, marker }
        map.on('load', () => {
          map.resize?.()
          setMapError('')
        })
        setMapError('')
      } catch {
        if (!cancelled) {
          setMapError('بارگذاری نقشه ممکن نشد.')
        }
      }
    }

    void initialize()

    return () => {
      cancelled = true
      instanceRef.current.map?.remove()
      instanceRef.current = {}
    }
  }, [])

  useEffect(() => {
    instanceRef.current.marker?.setLngLat([value.lng, value.lat])
    instanceRef.current.map?.setCenter([value.lng, value.lat])
    instanceRef.current.map?.resize?.()
  }, [value.lat, value.lng])

  return (
    <div className="vendors-map-picker">
      <div className="vendors-map-picker__head">
        <div>
          <strong>بروزرسانی لوکیشن فروشگاه</strong>
          <p>فقط ادمین یا کاربران دارای دسترسی لازم می‌توانند marker را جابه‌جا کنند و موقعیت فروشنده را اصلاح کنند.</p>
        </div>
        <span className="vendors-map-picker__coords">{`${value.lat.toFixed(5)} , ${value.lng.toFixed(5)}`}</span>
      </div>
      <div className="vendors-map-picker__canvas" ref={mapRef} />
      {mapError ? <p className="fm-message fm-message--danger">{mapError}</p> : null}
    </div>
  )
}

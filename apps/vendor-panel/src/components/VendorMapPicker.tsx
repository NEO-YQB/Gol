import { useEffect, useRef, useState } from 'react'
import { resolveApiBaseUrl } from '../lib/api'

declare global {
  interface Window {
    mapboxgl?: {
      accessToken?: string
      Map: new (options: Record<string, unknown>) => VendorMapboxMap
      Marker: new (options?: Record<string, unknown>) => VendorMapboxMarker
      NavigationControl: new () => unknown
      setRTLTextPlugin?: (pluginURL: string, callback?: (error?: Error) => void, lazy?: boolean) => void
    }
  }
}

type VendorMapboxMap = {
  on: (event: string, handler: (event: { lngLat?: { lat: number; lng: number } }) => void) => VendorMapboxMap
  addControl: (control: unknown, position?: string) => void
  setCenter: (lngLat: [number, number]) => void
  remove: () => void
}

type VendorMapboxMarker = {
  setLngLat: (lngLat: [number, number]) => VendorMapboxMarker
  addTo: (map: VendorMapboxMap) => VendorMapboxMarker
  on: (event: string, handler: () => void) => VendorMapboxMarker
  getLngLat: () => { lat: number; lng: number }
}

const DEFAULT_LAT = 35.7219
const DEFAULT_LNG = 51.3347
const DEFAULT_ZOOM = 14
const MAPBOX_GL_SCRIPT_ID = 'vendor-mapboxgl-script'
const MAPBOX_GL_STYLE_ID = 'vendor-mapboxgl-style'

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

export type VendorMapValue = {
  lat: number
  lng: number
}

export function VendorMapPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: VendorMapValue
  onChange?: (nextValue: VendorMapValue) => void
  disabled?: boolean
}) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const instanceRef = useRef<{ map?: VendorMapboxMap; marker?: VendorMapboxMarker }>({})
  const onChangeRef = useRef(onChange)
  const initialCenterRef = useRef<[number, number]>([value.lng || DEFAULT_LNG, value.lat || DEFAULT_LAT])
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
          center: initialCenterRef.current,
          zoom: DEFAULT_ZOOM,
        })

        map.addControl(new window.mapboxgl.NavigationControl(), 'top-left')

        const marker = new window.mapboxgl.Marker({
          draggable: !disabled,
        })
          .setLngLat(initialCenterRef.current)
          .addTo(map)

        if (!disabled) {
          map.on('click', (event) => {
            const lat = event.lngLat?.lat
            const lng = event.lngLat?.lng
            if (typeof lat !== 'number' || typeof lng !== 'number') return
            marker.setLngLat([lng, lat])
            onChangeRef.current?.({ lat, lng })
          })

          marker.on('dragend', () => {
            const latlng = marker.getLngLat()
            onChangeRef.current?.({ lat: latlng.lat, lng: latlng.lng })
          })
        }

        instanceRef.current = { map, marker }
        setMapError('')
      } catch {
        if (!cancelled) {
          setMapError(disabled ? 'نمایش نقشه ممکن نشد.' : 'بارگذاری نقشه ممکن نشد. مختصات را فعلاً دستی وارد کن.')
        }
      }
    }

    void initialize()

    return () => {
      cancelled = true
      instanceRef.current.map?.remove()
      instanceRef.current = {}
    }
  }, [disabled])

  useEffect(() => {
    instanceRef.current.marker?.setLngLat([value.lng, value.lat])
    instanceRef.current.map?.setCenter([value.lng, value.lat])
  }, [value.lat, value.lng])

  return (
    <div className="vendor-map-picker">
      <div className="vendor-map-picker__head">
        <div>
          <strong>{disabled ? 'لوکیشن ثبت‌شده فروشگاه' : 'انتخاب موقعیت مغازه روی نقشه'}</strong>
          <p>
            {disabled
              ? 'این لوکیشن پس از ثبت برای حفظ منطق فروشنده نزدیک قفل می‌شود و فقط توسط تیم پشتیبانی قابل‌تغییر است.'
              : 'روی نقشه کلیک کن یا marker را جابه‌جا کن تا مختصات دقیق فروشگاه ثبت شود.'}
          </p>
        </div>
        <span className="vendor-map-picker__coords">{`${value.lat.toFixed(5)} , ${value.lng.toFixed(5)}`}</span>
      </div>
      <div className="vendor-map-picker__canvas" ref={mapRef} />
      {mapError ? <p className="fm-message fm-message--danger">{mapError}</p> : null}
    </div>
  )
}

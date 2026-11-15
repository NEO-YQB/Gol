import { NextResponse } from 'next/server'

export async function GET() {
  const localKey =
    process.env.NEXT_PUBLIC_MAP_IR_API_KEY?.trim() ||
    process.env.MAP_IR_API_KEY?.trim() ||
    process.env.VITE_MAP_IR_API_KEY?.trim() ||
    ''

  const localStyle =
    process.env.NEXT_PUBLIC_MAP_IR_STYLE_URL?.trim() ||
    process.env.MAP_IR_STYLE_URL?.trim() ||
    ''

  const localRtl =
    process.env.NEXT_PUBLIC_MAP_IR_RTL_PLUGIN_URL?.trim() ||
    process.env.MAP_IR_RTL_PLUGIN_URL?.trim() ||
    ''

  if (localKey) {
    return NextResponse.json({
      apiKey: localKey,
      styleUrl: localStyle || 'https://map.ir/vector/styles/main/mapir-xyz-style.json',
      rtlPluginUrl: localRtl || 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.4.0/mapbox-gl-rtl-text.js',
    })
  }

  // Fallback to backend API
  const backendBaseUrl =
    process.env.API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    (process.env.NODE_ENV === 'production' ? 'https://api.golino.shop/v1' : 'http://localhost:3000/v1')

  try {
    const res = await fetch(`${backendBaseUrl.replace(/\/+$/, '')}/mobile-app/config`, {
      cache: 'no-store',
    })
    if (res.ok) {
      const payload = (await res.json()) as { map?: { publicKey?: string; styleUrl?: string; rtlPluginUrl?: string } }
      if (payload?.map?.publicKey) {
        return NextResponse.json({
          apiKey: payload.map.publicKey,
          styleUrl: payload.map.styleUrl || localStyle || 'https://map.ir/vector/styles/main/mapir-xyz-style.json',
          rtlPluginUrl: payload.map.rtlPluginUrl || localRtl || 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.4.0/mapbox-gl-rtl-text.js',
        })
      }
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    apiKey: '',
    styleUrl: localStyle || 'https://map.ir/vector/styles/main/mapir-xyz-style.json',
    rtlPluginUrl: localRtl || 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.4.0/mapbox-gl-rtl-text.js',
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiUrl } from '../../../../lib/backendApi'

type ReverseGeocodeResponse = {
  formattedAddress: string
  city: string
  raw: unknown
}

const MAP_REVERSE_GEOCODE_URL = process.env.MAP_REVERSE_GEOCODE_URL || ''
const MAP_REVERSE_GEOCODE_KEY = process.env.MAP_REVERSE_GEOCODE_KEY || ''

function pickString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return ''
}

function mapPayload(payload: unknown): ReverseGeocodeResponse {
  const record = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {}
  const addressRecord =
    typeof record.address === 'object' && record.address !== null ? (record.address as Record<string, unknown>) : {}

  const formattedAddress =
    pickString(record, ['formatted_address', 'address', 'display_name']) ||
    pickString(addressRecord, ['formatted_address', 'address']) ||
    ''

  const city =
    pickString(record, ['city', 'county', 'state']) ||
    pickString(addressRecord, ['city', 'town', 'county', 'state']) ||
    ''

  return {
    formattedAddress,
    city,
    raw: payload,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ message: 'مختصات نقشه کامل نیست' }, { status: 400 })
  }

  const reverseKey =
    process.env.MAP_REVERSE_GEOCODE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_MAP_IR_API_KEY?.trim() ||
    process.env.MAP_IR_API_KEY?.trim() ||
    process.env.VITE_MAP_IR_API_KEY?.trim() ||
    ''

  const reverseUrl = process.env.MAP_REVERSE_GEOCODE_URL?.trim() || 'https://map.ir/reverse'

  // If local direct key is not configured, proxy through backend
  if (!reverseKey) {
    const backendBaseUrl = getBackendApiUrl(request)

    try {
      const res = await fetch(`${backendBaseUrl}/mobile-app/reverse-geocode?lat=${lat}&lng=${lng}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const payload = (await res.json()) as { formattedAddress?: string; address?: string; raw?: unknown }
        return NextResponse.json({
          formattedAddress: payload.formattedAddress || payload.address || '',
          city: '',
          raw: payload,
        })
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ message: 'سرویس تبدیل مختصات به آدرس تنظیم نشده است' }, { status: 503 })
  }

  try {
    const targetUrl = new URL(reverseUrl)
    targetUrl.searchParams.set('lat', lat)
    targetUrl.searchParams.set('lon', lng)

    const headers: HeadersInit = {
      'x-api-key': reverseKey,
    }

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers,
      cache: 'no-store',
    })

    const payload = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        { message: 'دریافت آدرس از روی نقشه با خطا مواجه شد', details: payload },
        { status: response.status },
      )
    }

    return NextResponse.json(mapPayload(payload))
  } catch {
    return NextResponse.json({ message: 'ارتباط با سرویس نقشه برقرار نشد' }, { status: 502 })
  }
}

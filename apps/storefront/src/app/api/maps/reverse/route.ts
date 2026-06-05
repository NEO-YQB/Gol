import { NextRequest, NextResponse } from 'next/server'

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
  if (!MAP_REVERSE_GEOCODE_URL) {
    return NextResponse.json({ message: 'سرویس تبدیل مختصات به آدرس تنظیم نشده است' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ message: 'مختصات نقشه کامل نیست' }, { status: 400 })
  }

  try {
    const targetUrl = new URL(MAP_REVERSE_GEOCODE_URL)
    targetUrl.searchParams.set('lat', lat)
    targetUrl.searchParams.set('lon', lng)

    const headers: HeadersInit = {}
    if (MAP_REVERSE_GEOCODE_KEY) {
      headers['x-api-key'] = MAP_REVERSE_GEOCODE_KEY
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

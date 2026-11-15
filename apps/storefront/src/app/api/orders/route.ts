import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiUrl } from '../../../lib/backendApi'

export async function GET(request: NextRequest) {
  const apiBaseUrl = getBackendApiUrl(request)

  try {
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const targetUrl = queryString
      ? `${apiBaseUrl}/orders?${queryString}`
      : `${apiBaseUrl}/orders`

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: request.headers.get('Authorization') || '',
      },
      cache: 'no-store',
    })

    const payload = await response.text()
    return new NextResponse(payload, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    })
  } catch (error) {
    console.error('Failed to proxy GET orders to backend:', apiBaseUrl, error)
    return NextResponse.json({ message: 'دریافت لیست سفارش‌ها با خطا مواجه شد' }, { status: 502 })
  }
}

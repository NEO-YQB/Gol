import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiUrl } from '../../../../lib/backendApi'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const apiBaseUrl = getBackendApiUrl(request)

  try {
    const response = await fetch(`${apiBaseUrl}/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
      },
      body,
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
    console.error('Failed to proxy payments/initiate to backend:', apiBaseUrl, error)
    return NextResponse.json({ message: 'شروع پرداخت با خطا مواجه شد' }, { status: 502 })
  }
}

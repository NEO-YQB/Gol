import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiUrl } from '../../../../lib/backendApi'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const apiBaseUrl = getBackendApiUrl(request)

  try {
    const response = await fetch(`${apiBaseUrl}/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    console.error('Failed to proxy send-otp to backend:', apiBaseUrl, error)
    return NextResponse.json({ message: 'ارتباط با سرور احراز هویت برقرار نشد' }, { status: 502 })
  }
}

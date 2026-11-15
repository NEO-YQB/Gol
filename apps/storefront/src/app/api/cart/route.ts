import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiUrl } from '../../../lib/backendApi'

export async function GET(request: NextRequest) {
  const apiBaseUrl = getBackendApiUrl(request)

  try {
    const response = await fetch(`${apiBaseUrl}/cart`, {
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
    console.error('Failed to proxy GET cart to backend:', apiBaseUrl, error)
    return NextResponse.json({ message: 'دریافت سبد خرید با خطا مواجه شد' }, { status: 502 })
  }
}

export async function DELETE(request: NextRequest) {
  const apiBaseUrl = getBackendApiUrl(request)

  try {
    const response = await fetch(`${apiBaseUrl}/cart`, {
      method: 'DELETE',
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
    console.error('Failed to proxy DELETE cart to backend:', apiBaseUrl, error)
    return NextResponse.json({ message: 'خالی کردن سبد خرید با خطا مواجه شد' }, { status: 502 })
  }
}

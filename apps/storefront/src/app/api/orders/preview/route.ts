import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:3000/v1'

export async function POST(request: NextRequest) {
  const body = await request.text()

  try {
    const response = await fetch(`${API_BASE_URL}/orders/preview`, {
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
  } catch {
    return NextResponse.json({ message: 'پیش‌نمایش تسویه حساب با خطا مواجه شد' }, { status: 502 })
  }
}

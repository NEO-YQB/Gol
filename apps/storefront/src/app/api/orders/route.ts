import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:3000/v1'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const targetUrl = queryString
      ? `${API_BASE_URL}/orders?${queryString}`
      : `${API_BASE_URL}/orders`

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
  } catch {
    return NextResponse.json({ message: 'دریافت لیست سفارش‌ها با خطا مواجه شد' }, { status: 502 })
  }
}

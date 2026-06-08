import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:3000/v1'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  try {
    const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
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
    return NextResponse.json({ message: 'دریافت جزئیات سفارش با خطا مواجه شد' }, { status: 502 })
  }
}

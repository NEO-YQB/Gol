import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:3000/v1'

type RouteContext = {
  params?: Promise<Record<string, string | string[] | undefined>>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const params = await context.params
  const itemId = typeof params?.itemId === 'string' ? params.itemId : ''
  const body = await request.text()

  if (!itemId) {
    return NextResponse.json({ message: 'شناسه آیتم نامعتبر است' }, { status: 400 })
  }

  try {
    const response = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
      method: 'PATCH',
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
    return NextResponse.json({ message: 'ویرایش آیتم سبد خرید با خطا مواجه شد' }, { status: 502 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const params = await context.params
  const itemId = typeof params?.itemId === 'string' ? params.itemId : ''

  if (!itemId) {
    return NextResponse.json({ message: 'شناسه آیتم نامعتبر است' }, { status: 400 })
  }

  try {
    const response = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
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
  } catch {
    return NextResponse.json({ message: 'حذف آیتم سبد خرید با خطا مواجه شد' }, { status: 502 })
  }
}

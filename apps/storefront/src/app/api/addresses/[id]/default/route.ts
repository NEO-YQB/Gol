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
  const id = typeof params?.id === 'string' ? params.id : ''

  if (!id) {
    return NextResponse.json({ message: 'شناسه آدرس نامعتبر است' }, { status: 400 })
  }

  try {
    const response = await fetch(`${API_BASE_URL}/addresses/${id}/default`, {
      method: 'PATCH',
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
    return NextResponse.json({ message: 'تنظیم آدرس پیش‌فرض با خطا مواجه شد' }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiUrl } from '../../../../../lib/backendApi'

type RouteContext = {
  params?: Promise<Record<string, string | string[] | undefined>>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const params = await context.params
  const id = typeof params?.id === 'string' ? params.id : ''

  if (!id) {
    return NextResponse.json({ message: 'شناسه آدرس نامعتبر است' }, { status: 400 })
  }

  const apiBaseUrl = getBackendApiUrl(request)

  try {
    const response = await fetch(`${apiBaseUrl}/addresses/${id}/default`, {
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
  } catch (error) {
    console.error(`Failed to proxy PATCH default address ${id} to backend:`, apiBaseUrl, error)
    return NextResponse.json({ message: 'تنظیم آدرس پیش‌فرض با خطا مواجه شد' }, { status: 502 })
  }
}

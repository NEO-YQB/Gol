import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiUrl } from '../../../../../lib/backendApi'

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

  const apiBaseUrl = getBackendApiUrl(request)

  try {
    const response = await fetch(`${apiBaseUrl}/cart/items/${itemId}`, {
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
  } catch (error) {
    console.error(`Failed to proxy PATCH cart item ${itemId} to backend:`, apiBaseUrl, error)
    return NextResponse.json({ message: 'ویرایش آیتم سبد خرید با خطا مواجه شد' }, { status: 502 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const params = await context.params
  const itemId = typeof params?.itemId === 'string' ? params.itemId : ''

  if (!itemId) {
    return NextResponse.json({ message: 'شناسه آیتم نامعتبر است' }, { status: 400 })
  }

  const apiBaseUrl = getBackendApiUrl(request)

  try {
    const response = await fetch(`${apiBaseUrl}/cart/items/${itemId}`, {
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
    console.error(`Failed to proxy DELETE cart item ${itemId} to backend:`, apiBaseUrl, error)
    return NextResponse.json({ message: 'حذف آیتم سبد خرید با خطا مواجه شد' }, { status: 502 })
  }
}

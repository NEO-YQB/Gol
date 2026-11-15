import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiUrl } from '../../../../lib/backendApi'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const apiBaseUrl = getBackendApiUrl(request)

  try {
    const response = await fetch(`${apiBaseUrl}/orders/${id}`, {
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
    console.error(`Failed to proxy GET order ${id} to backend:`, apiBaseUrl, error)
    return NextResponse.json({ message: 'دریافت جزئیات سفارش با خطا مواجه شد' }, { status: 502 })
  }
}

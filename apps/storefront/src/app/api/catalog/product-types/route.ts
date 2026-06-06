import { NextResponse } from 'next/server'
import { getStorefrontProductTypes } from '../../../../lib/storefront'

export async function GET() {
  try {
    const productTypes = await getStorefrontProductTypes()
    return NextResponse.json(productTypes)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

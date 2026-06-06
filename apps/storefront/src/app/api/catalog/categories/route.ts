import { NextResponse } from 'next/server'
import { getStorefrontCategories } from '../../../../lib/storefront'

export async function GET() {
  try {
    const categories = await getStorefrontCategories()
    return NextResponse.json(categories)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

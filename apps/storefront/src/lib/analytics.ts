export interface AnalyticsItem {
  item_id: string
  item_name: string
  item_category?: string
  item_category2?: string
  item_brand?: string
  price: number
  quantity: number
}

export interface EcommerceEvent {
  event: string
  ecommerce?: {
    currency: string
    value: number
    items: AnalyticsItem[]
    transaction_id?: string
    tax?: number
    shipping?: number
    coupon?: string
  }
}

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

export function pushToDataLayer(data: EcommerceEvent) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ ecommerce: null })
  window.dataLayer.push(data)
}

export function toAnalyticsItem(product: {
  slug?: string | number | null
  id?: string | number | null
  name?: string | null
  title?: string | null
  category?: { name?: string | null } | null
  productType?: { name?: string | null } | null
  store?: { name?: string | null } | null
  price?: number | string | null
}, quantity = 1): AnalyticsItem {
  return {
    item_id: String(product.slug || product.id || product.title || product.name || ''),
    item_name: product.name || product.title || 'محصول',
    item_category: product.category?.name || undefined,
    item_category2: product.productType?.name || undefined,
    item_brand: product.store?.name || 'گلینو',
    price: Number(product.price ?? 0) || 0,
    quantity,
  }
}

export function calculateCartValue(items: Array<{ price?: number | string | null; quantity?: number | null }>) {
  return items.reduce((sum, item) => sum + (Number(item.price ?? 0) || 0) * (item.quantity ?? 1), 0)
}


export type PurchaseItem = AnalyticsItem

export type PurchasePayload = {
  transaction_id: string
  currency: string
  value: number
  tax?: number
  shipping?: number
  coupon?: string
  items: PurchaseItem[]
}

export function readPurchaseSentKey(orderId: string) {
  return `purchase_sent:${orderId}`
}

export function hasPurchaseBeenSent(orderId: string) {
  if (typeof window === 'undefined') return false
  return window.sessionStorage.getItem(readPurchaseSentKey(orderId)) === '1'
}

export function markPurchaseAsSent(orderId: string) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(readPurchaseSentKey(orderId), '1')
}

export function formatPurchasePayload(order: {
  id: number | string
  totalAmount?: number | string | null
  subtotalAmount?: number | string | null
  deliveryFee?: number | string | null
  discountAmount?: number | string | null
  couponCode?: string | null
  storeName?: string | null
  orderItems: Array<{
    id: number
    quantity: number
    price: number | string
    productName?: string | null
    productSlug?: string | null
  }>
}): PurchasePayload {
  return {
    transaction_id: String(order.id),
    currency: 'IRR',
    value: Number(order.totalAmount ?? 0) || 0,
    tax: 0,
    shipping: Number(order.deliveryFee ?? 0) || 0,
    coupon: order.couponCode || undefined,
    items: (order.orderItems || []).map((item) => ({
      item_id: String(item.productSlug || item.id || item.productName || ''),
      item_name: item.productName || 'محصول',
      item_brand: order.storeName || 'گلینو',
      price: Number(item.price ?? 0) || 0,
      quantity: Number(item.quantity ?? 1) || 1,
    })),
  }
}

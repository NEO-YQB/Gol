import type { StorefrontCart } from './storefrontAuth'

export const STOREFRONT_CART_UPDATED_EVENT = 'storefront:cart-updated'

export function emitStorefrontCartUpdated(cart: StorefrontCart) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<StorefrontCart>(STOREFRONT_CART_UPDATED_EVENT, { detail: cart }))
}

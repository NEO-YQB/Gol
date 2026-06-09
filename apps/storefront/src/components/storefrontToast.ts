export const STOREFRONT_TOAST_EVENT = 'storefront:toast'

export type StorefrontToastDetail = {
  message: string
  variant?: 'error' | 'success'
  duration?: number
}

export function emitStorefrontToast(detail: StorefrontToastDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<StorefrontToastDetail>(STOREFRONT_TOAST_EVENT, { detail }))
}


export const STOREFRONT_AUTH_REQUIRED_EVENT = 'storefront:auth-required'

export function emitStorefrontAuthRequired() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(STOREFRONT_AUTH_REQUIRED_EVENT))
}

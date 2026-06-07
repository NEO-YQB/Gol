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

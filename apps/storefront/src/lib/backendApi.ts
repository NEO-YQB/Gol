/**
 * Resolves the backend API base URL for server-side Next.js route handlers
 * and server actions/components in the storefront application.
 */
export function getBackendApiUrl(
  request?: Request | { headers?: Headers | { get(name: string): string | null } },
): string {
  // 1. Explicit environment variable configured on server
  const envUrl = process.env.API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  if (envUrl) {
    return envUrl.replace(/\/+$/, '')
  }

  // 2. Production fallback default
  if (process.env.NODE_ENV === 'production') {
    return 'https://api.golino.shop/v1'
  }

  // 3. Request host header inspection (if request is provided)
  if (request && 'headers' in request && request.headers) {
    const host = typeof request.headers.get === 'function' ? request.headers.get('host') : ''
    if (host && (host.endsWith('golino.shop') || host.includes('golino.shop'))) {
      return 'https://api.golino.shop/v1'
    }
  }

  // 4. Local development default
  return 'http://localhost:3000/v1'
}

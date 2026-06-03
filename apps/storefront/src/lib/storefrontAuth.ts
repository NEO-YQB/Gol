'use client'

export const STOREFRONT_TOKEN_KEY = 'golino.storefront.token'

export type StorefrontUser = {
  id: number
  phoneNumber: string
  fullName?: string | null
  roles: string[]
  needsProfileCompletion?: boolean
}

export type SendOtpResponse = {
  message: string
  expiresAt: string
}

export type VerifyOtpResponse = {
  access_token: string
  user: StorefrontUser
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  'http://localhost:3000/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = 'درخواست با خطا مواجه شد'
    try {
      const payload = (await response.json()) as { message?: string | string[] }
      if (Array.isArray(payload.message)) message = payload.message[0] || message
      else if (payload.message) message = payload.message
    } catch {}
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export function readStoredToken() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(STOREFRONT_TOKEN_KEY) || ''
}

export function writeStoredToken(token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STOREFRONT_TOKEN_KEY, token)
}

export function clearStoredToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STOREFRONT_TOKEN_KEY)
}

export async function sendOtp(phoneNumber: string) {
  return request<SendOtpResponse>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  })
}

export async function verifyOtp(phoneNumber: string, code: string) {
  return request<VerifyOtpResponse>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, code }),
  })
}

export async function getCurrentUser(token: string) {
  return request<StorefrontUser>('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })
}

export async function completeProfile(token: string, fullName: string) {
  return request<StorefrontUser>('/auth/complete-profile', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fullName }),
  })
}

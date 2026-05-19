import type { SessionBootstrap } from './permissions'

export type SessionUser = {
  id: number
  phoneNumber: string
  fullName?: string | null
  roles: string[]
}

export type AuthSession = {
  accessToken: string
  user: SessionUser
  bootstrap?: SessionBootstrap
}

const SESSION_KEY = 'flower-marketplace.admin.session'

export function loadSession(): AuthSession | null {
  const raw = window.localStorage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    window.localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function saveSession(session: AuthSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY)
}

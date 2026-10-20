export function readPanelLocation() {
  if (typeof window === 'undefined') return ''
  const { hash, pathname, search } = window.location
  return hash.startsWith('#/')
    ? hash.slice(2).trim()
    : `${pathname.replace(/^\/+/, '')}${search}`
}

export function syncPanelLocation(path: string) {
  const { pathname, search, hash } = window.location
  if (`${pathname}${search}` === path && !hash) return

  if (hash.startsWith('#/') || pathname === '/') {
    window.history.replaceState(window.history.state, '', path)
  } else {
    window.history.pushState(null, '', path)
  }
}

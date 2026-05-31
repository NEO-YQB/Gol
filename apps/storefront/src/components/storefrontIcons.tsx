export function CartIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M3.5 4.5h1.6c.5 0 .94.33 1.08.82l.42 1.43m0 0 1.45 5.03c.14.49.58.82 1.09.82h7.92c.5 0 .94-.33 1.08-.82l1.34-4.55a1.13 1.13 0 0 0-1.08-1.45H6.6Zm3.3 11.75a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0Zm8.2 0a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  )
}

export function UserIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M12 12.25a4.13 4.13 0 1 0 0-8.25 4.13 4.13 0 0 0 0 8.25ZM5 19.25c1.57-2.76 4.14-4.13 7-4.13s5.43 1.37 7 4.13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  )
}

export function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d={open ? 'M6 6L18 18' : 'M4 7h16'} stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d={open ? 'M18 6L6 18' : 'M4 12h16'} stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      {!open ? <path d="M4 17h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /> : null}
    </svg>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { EnrichedStorefrontPage } from '../lib/storefront'
import { resolveAssetUrl } from '../lib/storefront'
import { CartIcon, MenuIcon, UserIcon } from './storefrontIcons'
import { storefrontStyles } from './storefrontStyles'
import { buildHeaderThemeVars, resolveHeaderTheme } from './storefrontTheme'

export function StorefrontHeader({ page, heroTouchesTop }: { page: EnrichedStorefrontPage; heroTouchesTop: boolean }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const theme = useMemo(() => resolveHeaderTheme(page), [page])

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 24)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!theme.enabled) return null

  const shouldFloat = isScrolled && theme.stickyVariant === 'floating'
  const shouldShowGlass = isScrolled || !theme.transparentOnTop || !heroTouchesTop
  const headerVars = buildHeaderThemeVars(theme, shouldShowGlass)

  return (
    <header className={`${storefrontStyles.headerRoot} ${shouldFloat ? 'px-4 pt-4 md:px-8' : 'px-0 pt-0'}`} style={headerVars}>
      <div
        className={`${storefrontStyles.headerShellBase} ${shouldFloat ? 'max-w-[1280px] rounded-[28px] px-5 py-3 md:px-7' : 'max-w-[1440px] px-4 py-5 md:px-8'} ${shouldShowGlass ? storefrontStyles.headerGlass : 'border-transparent bg-transparent shadow-none backdrop-blur-0'}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-8">
          <Link className={`shrink-0 ${storefrontStyles.headerText} transition-all duration-500 ${isScrolled ? 'text-sm md:text-base' : 'text-base md:text-lg'}`} href={theme.brandHref}>
            {theme.logoImageUrl ? (
              <img alt={theme.brandLabel} className="h-10 w-auto object-contain md:h-11" src={resolveAssetUrl(theme.logoImageUrl)} />
            ) : (
              <span className="font-black tracking-[0.14em]">{theme.brandLabel}</span>
            )}
          </Link>
          <nav className="hidden min-w-0 flex-wrap items-center gap-2 md:flex md:gap-3">
            {theme.menuItems.map((item) => (
              <Link
                className={`${storefrontStyles.headerNavItem} ${item.highlighted ? storefrontStyles.headerNavHighlight : storefrontStyles.headerNavDefault}`}
                href={item.href}
                key={`${item.label}-${item.href}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <button
            aria-label="باز کردن منو"
            className={`inline-flex items-center justify-center rounded-full border p-3 md:hidden ${storefrontStyles.headerSoftSurface} ${storefrontStyles.headerText}`}
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            type="button"
          >
            <MenuIcon open={isMobileMenuOpen} />
          </button>

          <Link className={storefrontStyles.headerAction} href="/cart">
            <CartIcon />
            <span className="hidden md:inline">سبد خرید</span>
          </Link>

          {theme.authPreviewMode === 'authenticated' ? (
            <div className="relative">
              <button
                className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 text-right text-sm font-bold shadow-[0_14px_30px_rgba(15,32,25,0.12)] transition-all duration-300 ${storefrontStyles.headerGlass} ${storefrontStyles.headerText}`}
                onClick={() => setIsUserMenuOpen((current) => !current)}
                type="button"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--header-action-bg)] text-[var(--header-action-text)]">
                  <UserIcon />
                </span>
                <span className="hidden leading-5 md:block">
                  <strong className={`block ${storefrontStyles.headerText}`}>سلام {theme.authPreviewName || 'دوست گلینو'}</strong>
                  <span className={`block text-xs font-medium ${storefrontStyles.headerMutedText}`}>حساب کاربری</span>
                </span>
              </button>
              {isUserMenuOpen ? (
                <div className={storefrontStyles.userMenuPanel}>
                  <div className="grid gap-2">
                    {[
                      { label: 'پنل کاربری', href: '/account' },
                      { label: 'اطلاعات کاربری', href: '/account/profile' },
                      { label: 'کیف پول', href: '/account/wallet' },
                      { label: 'خروج', href: '/logout' },
                    ].map((item) => (
                      <Link className={storefrontStyles.userMenuItem} href={item.href} key={item.href}>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link className={storefrontStyles.headerAction} href="/login">
                <UserIcon />
                <span className="hidden md:inline">ورود</span>
              </Link>
              <Link className={`hidden rounded-full border px-4 py-2 text-sm font-bold md:inline-flex ${storefrontStyles.headerSoftSurface} ${storefrontStyles.headerText}`} href="/register">
                ثبت نام
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className={`${storefrontStyles.mobileMenuPanel} ${isMobileMenuOpen ? 'max-h-[75vh] translate-y-0 opacity-100' : 'max-h-0 -translate-y-2 opacity-0'}`}>
        <div className="grid gap-2 p-4">
          {theme.menuItems.map((item) => (
            <Link
              className={`${storefrontStyles.headerNavItem} ${item.highlighted ? storefrontStyles.headerNavHighlight : storefrontStyles.headerNavDefault} rounded-2xl text-center`}
              href={item.href}
              key={`mobile-${item.label}-${item.href}`}
            >
              {item.label}
            </Link>
          ))}
          {theme.authPreviewMode === 'authenticated' ? (
            <>
              <div className={`rounded-2xl px-4 py-3 text-sm ${storefrontStyles.headerSoftSurface}`}>
                <strong className={`block ${storefrontStyles.headerText}`}>سلام {theme.authPreviewName || 'دوست گلینو'}</strong>
                <span className={`block text-xs ${storefrontStyles.headerMutedText}`}>حساب کاربری</span>
              </div>
              {[
                { label: 'پنل کاربری', href: '/account' },
                { label: 'اطلاعات کاربری', href: '/account/profile' },
                { label: 'کیف پول', href: '/account/wallet' },
                { label: 'خروج', href: '/logout' },
              ].map((item) => (
                <Link className={`rounded-2xl px-4 py-3 text-sm font-bold ${storefrontStyles.headerText} transition-colors hover:bg-white/30`} href={item.href} key={`mobile-user-${item.href}`}>
                  {item.label}
                </Link>
              ))}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link className={`${storefrontStyles.headerAction} justify-center`} href="/login">
                ورود
              </Link>
              <Link className={`inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-bold ${storefrontStyles.headerSoftSurface} ${storefrontStyles.headerText}`} href="/register">
                ثبت نام
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { CategorySummary, EnrichedStorefrontPage, ProductTypeSummary } from '../lib/storefront'
import { resolveAssetUrl } from '../lib/storefront'
import { clearStoredToken, completeProfile, getCurrentUser, readStoredToken, sendOtp, verifyOtp, writeStoredToken, type StorefrontUser } from '../lib/storefrontAuth'
import { CartIcon, MenuIcon, UserIcon } from './storefrontIcons'
import { storefrontStyles } from './storefrontStyles'
import { buildHeaderThemeVars, resolveHeaderTheme } from './storefrontTheme'

export function StorefrontHeader({ page, heroTouchesTop }: { page: EnrichedStorefrontPage; heroTouchesTop: boolean }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAuthMenuOpen, setIsAuthMenuOpen] = useState(false)
  const [authStep, setAuthStep] = useState<'phone' | 'code' | 'name'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sessionUser, setSessionUser] = useState<StorefrontUser | null>(null)
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [productTypes, setProductTypes] = useState<ProductTypeSummary[]>([])
  const [openDesktopMenu, setOpenDesktopMenu] = useState<'categories' | 'productTypes' | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const theme = useMemo(() => resolveHeaderTheme(page), [page])
  const needsInlineProfileCompletion = sessionUser?.needsProfileCompletion === true
  const currentPath = useMemo(() => {
    const query = searchParams?.toString()
    return query ? `${pathname}?${query}` : pathname
  }, [pathname, searchParams])
  const authMode = sessionUser && !needsInlineProfileCompletion ? 'authenticated' : theme.authPreviewMode
  const authName = sessionUser?.fullName?.trim() || theme.authPreviewName

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 24)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const token = readStoredToken()
    if (!token) return

    getCurrentUser(token)
      .then((user) => {
        setSessionUser(user)
        if (user.needsProfileCompletion) {
          setAuthStep('name')
          setIsAuthMenuOpen(true)
          setFullName(user.fullName || '')
        }
      })
      .catch(() => {
        clearStoredToken()
        setSessionUser(null)
      })
  }, [])

  useEffect(() => {
    fetch('/api/catalog/categories', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data)
        }
      })
      .catch(() => {})

    fetch('/api/catalog/product-types', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProductTypes(data)
        }
      })
      .catch(() => {})
  }, [])

  async function handleSendOtp() {
    try {
      setIsSubmitting(true)
      setAuthError('')
      const payload = await sendOtp(phoneNumber.trim())
      setAuthMessage(payload.message)
      setAuthStep('code')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'ارسال کد با خطا مواجه شد')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleVerifyOtp() {
    try {
      setIsSubmitting(true)
      setAuthError('')
      const payload = await verifyOtp(phoneNumber.trim(), otpCode.trim())
      writeStoredToken(payload.access_token)
      setSessionUser(payload.user)
      setAuthMessage('با موفقیت وارد شدید')
      if (payload.user.needsProfileCompletion) {
        setAuthStep('name')
        setIsAuthMenuOpen(true)
        setFullName(payload.user.fullName || '')
        return
      }
      setIsAuthMenuOpen(false)
      router.refresh()
      router.push(currentPath)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'تایید کد با خطا مواجه شد')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCompleteProfile() {
    const token = readStoredToken()
    if (!token) {
      setAuthError('نشست شما یافت نشد. دوباره وارد شوید.')
      return
    }

    try {
      setIsSubmitting(true)
      setAuthError('')
      const user = await completeProfile(token, fullName.trim())
      setSessionUser(user)
      setIsAuthMenuOpen(false)
      setAuthStep('phone')
      setOtpCode('')
      setAuthMessage(`خوش اومدی ${user.fullName || ''}`)
      router.refresh()
      router.push(currentPath)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'ثبت نام کامل نشد')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleLogout() {
    clearStoredToken()
    setSessionUser(null)
    setIsUserMenuOpen(false)
    setIsAuthMenuOpen(false)
    setAuthStep('phone')
    setPhoneNumber('')
    setOtpCode('')
    setFullName('')
    router.refresh()
    router.push(currentPath)
  }

  function toggleDesktopMenu(menu: 'categories' | 'productTypes') {
    setOpenDesktopMenu((current) => (current === menu ? null : menu))
  }

  if (!theme.enabled) return null

  function renderCategoryTree(items: CategorySummary[], depth = 0): React.ReactNode {
    return items.map((item) => (
      <div key={`category-${item.id}-${depth}`}>
        <Link className={storefrontStyles.headerDropdownItem} href={`/categories/${item.slug}`}>
          <span>{item.name}</span>
          {Array.isArray(item.children) && item.children.length ? <span className="text-xs opacity-70">‹</span> : null}
        </Link>
        {Array.isArray(item.children) && item.children.length ? (
          <div className={storefrontStyles.headerDropdownChildPanel}>{renderCategoryTree(item.children, depth + 1)}</div>
        ) : null}
      </div>
    ))
  }

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
            <div className={storefrontStyles.headerDropdownRoot}>
              <button
                className={`${storefrontStyles.headerDropdownTrigger} ${storefrontStyles.headerNavDefault}`}
                onClick={() => toggleDesktopMenu('categories')}
                type="button"
              >
                دسته‌بندی‌ها
              </button>
              {openDesktopMenu === 'categories' && categories.length ? (
                <div className={storefrontStyles.headerDropdownPanel}>{renderCategoryTree(categories)}</div>
              ) : null}
            </div>

            <div className={storefrontStyles.headerDropdownRoot}>
              <button
                className={`${storefrontStyles.headerDropdownTrigger} ${storefrontStyles.headerNavDefault}`}
                onClick={() => toggleDesktopMenu('productTypes')}
                type="button"
              >
                نوع محصولات
              </button>
              {openDesktopMenu === 'productTypes' && productTypes.length ? (
                <div className={storefrontStyles.headerDropdownPanel}>
                  <div className="grid gap-2">
                    {productTypes.map((item) => (
                      <Link className={storefrontStyles.headerDropdownItem} href={`/product-types/${item.slug}`} key={`product-type-${item.id}`}>
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

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

          {authMode === 'authenticated' ? (
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
                  <strong className={`block ${storefrontStyles.headerText}`}>سلام {authName || 'دوست گلینو'}</strong>
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
                    ].map((item) => (
                      <Link className={storefrontStyles.userMenuItem} href={item.href} key={item.href}>
                        {item.label}
                      </Link>
                    ))}
                    <button className={storefrontStyles.userMenuItem} onClick={handleLogout} type="button">
                      خروج
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="relative flex items-center gap-2">
              <button className={storefrontStyles.headerAction} onClick={() => setIsAuthMenuOpen((current) => !current)} type="button">
                <UserIcon />
                <span className="hidden md:inline">ورود و ثبت نام</span>
              </button>
              {isAuthMenuOpen ? (
                <div className={`${storefrontStyles.userMenuPanel} w-[min(92vw,360px)] p-4`}>
                  <div className="grid gap-3">
                    <div>
                      <strong className={`block text-sm ${storefrontStyles.headerText}`}>
                        {authStep === 'phone' ? 'ورود یا ثبت نام' : authStep === 'code' ? 'کد تایید' : 'چی صدا کنم تو را؟'}
                      </strong>
                      <p className={`mt-1 text-xs leading-6 ${storefrontStyles.headerMutedText}`}>
                        {authStep === 'phone'
                          ? 'شماره تماس خودت را وارد کن تا کد تایید برایت ارسال شود.'
                          : authStep === 'code'
                            ? `کد ارسال‌شده به ${phoneNumber} را وارد کن.`
                            : 'برای کامل شدن ثبت نام، اسم خودت را وارد کن.'}
                      </p>
                    </div>
                    {authStep === 'phone' ? (
                      <label className="grid gap-2 text-sm">
                        <span className={storefrontStyles.headerText}>شماره تماس</span>
                        <input
                          className="rounded-2xl border border-[var(--header-glass-border)] bg-white/50 px-4 py-3 text-right text-sm text-[#173126] outline-none placeholder:text-[#8d7b67]"
                          inputMode="tel"
                          onChange={(event) => setPhoneNumber(event.target.value)}
                          placeholder="مثلاً 09121234567"
                          value={phoneNumber}
                        />
                      </label>
                    ) : null}
                    {authStep === 'code' ? (
                      <label className="grid gap-2 text-sm">
                        <span className={storefrontStyles.headerText}>کد تایید</span>
                        <input
                          className="rounded-2xl border border-[var(--header-glass-border)] bg-white/50 px-4 py-3 text-center text-sm tracking-[0.4em] text-[#173126] outline-none placeholder:text-[#8d7b67]"
                          inputMode="numeric"
                          onChange={(event) => setOtpCode(event.target.value)}
                          placeholder="12345"
                          value={otpCode}
                        />
                      </label>
                    ) : null}
                    {authStep === 'name' ? (
                      <label className="grid gap-2 text-sm">
                        <span className={storefrontStyles.headerText}>نام زیبای شما</span>
                        <input
                          className="rounded-2xl border border-[var(--header-glass-border)] bg-white/50 px-4 py-3 text-right text-sm text-[#173126] outline-none placeholder:text-[#8d7b67]"
                          onChange={(event) => setFullName(event.target.value)}
                          placeholder="مثلا مریم"
                          value={fullName}
                        />
                      </label>
                    ) : null}
                    {authError ? <p className="text-xs font-bold text-[#b64b36]">{authError}</p> : null}
                    {authMessage ? <p className="text-xs font-bold text-[#1f6a52]">{authMessage}</p> : null}
                    <div className="flex gap-2">
                      {authStep === 'phone' ? (
                        <button className={`${storefrontStyles.headerAction} flex-1 justify-center`} disabled={isSubmitting || phoneNumber.trim().length < 10} onClick={handleSendOtp} type="button">
                          {isSubmitting ? 'در حال ارسال...' : 'دریافت کد'}
                        </button>
                      ) : null}
                      {authStep === 'code' ? (
                        <>
                          <button className={`${storefrontStyles.headerAction} flex-1 justify-center`} disabled={isSubmitting || otpCode.trim().length < 4} onClick={handleVerifyOtp} type="button">
                            {isSubmitting ? 'در حال بررسی...' : 'تایید و ورود'}
                          </button>
                          <button className={`rounded-full border px-4 py-2 text-sm font-bold ${storefrontStyles.headerSoftSurface} ${storefrontStyles.headerText}`} onClick={() => setAuthStep('phone')} type="button">
                            ویرایش شماره
                          </button>
                        </>
                      ) : null}
                      {authStep === 'name' ? (
                        <button className={`${storefrontStyles.headerAction} flex-1 justify-center`} disabled={isSubmitting || fullName.trim().length < 2} onClick={handleCompleteProfile} type="button">
                          {isSubmitting ? 'در حال ثبت...' : 'تکمیل ثبت نام'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className={`${storefrontStyles.mobileMenuPanel} ${isMobileMenuOpen ? 'max-h-[75vh] translate-y-0 opacity-100' : 'max-h-0 -translate-y-2 opacity-0'}`}>
        <div className="grid gap-2 p-4">
          {categories.length ? (
            <details className={`rounded-2xl px-4 py-3 ${storefrontStyles.headerSoftSurface}`}>
              <summary className={`cursor-pointer text-sm font-bold ${storefrontStyles.headerText}`}>دسته‌بندی‌ها</summary>
              <div className="mt-3 grid gap-2">{renderCategoryTree(categories)}</div>
            </details>
          ) : null}
          {productTypes.length ? (
            <details className={`rounded-2xl px-4 py-3 ${storefrontStyles.headerSoftSurface}`}>
              <summary className={`cursor-pointer text-sm font-bold ${storefrontStyles.headerText}`}>نوع محصولات</summary>
              <div className="mt-3 grid gap-2">
                {productTypes.map((item) => (
                  <Link className={`rounded-2xl px-4 py-3 text-sm font-bold ${storefrontStyles.headerText} transition-colors hover:bg-white/30`} href={`/product-types/${item.slug}`} key={`mobile-type-${item.id}`}>
                    {item.name}
                  </Link>
                ))}
              </div>
            </details>
          ) : null}
          {theme.menuItems.map((item) => (
            <Link
              className={`${storefrontStyles.headerNavItem} ${item.highlighted ? storefrontStyles.headerNavHighlight : storefrontStyles.headerNavDefault} rounded-2xl text-center`}
              href={item.href}
              key={`mobile-${item.label}-${item.href}`}
            >
              {item.label}
            </Link>
          ))}
          {authMode === 'authenticated' ? (
            <>
              <div className={`rounded-2xl px-4 py-3 text-sm ${storefrontStyles.headerSoftSurface}`}>
                <strong className={`block ${storefrontStyles.headerText}`}>سلام {authName || 'دوست گلینو'}</strong>
                <span className={`block text-xs ${storefrontStyles.headerMutedText}`}>حساب کاربری</span>
              </div>
              {[
                { label: 'پنل کاربری', href: '/account' },
                { label: 'اطلاعات کاربری', href: '/account/profile' },
                { label: 'کیف پول', href: '/account/wallet' },
              ].map((item) => (
                <Link className={`rounded-2xl px-4 py-3 text-sm font-bold ${storefrontStyles.headerText} transition-colors hover:bg-white/30`} href={item.href} key={`mobile-user-${item.href}`}>
                  {item.label}
                </Link>
              ))}
              <button className={`rounded-2xl px-4 py-3 text-right text-sm font-bold ${storefrontStyles.headerText} transition-colors hover:bg-white/30`} onClick={handleLogout} type="button">
                خروج
              </button>
            </>
          ) : (
            <div className="grid gap-2">
              <button className={`${storefrontStyles.headerAction} justify-center`} onClick={() => setIsAuthMenuOpen((current) => !current)} type="button">
                ورود و ثبت نام
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

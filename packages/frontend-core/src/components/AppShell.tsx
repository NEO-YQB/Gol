import type { ReactNode } from 'react'
import { cx } from '../cx'
import type { NavSection, ShellAccountMenu, ShellAction } from '../types'
import { Pill } from './Pill'

type AppShellProps = {
  tone?: 'admin' | 'vendor'
  productName: string
  productSubtitle: string
  workspaceLabel: string
  userName: string
  userRole: string
  pageEyebrow: string
  pageTitle: string
  pageDescription: string
  navSections: NavSection[]
  onNavigate?: (key: string) => void
  actions?: ShellAction[]
  accountMenu?: ShellAccountMenu
  children: ReactNode
}

export function AppShell({
  tone = 'admin',
  productName,
  productSubtitle,
  workspaceLabel,
  userName,
  userRole,
  pageEyebrow,
  pageTitle,
  pageDescription,
  navSections,
  onNavigate,
  actions = [],
  accountMenu,
  children,
}: AppShellProps) {
  const accountInitial = userName.trim().slice(0, 1) || 'گ'
  const accountStats = accountMenu?.quickStats ?? []
  const accountActions = accountMenu?.actions ?? []

  return (
    <div className={cx('fm-shell', `fm-shell--${tone}`)} dir="rtl">
      <aside className="fm-sidebar">
        <div className="fm-brand-card">
          <Pill tone="primary">{workspaceLabel}</Pill>
          <div>
            <p className="fm-brand-kicker">{productSubtitle}</p>
            <h1 className="fm-brand-title">{productName}</h1>
          </div>
        </div>

        <nav className="fm-nav" aria-label="Main navigation">
          {navSections.map((section) => (
            <section className="fm-nav-section" key={section.title}>
              <p className="fm-nav-title">{section.title}</p>
              <div className="fm-nav-items">
                {section.items.map((item) => (
                  <button
                    className={cx('fm-nav-item', item.active && 'is-active')}
                    key={`${section.title}-${item.label}`}
                    onClick={() => onNavigate?.(item.key)}
                    type="button"
                  >
                    <span>
                      <strong>{item.label}</strong>
                    </span>
                    {item.badge ? <Pill>{item.badge}</Pill> : null}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className="fm-sidebar-footer">
          <strong>{workspaceLabel}</strong>
        </div>
      </aside>

      <main className="fm-main">
        <header className="fm-topbar">
          <div>
            <p className="fm-page-eyebrow">{pageEyebrow}</p>
            <h2 className="fm-page-title">{pageTitle}</h2>
            {pageDescription ? <p className="fm-page-description">{pageDescription}</p> : null}
          </div>

          <div className="fm-topbar-meta">
            <div className="fm-topbar-actions">
              {actions.map((action) => (
                <button
                  className={cx('fm-button', `fm-button--${action.tone ?? 'ghost'}`)}
                  key={action.label}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
            <details className="fm-account-menu">
              <summary className="fm-user-card" aria-label="باز کردن منوی حساب کاربری">
                <span className="fm-user-avatar" aria-hidden="true">
                  {accountInitial}
                </span>
                <span className="fm-user-copy">
                  <strong>{userName}</strong>
                  <small>{accountMenu?.profileLabel ?? userRole}</small>
                </span>
                <span className="fm-user-chevron" aria-hidden="true">⌄</span>
              </summary>

              <div className="fm-account-panel">
                <div className="fm-account-hero">
                  <span className="fm-account-logo" aria-hidden="true">
                    {accountInitial}
                  </span>
                  <div>
                    <p>{accountMenu?.statusLabel ?? 'نشست فعال و امن'}</p>
                    <strong>{userName}</strong>
                    <small>{userRole}</small>
                  </div>
                </div>

                <div className="fm-account-details">
                  {accountMenu?.storeName ? (
                    <span>
                      <small>فضای کاری</small>
                      <strong>{accountMenu.storeName}</strong>
                    </span>
                  ) : null}
                  {accountMenu?.phoneNumber ? (
                    <span>
                      <small>شماره موبایل</small>
                      <strong dir="ltr">{accountMenu.phoneNumber}</strong>
                    </span>
                  ) : null}
                </div>

                {accountStats.length > 0 ? (
                  <div className="fm-account-stats">
                    {accountStats.map((stat) => (
                      <span key={stat.label}>
                        <small>{stat.label}</small>
                        <strong>{stat.value}</strong>
                      </span>
                    ))}
                  </div>
                ) : null}

                {accountActions.length > 0 ? (
                  <div className="fm-account-actions">
                    {accountActions.map((action) => (
                      <button
                        className={cx('fm-account-action', action.tone === 'danger' && 'fm-account-action--danger')}
                        key={action.label}
                        onClick={action.onClick}
                        type="button"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </details>
          </div>
        </header>

        <div className="fm-content">{children}</div>
      </main>
    </div>
  )
}

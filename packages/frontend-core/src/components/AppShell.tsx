import type { ReactNode } from 'react'
import { cx } from '../cx'
import type { NavSection, ShellAction } from '../types'
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
  children,
}: AppShellProps) {
  return (
    <div className={cx('fm-shell', `fm-shell--${tone}`)} dir="rtl">
      <aside className="fm-sidebar">
        <div className="fm-brand-card">
          <Pill tone="primary">{workspaceLabel}</Pill>
          <div>
            <p className="fm-brand-kicker">{productSubtitle}</p>
            <h1 className="fm-brand-title">{productName}</h1>
          </div>
          <button className="fm-command-trigger" type="button">
            جستجوی سریع، میانبرها و رفتن به بخش‌ها
          </button>
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
                      {item.hint ? <small>{item.hint}</small> : null}
                    </span>
                    {item.badge ? <Pill>{item.badge}</Pill> : null}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className="fm-sidebar-footer">
          <p>Backend-ready architecture</p>
          <strong>FE-1 foundation active</strong>
        </div>
      </aside>

      <main className="fm-main">
        <header className="fm-topbar">
          <div>
            <p className="fm-page-eyebrow">{pageEyebrow}</p>
            <h2 className="fm-page-title">{pageTitle}</h2>
            <p className="fm-page-description">{pageDescription}</p>
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
            <div className="fm-user-card">
              <span className="fm-user-avatar" aria-hidden="true">
                {userName.slice(0, 1)}
              </span>
              <div>
                <strong>{userName}</strong>
                <small>{userRole}</small>
              </div>
            </div>
          </div>
        </header>

        <div className="fm-content">{children}</div>
      </main>
    </div>
  )
}

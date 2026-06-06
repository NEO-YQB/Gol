import type { CSSProperties } from 'react'
import type { EnrichedStorefrontPage } from '../lib/storefront'

export type StorefrontHeaderMenuItem = {
  label: string
  href: string
  highlighted: boolean
  textColor: string
  backgroundColor: string
}

export type StorefrontHeaderTheme = {
  enabled: boolean
  transparentOnTop: boolean
  stickyVariant: 'full' | 'floating'
  brandLabel: string
  brandHref: string
  logoImageUrl: string
  textColor: string
  mutedTextColor: string
  glassBackgroundColor: string
  glassBorderColor: string
  actionBackgroundColor: string
  actionTextColor: string
  dropdownTriggerTextColor: string
  dropdownTriggerBackgroundColor: string
  dropdownPanelBackgroundColor: string
  dropdownPanelTextColor: string
  dropdownPanelBorderColor: string
  dropdownPanelHoverBackgroundColor: string
  authPreviewMode: 'guest' | 'authenticated'
  authPreviewName: string
  menuItems: StorefrontHeaderMenuItem[]
}

export function resolveHeaderTheme(page: EnrichedStorefrontPage): StorefrontHeaderTheme {
  const headerConfig =
    typeof page.headerConfig === 'object' && page.headerConfig !== null
      ? (page.headerConfig as Record<string, unknown>)
      : {}

  const menuItems = Array.isArray(headerConfig.menuItems)
    ? headerConfig.menuItems
        .map((item) =>
          typeof item === 'object' && item !== null
            ? {
                label: String((item as Record<string, unknown>).label ?? '').trim(),
                href: String((item as Record<string, unknown>).href ?? '').trim(),
                highlighted: (item as Record<string, unknown>).highlighted === true,
                textColor: String((item as Record<string, unknown>).textColor ?? '').trim(),
                backgroundColor: String((item as Record<string, unknown>).backgroundColor ?? '').trim(),
              }
            : null,
        )
        .filter((item): item is StorefrontHeaderMenuItem => Boolean(item && item.label && item.href))
    : []

  return {
    enabled: headerConfig.enabled !== false,
    transparentOnTop: headerConfig.transparentOnTop !== false,
    stickyVariant: String(headerConfig.stickyVariant ?? 'floating') === 'full' ? 'full' : 'floating',
    brandLabel: String(headerConfig.brandLabel ?? 'گلینو'),
    brandHref: String(headerConfig.brandHref ?? '/'),
    logoImageUrl: String(headerConfig.logoImageUrl ?? '').trim(),
    textColor: String(headerConfig.textColor ?? '#173126'),
    mutedTextColor: String(headerConfig.mutedTextColor ?? '#6e6152'),
    glassBackgroundColor: String(headerConfig.glassBackgroundColor ?? 'rgba(255,251,245,0.42)'),
    glassBorderColor: String(headerConfig.glassBorderColor ?? 'rgba(255,255,255,0.2)'),
    actionBackgroundColor: String(headerConfig.actionBackgroundColor ?? '#1f6a52'),
    actionTextColor: String(headerConfig.actionTextColor ?? '#ffffff'),
    dropdownTriggerTextColor: String(headerConfig.dropdownTriggerTextColor ?? '#173126'),
    dropdownTriggerBackgroundColor: String(headerConfig.dropdownTriggerBackgroundColor ?? 'rgba(255,255,255,0.35)'),
    dropdownPanelBackgroundColor: String(headerConfig.dropdownPanelBackgroundColor ?? 'rgba(255,251,245,0.96)'),
    dropdownPanelTextColor: String(headerConfig.dropdownPanelTextColor ?? '#173126'),
    dropdownPanelBorderColor: String(headerConfig.dropdownPanelBorderColor ?? 'rgba(255,255,255,0.2)'),
    dropdownPanelHoverBackgroundColor: String(headerConfig.dropdownPanelHoverBackgroundColor ?? 'rgba(255,255,255,0.52)'),
    authPreviewMode:
      String(headerConfig.authPreviewMode ?? 'guest') === 'authenticated' ? 'authenticated' : 'guest',
    authPreviewName: String(headerConfig.authPreviewName ?? '').trim(),
    menuItems,
  }
}

export function buildHeaderThemeVars(
  theme: StorefrontHeaderTheme,
  shouldShowGlass: boolean,
): CSSProperties {
  return {
    '--header-text': shouldShowGlass ? theme.textColor : '#ffffff',
    '--header-muted-text': shouldShowGlass ? theme.mutedTextColor : 'rgba(255,255,255,0.82)',
    '--header-glass-bg': theme.glassBackgroundColor,
    '--header-glass-border': theme.glassBorderColor,
    '--header-action-bg': theme.actionBackgroundColor,
    '--header-action-text': theme.actionTextColor,
    '--header-soft-bg': shouldShowGlass ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.12)',
    '--header-nav-bg': shouldShowGlass ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)',
    '--header-dropdown-trigger-text': theme.dropdownTriggerTextColor,
    '--header-dropdown-trigger-bg': theme.dropdownTriggerBackgroundColor,
    '--header-dropdown-panel-bg': theme.dropdownPanelBackgroundColor,
    '--header-dropdown-panel-text': theme.dropdownPanelTextColor,
    '--header-dropdown-panel-border': theme.dropdownPanelBorderColor,
    '--header-dropdown-panel-hover-bg': theme.dropdownPanelHoverBackgroundColor,
  } as CSSProperties
}

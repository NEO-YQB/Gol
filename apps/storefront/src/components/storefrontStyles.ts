export const storefrontStyles = {
  productCard:
    'group min-w-[240px] rounded-[28px] border border-black/5 bg-white/85 p-4 shadow-[0_20px_50px_rgba(37,24,8,0.08)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(37,24,8,0.12)]',
  productImageWrap: 'mb-4 block overflow-hidden rounded-[24px] bg-[#f4eadc]',
  productImage: 'h-56 w-full object-cover transition duration-500 group-hover:scale-[1.04]',
  categoryCircle:
    'group flex min-w-[120px] flex-col items-center gap-4 text-center',
  categoryCircleMedia:
    'relative h-28 w-28 overflow-hidden rounded-full border border-white/70 bg-[#f6eadc] shadow-[0_18px_36px_rgba(52,36,17,0.08)]',
  vendorCard:
    'rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(250,244,234,0.95))] p-5 shadow-[0_20px_40px_rgba(48,33,10,0.08)]',
  headerRoot:
    'pointer-events-none fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-out',
  headerShellBase:
    'pointer-events-auto mx-auto flex items-center justify-between gap-4 transition-all duration-500 ease-out border-[var(--header-glass-border)]',
  headerGlass:
    'bg-[var(--header-glass-bg)] shadow-[0_20px_55px_rgba(24,31,28,0.12)] backdrop-blur-2xl',
  headerText: 'text-[var(--header-text)]',
  headerMutedText: 'text-[var(--header-muted-text)]',
  headerSoftSurface: 'border-[var(--header-glass-border)] bg-[var(--header-soft-bg)]',
  headerNavItem: 'rounded-full px-4 py-2 text-sm font-bold transition-all duration-300 hover:translate-y-[-1px]',
  headerNavDefault: 'bg-[var(--header-nav-bg)] text-[var(--header-text)]',
  headerNavHighlight: 'bg-[var(--header-action-bg)] text-[var(--header-action-text)]',
  headerAction:
    'inline-flex items-center gap-2 rounded-full bg-[var(--header-action-bg)] px-4 py-2 text-sm font-bold text-[var(--header-action-text)] shadow-[0_14px_30px_rgba(15,32,25,0.14)] transition-all duration-300 hover:translate-y-[-1px]',
  userMenuPanel:
    'absolute left-0 top-[calc(100%+8px)] min-w-[220px] rounded-[24px] border border-[var(--header-glass-border)] bg-[var(--header-glass-bg)] p-3 text-[var(--header-text)] shadow-[0_20px_45px_rgba(20,29,25,0.16)] backdrop-blur-2xl',
  userMenuItem:
    'rounded-2xl border border-[var(--header-glass-border)] bg-[var(--header-glass-bg)] px-4 py-3 text-sm font-bold text-[var(--header-text)] transition-colors hover:bg-white/20',
  mobileMenuPanel:
    'pointer-events-auto mx-4 mt-3 overflow-hidden rounded-[28px] border border-[var(--header-glass-border)] bg-[var(--header-glass-bg)] text-[var(--header-text)] shadow-[0_20px_45px_rgba(20,29,25,0.16)] backdrop-blur-2xl transition-all duration-300 ease-out md:hidden',
}

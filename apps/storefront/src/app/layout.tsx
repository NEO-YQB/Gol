import type { Metadata } from 'next'
import Script from 'next/script'
import { getStorefrontSeoSettings } from '../lib/storefront'
import "./globals.css";
import "./info-pages.css";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getStorefrontSeoSettings()
  const siteUrl = seo?.siteUrl || 'https://golino.shop'
  return {
    metadataBase: new URL(siteUrl),
    title: seo?.siteName ? `${seo.siteName} | بازار گل و هدیه` : 'گلینو | بازار گل و هدیه',
    description: 'خرید آنلاین گل، باکس هدیه و سفارش از فروشگاه‌های منتخب گلینو',
    verification: seo?.googleSearchConsoleVerification ? { google: seo.googleSearchConsoleVerification } : undefined,
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const seo = await getStorefrontSeoSettings()
  const gtmId = seo?.googleTagManagerId?.trim()
  const gaId = seo?.googleAnalyticsId?.trim()

  return (
    <html lang="fa" dir="rtl">
      <body className="font-yekan">
        {gtmId ? (
          <>
            <Script id="gtm" strategy="beforeInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}</Script>
            <noscript>
              <iframe src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`} height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} />
            </noscript>
          </>
        ) : null}
        {gaId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">{`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');`}</Script>
          </>
        ) : null}
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from 'next'
import Script from 'next/script'
import { getStorefrontSeoSettings, getFaviconSettings } from '../lib/storefront'
import "./globals.css";
import "./info-pages.css";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getStorefrontSeoSettings()
  const favicons = await getFaviconSettings()
  const siteUrl = seo?.siteUrl || 'https://golino.shop'

  const iconList: Array<{ url: string; type?: string }> = []
  if (favicons?.storefront?.faviconIco) {
    iconList.push({ url: favicons.storefront.faviconIco, type: 'image/x-icon' })
  }
  if (favicons?.storefront?.faviconPng) {
    iconList.push({ url: favicons.storefront.faviconPng, type: 'image/png' })
  }

  return {
    metadataBase: new URL(siteUrl),
    title: seo?.siteName ? `${seo.siteName} | بازار گل و هدیه` : 'گلینو | بازار گل و هدیه',
    description: 'خرید آنلاین گل، باکس هدیه و سفارش از فروشگاه‌های منتخب گلینو',
    verification: seo?.googleSearchConsoleVerification ? { google: seo.googleSearchConsoleVerification } : undefined,
    icons: iconList.length > 0 ? { icon: iconList } : undefined,
    other: {
      enamad: '58646212',
    },
  }
}

const consoleBannerScript = `
(function () {
  try {
    var art = "\\n" +
"┌──────────────────────────────────────────────┐\\n" +
"│                                              │\\n" +
"│   ____   ___  _     ___ _   _  ___           │\\n" +
"│  / ___| / _ \\\\| |   |_ _| \\\\ | |/ _ \\\\          │\\n" +
"│ | |  _ | | | | |    | ||  \\\\| | | | |         │\\n" +
"│ | |_| || |_| | |___ | || |\\\\  | |_| |         │\\n" +
"│  \\\\____| \\\\___/|_____|___|_| \\\\_|\\\\___/          │\\n" +
"│                                              │\\n" +
"└──────────────────────────────────────────────┘";
    var brand = 'color:#f4f1b0;background:#173126;font-family:ui-monospace,Menlo,Consolas,"Courier New",monospace;font-size:12px;font-weight:700;line-height:1.25;direction:ltr;text-align:left;white-space:pre;display:inline-block;padding:12px 18px;border-radius:8px;unicode-bidi:isolate;';
    var title = 'color:#173126;font-size:13px;font-weight:700;padding:6px 0;font-family:Tahoma,system-ui,sans-serif;direction:rtl;';
    var warn = 'color:#92400e;background:#fef3c7;font-size:12px;font-weight:700;padding:6px 12px;border-radius:6px;border-right:4px solid #f59e0b;font-family:Tahoma,system-ui,sans-serif;direction:rtl;';
    console.log('%c' + art, brand);
    console.log('%cطراحی شده با ❤️ توسط نوین سایت برای عاشقان گل', title);
    console.log('%c⚠️ هشدار امنیتی: هرگز کدی را که متوجه عملکرد آن نمی‌شوید در این قسمت Paste نکنید — این کار می‌تواند حساب کاربری شما را در اختیار مهاجمان قرار دهد.', warn);
  } catch (e) {}
})();
`;

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
      <head>
        <script
          id="console-banner"
          dangerouslySetInnerHTML={{ __html: consoleBannerScript }}
        />
      </head>
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

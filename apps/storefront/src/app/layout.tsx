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
"┌────────────────────────────────────────────────────────────────────────────┐\\n" +
"│                                                                            │\\n" +
"│   .g8\\"\\"\\"bgd    .g8\\"\\"8q.   \\\`7MMF'      \\\`7MMF' \\\`7MN.   \\\`7MF'    .g8\\"\\"8q.    │\\n" +
"│ .dP'     \\\`M   .dP'    \\\`YM.   MM          MM     MMN.    M    .dP'    \\\`YM.  │\\n" +
"│ dM'       \\\`   dM'      \\\`MM   MM          MM     M YMb.  M    dM'      \\\`MM  │\\n" +
"│ MM            MM        MM   MM          MM     M  \\\`MN. M    MM        MM  │\\n" +
"│ MM.    \\\`7MMF' MM.      ,MP   MM      ,   MM     M   \\\`MM.M    MM.      ,MP  │\\n" +
"│ \\\`Mb.     MM   \\\`Mb.    ,dP'   MM     ,M   MM     M     YMM    \\\`Mb.    ,dP'  │\\n" +
"│   \\\`\\"bmmmdPY     \\\`\\"bmmd\"'   .JMMmmmmMMM .JMML. .JML.    YM      \\\`\\"bmmd\"'    │\\n" +
"│                                                                            │\\n" +
"└────────────────────────────────────────────────────────────────────────────┘";
    var brand = 'color:#f4f1b0;background:#173126;font-family:monospace;font-size:11px;font-weight:400;line-height:1.15;direction:ltr;text-align:left;white-space:pre;display:inline-block;padding:12px 16px;border-radius:8px;';
    var title = 'color:#ef394e;font-size:13px;font-weight:700;padding:6px 0;font-family:Tahoma,system-ui,sans-serif;direction:rtl;';
    var warn = 'color:#e6a817;font-size:12px;font-weight:700;padding:4px 0;font-family:Tahoma,system-ui,sans-serif;direction:rtl;';
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

export interface VendorAppOption {
  id: 'bazaar' | 'google-play' | 'ios' | 'direct-apk'
  title: string
  titleEn: string
  badge: string
  badgeColor: string
  description: string
  buttonText: string
  href: string
  isExternal: boolean
  isDirectDownload?: boolean
  versionTag: string
  accentColor: string
  gradientGlow: string
}

export const VENDOR_APP_CONFIG = {
  // لینک‌های اصلی - در صورت تغییر می‌توانید این بخش را ویرایش کنید
  links: {
    iosWebApp: 'https://ios.golino.shop',
    bazaar: 'https://cafebazaar.ir/app/com.golino.vendorapp',
    googlePlay: 'https://play.google.com/store/apps/details?id=com.golino.vendorapp',
    directApk: '/downloads/golino-vendor.apk',
  },
  support: {
    phone: '+982133104678',
    phoneDisplay: '۰۲۱-۳۳۱۰۴۶۷۸',
    phoneInternational: '+98 21 3310 4678',
    title: 'پشتیبانی تلفنی فروشندگان',
    subtitle: 'راهنمایی در دانلود، نصب و ورود به اپلیکیشن',
  },
  meta: {
    title: 'اپلیکیشن اختصاصی فروشندگان گلینو',
    subtitle: 'مدیریت هوشمند و لحظه‌ای سفارش‌ها، محصولات، قیمت‌ها و تسویه‌حساب',
    version: 'نسخه ۲.۴.۰',
    targetPlatform: 'اندروید و iOS',
  },
}

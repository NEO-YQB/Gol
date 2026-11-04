import type { Metadata } from 'next'
import { VendorAppsView } from './VendorAppsView'

export const metadata: Metadata = {
  title: 'دانلود اپلیکیشن فروشندگان گلینو | نسخه اندروید و iOS',
  description:
    'دانلود و دسترسی سریع به اپلیکیشن اختصاصی فروشندگان گلینو در کافه بازار، گوگل پلی، وب‌اپلیکیشن iOS و لینک دانلود مستقیم.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    },
  },
}

export default function VendorAppsPage() {
  return <VendorAppsView />
}

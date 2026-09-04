import { Pill } from '@flower-marketplace/frontend-core'

type PrivacyPolicyLocale = 'fa' | 'en'

type PrivacyPolicyPageProps = {
  locale: PrivacyPolicyLocale
}

type PolicySection = {
  title: string
  body: string[]
}

const faSections: PolicySection[] = [
  {
    title: 'مقدمه',
    body: [
      'سیاست حفظ حریم خصوصی توضیح می‌دهد که چگونه اطلاعات شخصی شما را در برنامه فروشنده Golino جمع‌آوری، استفاده و محافظت می‌کنیم. با استفاده از این برنامه، شما با شرایط این سیاست موافقت می‌کنید.',
    ],
  },
  {
    title: 'جمع‌آوری اطلاعات',
    body: [
      'ما اطلاعات زیر را از شما جمع‌آوری می‌کنیم:',
      '• شماره موبایل برای احراز هویت و ورود',
      '• نام فروشگاه و اطلاعات تماس',
      '• آدرس فروشگاه برای ارسال سفارشات',
      '• تصاویر محصولات برای نمایش در فروشگاه',
      '• تصاویر احراز هویت (کارت ملی) و جواز فعالیت',
      '• اطلاعات سفارشات و تراکنش‌های مالی',
      '• اطلاعات دستگاه (مدل، سیستم‌عامل، آدرس IP)',
    ],
  },
  {
    title: 'استفاده از اطلاعات',
    body: [
      'اطلاعات جمع‌آوری شده صرفاً برای اهداف زیر استفاده می‌شوند:',
      '• مدیریت حساب کاربری و فروشگاه شما',
      '• پردازش و مدیریت سفارشات',
      '• بهبود تجربه کاربری و خدمات',
      '• ارسال اعلان‌های مهم مربوط به سفارشات',
      '• ارتباط با شما در مورد به‌روزرسانی‌ها و تغییرات',
      '• جلوگیری از تقلب و سوءاستفاده',
    ],
  },
  {
    title: 'اشتراک‌گذاری اطلاعات',
    body: [
      'ما اطلاعات شخصی شما را با اشخاص ثالث به اشتراک نمی‌گذاریم، مگر در موارد زیر:',
      '• با رضایت صریح شما',
      '• برای ارائه خدمات ارسال (مانند پیک یا پست)',
      '• در صورت الزام قانونی',
      '• برای محافظت از حقوق و امنیت ما و کاربران',
    ],
  },
  {
    title: 'امنیت اطلاعات',
    body: [
      'ما از تدابیر امنیتی مناسب برای محافظت از اطلاعات شما استفاده می‌کنیم:',
      '• رمزنگاری اطلاعات حساس در حالت انتقال و ذخیره',
      '• دسترسی محدود به اطلاعات شخصی',
      '• نظارت مداوم بر فعالیت‌های مشکوک',
      '• به‌روزرسانی منظم تدابیر امنیتی',
    ],
  },
  {
    title: 'حقوق شما',
    body: [
      'شما حق دارید:',
      '• به اطلاعات شخصی خود دسترسی داشته باشید',
      '• اطلاعات نادرست را اصلاح کنید',
      '• درخواست حذف اطلاعات خود را بدهید',
      '• از دریافت اعلان‌های تبلیغاتی انصراف دهید',
      '• در مورد نحوه پردازش اطلاعات خود سؤال کنید',
    ],
  },
  {
    title: 'کوکی‌ها و فناوری‌های ردیابی',
    body: [
      'ما ممکن است از کوکی‌ها و فناوری‌های مشابه برای بهبود تجربه کاربری استفاده کنیم. این فناوری‌ها به ما کمک می‌کنند تا:',
      '• تنظیمات شما را ذخیره کنیم',
      '• عملکرد برنامه را بهبود دهیم',
      '• ترافیک و الگوهای استفاده را تحلیل کنیم',
    ],
  },
  {
    title: 'تغییرات در این سیاست',
    body: [
      'ما ممکن است این سیاست را به‌روز کنیم. تغییرات مهم از طریق برنامه یا ایمیل به شما اطلاع‌رسانی می‌شود. توصیه می‌شود دوره‌ای این سیاست را مرور کنید.',
    ],
  },
]

const enSections: PolicySection[] = [
  {
    title: 'Introduction',
    body: [
      'This Privacy Policy explains how we collect, use, and protect your personal information in the Golino Vendor app. By using this app, you agree to the terms of this policy.',
    ],
  },
  {
    title: 'Information Collection',
    body: [
      'We collect the following information from you:',
      '• Mobile number for authentication and sign-in',
      '• Store name and contact information',
      '• Store address for order delivery',
      '• Product images for display in the storefront',
      '• Identity verification images (national ID card) and business license',
      '• Order information and financial transaction data',
      '• Device information (model, operating system, IP address)',
    ],
  },
  {
    title: 'Use of Information',
    body: [
      'The collected information is used only for the following purposes:',
      '• Managing your account and store',
      '• Processing and managing orders',
      '• Improving user experience and services',
      '• Sending important order-related notifications',
      '• Contacting you about updates and changes',
      '• Preventing fraud and misuse',
    ],
  },
  {
    title: 'Information Sharing',
    body: [
      'We do not share your personal information with third parties, except in the following cases:',
      '• With your explicit consent',
      '• To provide delivery services (such as courier or post)',
      '• When required by law',
      '• To protect our rights and the security of our users',
    ],
  },
  {
    title: 'Information Security',
    body: [
      'We use appropriate security measures to protect your information:',
      '• Encryption of sensitive information in transit and at rest',
      '• Restricted access to personal information',
      '• Continuous monitoring of suspicious activities',
      '• Regular updates to security measures',
    ],
  },
  {
    title: 'Your Rights',
    body: [
      'You have the right to:',
      '• Access your personal information',
      '• Correct inaccurate information',
      '• Request deletion of your information',
      '• Opt out of promotional notifications',
      '• Ask questions about how your information is processed',
    ],
  },
  {
    title: 'Cookies and Tracking Technologies',
    body: [
      'We may use cookies and similar technologies to improve the user experience. These technologies help us:',
      '• Save your settings',
      '• Improve app performance',
      '• Analyze traffic and usage patterns',
    ],
  },
  {
    title: 'Changes to This Policy',
    body: [
      'We may update this policy. Important changes will be communicated through the app or by email. We recommend reviewing this policy periodically.',
    ],
  },
]

const content = {
  fa: {
    lang: 'fa',
    dir: 'rtl' as const,
    badge: 'Vendor Panel',
    title: 'سیاست حفظ حریم خصوصی',
    subtitle: 'نسخه قابل انتشار برای فروشندگان گلینو',
    brand: 'فروشندگان گلینو',
    contactTitle: 'تماس با ما',
    contactLead: 'اگر سؤال یا نگرانی در مورد این سیاست دارید، لطفاً با ما تماس بگیرید:',
    emailLabel: 'ایمیل',
    phoneLabel: 'تلفن',
    email: 'support@golino.ir',
    phone: '۰۲۱-۳۳۱۰۴۶۷۸',
    phoneHref: 'tel:+982133104678',
    updatedAt: 'آخرین به‌روزرسانی: ژوئیه ۲۰۲۶',
    switchLabel: 'English version',
    switchHref: '/en/privacy',
    sections: faSections,
  },
  en: {
    lang: 'en',
    dir: 'ltr' as const,
    badge: 'Vendor Panel',
    title: 'Privacy Policy',
    subtitle: 'Release-ready policy page for Golino vendors',
    brand: 'Golino Vendors',
    contactTitle: 'Contact Us',
    contactLead: 'If you have any questions or concerns about this policy, please contact us:',
    emailLabel: 'Email',
    phoneLabel: 'Phone',
    email: 'support@golino.ir',
    phone: '021-33104678',
    phoneHref: 'tel:+982133104678',
    updatedAt: 'Last updated: July 2026',
    switchLabel: 'نسخه فارسی',
    switchHref: '/fa/privacy',
    sections: enSections,
  },
} satisfies Record<
  PrivacyPolicyLocale,
  {
    lang: string
    dir: 'rtl' | 'ltr'
    badge: string
    title: string
    subtitle: string
    brand: string
    contactTitle: string
    contactLead: string
    emailLabel: string
    phoneLabel: string
    email: string
    phone: string
    phoneHref: string
    updatedAt: string
    switchLabel: string
    switchHref: string
    sections: PolicySection[]
  }
>

export function PrivacyPolicyPage({ locale }: PrivacyPolicyPageProps) {
  const policy = content[locale]

  return (
    <div className="vendor-public-screen" dir={policy.dir} lang={policy.lang}>
      <div aria-hidden="true" className="vendor-auth-backdrop">
        <span className="vendor-auth-orb vendor-auth-orb--primary" />
        <span className="vendor-auth-orb vendor-auth-orb--secondary" />
      </div>

      <main className="vendor-public-shell">
        <section className="vendor-public-card">
          <div className="vendor-public-topbar">
            <Pill tone="warning">{policy.badge}</Pill>
            <a className="vendor-public-switch" href={policy.switchHref} hrefLang={locale === 'fa' ? 'en' : 'fa'}>
              {policy.switchLabel}
            </a>
          </div>

          <header className="vendor-public-header">
            <h1>{policy.title}</h1>
            <p>{policy.subtitle}</p>
            <strong>{policy.brand}</strong>
          </header>

          <div className="vendor-policy-sections">
            {policy.sections.map((section) => (
              <section className="vendor-policy-section" key={section.title}>
                <h2>{section.title}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}

            <section className="vendor-policy-section">
              <h2>{policy.contactTitle}</h2>
              <p>{policy.contactLead}</p>
              <p>
                {policy.emailLabel}: <a href={`mailto:${policy.email}`}>{policy.email}</a>
              </p>
              <p>
                {policy.phoneLabel}: <a href={policy.phoneHref}>{policy.phone}</a>
              </p>
            </section>
          </div>

          <footer className="vendor-public-footer">
            <p>{policy.updatedAt}</p>
          </footer>
        </section>
      </main>
    </div>
  )
}

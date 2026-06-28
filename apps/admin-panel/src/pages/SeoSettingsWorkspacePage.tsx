import { SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useMemo, useState } from 'react'
import { adminApi, type SeoSettingsResponse } from '../lib/api'
import type { AuthSession } from '../lib/session'

type Props = {
  session: AuthSession
  onBack: () => void
}

const DEFAULT_FORM: SeoSettingsResponse = {
  siteUrl: 'https://golino.shop',
  siteName: 'گلینو',
  googleSearchConsoleVerification: '',
  googleTagManagerId: '',
  googleAnalyticsId: '',
  robotsTxt: 'User-agent: *\nAllow: /\nSitemap: https://golino.shop/sitemap.xml',
  sitemapEnabled: true,
  sitemapChangeFrequency: 'weekly',
  sitemapPriority: '0.7',
}

function FieldCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <SectionCard eyebrow="setting" title={title} description={description}>
      <div className="grid gap-4">{children}</div>
    </SectionCard>
  )
}

export function SeoSettingsWorkspacePage({ session, onBack }: Props) {
  const [form, setForm] = useState<SeoSettingsResponse>(DEFAULT_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.getSeoSettings(session)
      .then((payload) => setForm({ ...DEFAULT_FORM, ...payload }))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'دریافت تنظیمات سئو ناموفق بود'))
      .finally(() => setLoading(false))
  }, [session])

  const previewSiteUrl = useMemo(() => form.siteUrl.trim() || DEFAULT_FORM.siteUrl, [form.siteUrl])

  async function handleSave() {
    try {
      setSaving(true)
      setError('')
      setMessage('')
      const payload = await adminApi.updateSeoSettings(session, form)
      setForm({ ...DEFAULT_FORM, ...payload })
      setMessage('تنظیمات سئو ذخیره شد')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ذخیره تنظیمات سئو ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard
        eyebrow="seo workspace"
        title="تنظیمات سئو"
        description="همه تنظیمات SEO، تگ‌ها و crawler directiveها در یک workspace مرتب مدیریت می‌شوند."
        actions={<button className="fm-button fm-button--secondary" onClick={onBack} type="button">بازگشت</button>}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e6dac9] bg-white/70 px-4 py-3">
            <p className="text-xs text-[#8b7358]">Site URL</p>
            <p className="mt-1 break-all text-sm font-bold text-[#173126]">{previewSiteUrl}</p>
          </div>
          <div className="rounded-2xl border border-[#e6dac9] bg-white/70 px-4 py-3">
            <p className="text-xs text-[#8b7358]">Sitemap</p>
            <p className="mt-1 text-sm font-bold text-[#173126]">{form.sitemapEnabled ? 'فعال' : 'غیرفعال'}</p>
          </div>
          <div className="rounded-2xl border border-[#e6dac9] bg-white/70 px-4 py-3">
            <p className="text-xs text-[#8b7358]">Verification</p>
            <p className="mt-1 text-sm font-bold text-[#173126]">{form.googleSearchConsoleVerification ? 'ثبت شده' : 'خالی'}</p>
          </div>
        </div>
        <p className="text-sm text-[#6d5b46]">این مقادیر مبنای canonical، og:url، robots.txt و sitemap.xml storefront هستند.</p>
      </SectionCard>

      <FieldCard title="هویت سایت" description="دامنه و نام سایت را برای لینک‌های مطلق و metadata تنظیم کن.">
        <div className="fm-grid">
          <label className="fm-field"><span>Site URL</span><input value={form.siteUrl} onChange={(e) => setForm((c) => ({ ...c, siteUrl: e.target.value }))} /></label>
          <label className="fm-field"><span>Site Name</span><input value={form.siteName} onChange={(e) => setForm((c) => ({ ...c, siteName: e.target.value }))} /></label>
        </div>
      </FieldCard>

      <FieldCard title="تأیید و آنالیتیکس" description="تگ‌های سرچ کنسول، تگ منیجر و گوگل آنالیتیکس را اینجا نگه دار.">
        <div className="fm-grid">
          <label className="fm-field"><span>Google Search Console Verification</span><input value={form.googleSearchConsoleVerification} onChange={(e) => setForm((c) => ({ ...c, googleSearchConsoleVerification: e.target.value }))} /></label>
          <label className="fm-field"><span>Google Tag Manager ID</span><input value={form.googleTagManagerId} onChange={(e) => setForm((c) => ({ ...c, googleTagManagerId: e.target.value }))} /></label>
          <label className="fm-field"><span>Google Analytics ID</span><input value={form.googleAnalyticsId} onChange={(e) => setForm((c) => ({ ...c, googleAnalyticsId: e.target.value }))} /></label>
        </div>
      </FieldCard>

      <FieldCard title="robots.txt" description="دستورهای crawl را واضح و مستقیم از این بخش مدیریت کن.">
        <label className="fm-field">
          <span>robots.txt</span>
          <textarea rows={12} value={form.robotsTxt} onChange={(e) => setForm((c) => ({ ...c, robotsTxt: e.target.value }))} />
        </label>
      </FieldCard>

      <FieldCard title="sitemap.xml" description="فعال‌سازی و اولویت پیش‌فرض نقشه سایت را اینجا کنترل کن.">
        <div className="fm-grid">
          <label className="fm-field">
            <span>Sitemap status</span>
            <select value={String(form.sitemapEnabled)} onChange={(e) => setForm((c) => ({ ...c, sitemapEnabled: e.target.value === 'true' }))}>
              <option value="true">فعال</option>
              <option value="false">غیرفعال</option>
            </select>
          </label>
          <label className="fm-field">
            <span>Change frequency</span>
            <select value={form.sitemapChangeFrequency} onChange={(e) => setForm((c) => ({ ...c, sitemapChangeFrequency: e.target.value as SeoSettingsResponse['sitemapChangeFrequency'] }))}>
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
            </select>
          </label>
          <label className="fm-field"><span>Priority</span><input value={form.sitemapPriority} onChange={(e) => setForm((c) => ({ ...c, sitemapPriority: e.target.value }))} /></label>
        </div>
      </FieldCard>

      <SectionCard eyebrow="actions" title="ذخیره نهایی" description="بعد از ذخیره، storefront این تنظیمات را مصرف می‌کند.">
        <div className="flex flex-wrap gap-3">
          <button className="fm-button" disabled={saving} onClick={handleSave} type="button">{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</button>
        </div>
        {loading ? <p className="mt-4 text-sm text-[#6d5b46]">در حال بارگذاری...</p> : null}
        {message ? <p className="mt-4 rounded-2xl bg-[#edf8f2] px-4 py-3 text-sm font-medium text-[#1f6a52]">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl bg-[#fff1ee] px-4 py-3 text-sm font-medium text-[#b64b36]">{error}</p> : null}
      </SectionCard>
    </div>
  )
}

import { SectionCard } from '@flower-marketplace/frontend-core'
import { useEffect, useState } from 'react'
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
      <SectionCard eyebrow="seo workspace" title="تنظیمات سئو" description="site url، verification tag، gtm، analytics، robots و sitemap را از اینجا مدیریت کن." actions={<button className="fm-button fm-button--secondary" onClick={onBack} type="button">بازگشت</button>}>
        <p className="text-sm text-[#6d5b46]">این workspace مبنای canonical، og:url و robots/sitemap storefront است.</p>
      </SectionCard>
      <SectionCard eyebrow="settings" title="پیکربندی SEO" description="مقادیر اصلی سئو را اینجا ذخیره کن.">
        {loading ? <p>در حال بارگذاری...</p> : null}
        <div className="fm-grid">
          <label className="fm-field"><span>Site URL</span><input value={form.siteUrl} onChange={(e) => setForm((c) => ({ ...c, siteUrl: e.target.value }))} /></label>
          <label className="fm-field"><span>Site Name</span><input value={form.siteName} onChange={(e) => setForm((c) => ({ ...c, siteName: e.target.value }))} /></label>
          <label className="fm-field"><span>Google Search Console Verification</span><input value={form.googleSearchConsoleVerification} onChange={(e) => setForm((c) => ({ ...c, googleSearchConsoleVerification: e.target.value }))} /></label>
          <label className="fm-field"><span>Google Tag Manager ID</span><input value={form.googleTagManagerId} onChange={(e) => setForm((c) => ({ ...c, googleTagManagerId: e.target.value }))} /></label>
          <label className="fm-field"><span>Google Analytics ID</span><input value={form.googleAnalyticsId} onChange={(e) => setForm((c) => ({ ...c, googleAnalyticsId: e.target.value }))} /></label>
          <label className="fm-field"><span>Sitemap priority</span><input value={form.sitemapPriority} onChange={(e) => setForm((c) => ({ ...c, sitemapPriority: e.target.value }))} /></label>
          <label className="fm-field"><span>Sitemap change frequency</span><input value={form.sitemapChangeFrequency} onChange={(e) => setForm((c) => ({ ...c, sitemapChangeFrequency: e.target.value as SeoSettingsResponse['sitemapChangeFrequency'] }))} /></label>
          <label className="fm-field"><span>Robots.txt</span><textarea rows={10} value={form.robotsTxt} onChange={(e) => setForm((c) => ({ ...c, robotsTxt: e.target.value }))} /></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="fm-button" disabled={saving} onClick={handleSave} type="button">{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</button>
        </div>
        {message ? <p className="mt-4 rounded-2xl bg-[#edf8f2] px-4 py-3 text-sm font-medium text-[#1f6a52]">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl bg-[#fff1ee] px-4 py-3 text-sm font-medium text-[#b64b36]">{error}</p> : null}
      </SectionCard>
    </div>
  )
}

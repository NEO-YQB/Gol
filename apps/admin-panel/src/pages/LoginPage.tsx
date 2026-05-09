import { Pill } from '@flower-marketplace/frontend-core'

type LoginPageProps = {
  phoneNumber: string
  code: string
  loading: boolean
  message: string | null
  error: string | null
  otpCountdown: string | null
  onPhoneChange: (value: string) => void
  onCodeChange: (value: string) => void
  onSendOtp: () => void
  onVerifyOtp: () => void
}

export function LoginPage({
  phoneNumber,
  code,
  loading,
  message,
  error,
  otpCountdown,
  onPhoneChange,
  onCodeChange,
  onSendOtp,
  onVerifyOtp,
}: LoginPageProps) {
  return (
    <div className="auth-screen" dir="rtl">
      <div className="auth-backdrop" aria-hidden="true">
        <span className="auth-orb auth-orb--primary" />
        <span className="auth-orb auth-orb--secondary" />
      </div>

      <div className="auth-shell">
        <div className="auth-card auth-card--compact">
          <div className="auth-mark">
            <Pill tone="primary">Admin panel</Pill>
            <span className="auth-mark__dot" aria-hidden="true" />
            <span className="auth-mark__label">Flower Marketplace</span>
          </div>

          <div className="auth-card__header auth-card__header--compact">
            <h1>ورود به پنل ادمین</h1>
            <p>شماره موبایل را وارد کن و با کد تایید وارد workspace شو.</p>
          </div>

          <div className="fm-form-grid auth-form-grid">
            <div className="fm-field">
              <label htmlFor="phoneNumber">شماره موبایل</label>
              <input
                id="phoneNumber"
                inputMode="numeric"
                onChange={(event) => onPhoneChange(event.target.value)}
                placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                value={phoneNumber}
              />
            </div>

            <button className="fm-button fm-button--primary auth-submit" disabled={loading} onClick={onSendOtp} type="button">
              {loading ? 'در حال ارسال...' : 'دریافت کد تایید'}
            </button>

            <div className="fm-field">
              <label htmlFor="otpCode">کد تایید</label>
              <input
                id="otpCode"
                inputMode="numeric"
                onChange={(event) => onCodeChange(event.target.value)}
                placeholder="۱۲۳۴۵ یا ۱۲۳۴۵۶"
                value={code}
              />
              {otpCountdown ? (
                <p className="auth-countdown">
                  زمان باقی‌مانده برای ورود با این کد: <strong>{otpCountdown}</strong>
                </p>
              ) : null}
            </div>

            <button className="fm-button fm-button--secondary auth-submit" disabled={loading} onClick={onVerifyOtp} type="button">
              ورود به پنل
            </button>

            {message ? <div className="fm-message fm-message--success">{message}</div> : null}
            {error ? <div className="fm-message fm-message--danger">{error}</div> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

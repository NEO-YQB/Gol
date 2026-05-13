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
    <div className="vendor-auth-screen" dir="rtl">
      <div className="vendor-auth-backdrop" aria-hidden="true">
        <span className="vendor-auth-orb vendor-auth-orb--primary" />
        <span className="vendor-auth-orb vendor-auth-orb--secondary" />
      </div>

      <div className="vendor-auth-shell">
        <div className="vendor-auth-card">
          <div className="vendor-auth-mark">
            <Pill tone="warning">پنل فروشنده</Pill>
            <span className="vendor-auth-mark__dot" aria-hidden="true" />
            <span className="vendor-auth-mark__label">کارتابل فروشگاه</span>
          </div>

          <div className="vendor-auth-header">
            <h1>ورود فروشنده</h1>
            <p>با شماره موبایل وارد شو تا سفارش‌ها، تسویه‌ها و وضعیت فروشگاهت را ببینی.</p>
          </div>

          <div className="fm-form-grid vendor-auth-form-grid">
            <div className="fm-field">
              <label htmlFor="vendorPhoneNumber">شماره موبایل</label>
              <input
                id="vendorPhoneNumber"
                inputMode="numeric"
                onChange={(event) => onPhoneChange(event.target.value)}
                placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                value={phoneNumber}
              />
            </div>

            <button className="fm-button fm-button--primary vendor-auth-submit" disabled={loading} onClick={onSendOtp} type="button">
              {loading ? 'در حال ارسال...' : 'دریافت کد تایید'}
            </button>

            <div className="fm-field">
              <label htmlFor="vendorOtpCode">کد تایید</label>
              <input
                id="vendorOtpCode"
                inputMode="numeric"
                onChange={(event) => onCodeChange(event.target.value)}
                placeholder="۱۲۳۴۵ یا ۱۲۳۴۵۶"
                value={code}
              />
              {otpCountdown ? (
                <p className="vendor-auth-countdown">
                  زمان باقی‌مانده برای ورود: <strong>{otpCountdown}</strong>
                </p>
              ) : null}
            </div>

            <button className="fm-button fm-button--secondary vendor-auth-submit" disabled={loading} onClick={onVerifyOtp} type="button">
              ورود به پنل فروشنده
            </button>

            {message ? <div className="fm-message fm-message--success">{message}</div> : null}
            {error ? <div className="fm-message fm-message--danger">{error}</div> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

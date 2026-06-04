import { StorefrontAccountShell } from '../../../components/StorefrontAccountShell'
import { StorefrontAccountProfile } from '../../../components/StorefrontAccountProfile'

export default function AccountProfilePage() {
  return (
    <StorefrontAccountShell
      title="اطلاعات کاربری"
      description="در این بخش اطلاعات پایه حساب خودت را می‌بینی و نام نمایشی‌ات را مدیریت می‌کنی."
    >
      <StorefrontAccountProfile />
    </StorefrontAccountShell>
  )
}

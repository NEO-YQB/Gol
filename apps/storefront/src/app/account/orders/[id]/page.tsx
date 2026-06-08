import { StorefrontAccountOrderDetail } from '../../../../components/StorefrontAccountOrderDetail'
import { StorefrontAccountShell } from '../../../../components/StorefrontAccountShell'

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const orderId = Number(id)

  return (
    <StorefrontAccountShell
      title={`سفارش #${Number.isFinite(orderId) ? new Intl.NumberFormat('fa-IR').format(orderId) : id}`}
      description="جزئیات کامل سفارش، وضعیت پرداخت، روند رسیدگی و اطلاعات تحویل را در این صفحه می‌بینی."
    >
      <StorefrontAccountOrderDetail orderId={orderId} />
    </StorefrontAccountShell>
  )
}

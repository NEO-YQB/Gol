import { getOrderDetail } from './storefrontAuth'

type PaymentInitiationResponse = {
  gateway?: { paymentUrl?: string }
  payment?: { paymentUrl?: string }
  message?: string | string[]
}

function readPaymentUrl(value?: string | null) {
  if (!value) throw new Error('لینک پرداخت معتبر دریافت نشد.')
  const url = new URL(value)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('لینک پرداخت معتبر دریافت نشد.')
  }
  return url.href
}

export async function getOrderPaymentUrl(token: string, orderId: number) {
  const order = await getOrderDetail(token, orderId)
  const payment = order.payment
  if (
    order.paymentMethod === 'ONLINE' &&
    order.availableActions?.canInitiatePayment === true &&
    payment?.status === 'PENDING' &&
    payment.paymentUrl &&
    payment.expiresAt &&
    new Date(payment.expiresAt).getTime() > Date.now()
  ) {
    return readPaymentUrl(payment.paymentUrl)
  }

  const response = await fetch('/api/payments/initiate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderId }),
  })
  const payload = (await response.json()) as PaymentInitiationResponse
  if (!response.ok) {
    const message = Array.isArray(payload.message) ? payload.message[0] : payload.message
    throw new Error(message || 'شروع پرداخت آنلاین با خطا مواجه شد')
  }
  return readPaymentUrl(payload.gateway?.paymentUrl || payload.payment?.paymentUrl)
}

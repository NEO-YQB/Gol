import { Payment, PaymentGatewayConfig } from '@prisma/client';
import { PaymentGatewayInitiationResult, PaymentGatewayVerificationResult } from '../types/payment-gateway.types';

export type GatewayInitiationContext = {
  amount: number;
  orderId: number;
  paymentId?: number;
  callbackUrl?: string | null;
  returnUrl?: string | null;
  config: PaymentGatewayConfig;
};

export type GatewayVerificationContext = {
  payment: Payment & { gatewayConfig: PaymentGatewayConfig | null };
  refId?: string;
  success?: boolean;
  failureReason?: string;
};

export interface PaymentGatewayAdapter {
  supports(driver: string): boolean;
  initiate(context: GatewayInitiationContext): Promise<PaymentGatewayInitiationResult>;
  verify(context: GatewayVerificationContext): Promise<PaymentGatewayVerificationResult>;
}

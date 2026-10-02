import { PaymentGatewayConfig } from '@prisma/client';
import { PaymentGatewayInitiationResult, PaymentGatewayVerificationResult } from '../types/payment-gateway.types';

export type GatewayInitiationContext = {
  amount: number;
  orderId?: number;
  paymentId?: number;
  callbackUrl?: string | null;
  returnUrl?: string | null;
  config: PaymentGatewayConfig;
};

export type GatewayVerificationPayment = {
  id: number;
  amount: unknown;
  authority: string;
  gatewayConfig: PaymentGatewayConfig | null;
};

export type GatewayVerificationContext = {
  payment: GatewayVerificationPayment;
  refId?: string;
  success?: boolean;
  failureReason?: string;
};

export interface PaymentGatewayAdapter {
  supports(driver: string): boolean;
  initiate(context: GatewayInitiationContext): Promise<PaymentGatewayInitiationResult>;
  verify(context: GatewayVerificationContext): Promise<PaymentGatewayVerificationResult>;
}

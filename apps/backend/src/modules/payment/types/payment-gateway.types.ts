export type PaymentGatewayInitiationResult = {
  authority: string;
  paymentUrl: string;
  rawData?: Record<string, unknown>;
};

export type PaymentGatewayVerificationResult = {
  success: boolean;
  refId?: string | null;
  failureReason?: string | null;
  rawData?: Record<string, unknown>;
};

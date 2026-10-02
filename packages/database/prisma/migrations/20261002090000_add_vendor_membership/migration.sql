CREATE TYPE "VendorMembershipStatus" AS ENUM ('PENDING', 'PAID', 'EXEMPT');

CREATE TABLE "VendorMembershipSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "feeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "freeUntil" TIMESTAMP(3),
    "title" TEXT NOT NULL DEFAULT 'حق عضویت فروشندگی',
    "description" TEXT,
    "updatedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VendorMembershipSetting_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VendorMembershipSetting_isEnabled_freeUntil_idx" ON "VendorMembershipSetting"("isEnabled", "freeUntil");

ALTER TABLE "VendorOnboardingRequest"
  ADD COLUMN "membershipStatus" "VendorMembershipStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "membershipAmount" DECIMAL(12,2),
  ADD COLUMN "membershipPaidAt" TIMESTAMP(3);

CREATE TABLE "VendorMembershipPayment" (
    "id" SERIAL NOT NULL,
    "onboardingRequestId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "gatewayConfigId" INTEGER,
    "gateway" TEXT NOT NULL,
    "gatewayKey" TEXT,
    "authority" TEXT NOT NULL,
    "refId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentUrl" TEXT,
    "failureReason" TEXT,
    "initiatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "gatewaySnapshot" JSONB,
    "rawInitiateData" JSONB,
    "rawVerifyData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VendorMembershipPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorMembershipPayment_authority_key" ON "VendorMembershipPayment"("authority");
CREATE INDEX "VendorMembershipPayment_onboardingRequestId_createdAt_idx" ON "VendorMembershipPayment"("onboardingRequestId", "createdAt");
CREATE INDEX "VendorMembershipPayment_userId_status_idx" ON "VendorMembershipPayment"("userId", "status");
CREATE INDEX "VendorMembershipPayment_gatewayConfigId_idx" ON "VendorMembershipPayment"("gatewayConfigId");
CREATE INDEX "VendorMembershipPayment_status_expiresAt_idx" ON "VendorMembershipPayment"("status", "expiresAt");

ALTER TABLE "VendorMembershipPayment" ADD CONSTRAINT "VendorMembershipPayment_onboardingRequestId_fkey" FOREIGN KEY ("onboardingRequestId") REFERENCES "VendorOnboardingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorMembershipPayment" ADD CONSTRAINT "VendorMembershipPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorMembershipPayment" ADD CONSTRAINT "VendorMembershipPayment_gatewayConfigId_fkey" FOREIGN KEY ("gatewayConfigId") REFERENCES "PaymentGatewayConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

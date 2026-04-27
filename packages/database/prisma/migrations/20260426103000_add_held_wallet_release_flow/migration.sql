-- Held Wallet Earning + Settlement Release Flow
ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'ORDER_RELEASE';
ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'ORDER_REVERSAL';

ALTER TABLE "CommissionRule"
  ADD COLUMN "settlementHoldDays" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "autoReleaseEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Order"
  ADD COLUMN "settlementHoldDays" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "settlementAutoReleaseEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "settlementEligibleAt" TIMESTAMP(3),
  ADD COLUMN "earningsHeldAt" TIMESTAMP(3),
  ADD COLUMN "earningsReleasedAt" TIMESTAMP(3),
  ADD COLUMN "settlementReviewedAt" TIMESTAMP(3),
  ADD COLUMN "settlementReviewedByUserId" INTEGER;

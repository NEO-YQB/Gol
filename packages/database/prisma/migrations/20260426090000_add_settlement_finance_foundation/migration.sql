-- Settlement / Finance Foundation
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'ELIGIBLE', 'PROCESSING', 'SETTLED', 'ON_HOLD', 'REVERSED');
CREATE TYPE "CommissionRuleScope" AS ENUM ('GLOBAL', 'STORE');
CREATE TYPE "WalletTransactionType" AS ENUM ('ORDER_EARNING', 'MANUAL_CREDIT', 'MANUAL_DEBIT', 'PROMOTION_SPEND', 'TOP_UP', 'SETTLEMENT_PAYOUT', 'ADJUSTMENT');
CREATE TYPE "WalletTransactionDirection" AS ENUM ('CREDIT', 'DEBIT');

CREATE TABLE "CommissionRule" (
  "id" SERIAL NOT NULL,
  "scope" "CommissionRuleScope" NOT NULL DEFAULT 'GLOBAL',
  "storeId" INTEGER,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "commissionRate" DECIMAL(5,2) NOT NULL,
  "systemServiceFeeRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "systemServiceFeeFixed" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "reason" TEXT,
  "createdByUserId" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreWallet" (
  "id" SERIAL NOT NULL,
  "storeId" INTEGER NOT NULL,
  "currentBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "availableBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "heldBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreWallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletTransaction" (
  "id" SERIAL NOT NULL,
  "walletId" INTEGER NOT NULL,
  "storeId" INTEGER NOT NULL,
  "orderId" INTEGER,
  "type" "WalletTransactionType" NOT NULL,
  "direction" "WalletTransactionDirection" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "batchKey" TEXT,
  "createdByUserId" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order"
  ADD COLUMN "commissionRuleId" INTEGER,
  ADD COLUMN "settlementStatus" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "commissionBaseAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "platformCommissionAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "systemServiceFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "platformTotalShareAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "vendorShareAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "financialSnapshot" JSONB;

CREATE UNIQUE INDEX "StoreWallet_storeId_key" ON "StoreWallet"("storeId");
CREATE INDEX "CommissionRule_scope_isActive_priority_idx" ON "CommissionRule"("scope", "isActive", "priority");
CREATE INDEX "CommissionRule_storeId_isActive_priority_idx" ON "CommissionRule"("storeId", "isActive", "priority");
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");
CREATE INDEX "WalletTransaction_storeId_createdAt_idx" ON "WalletTransaction"("storeId", "createdAt");
CREATE INDEX "WalletTransaction_orderId_idx" ON "WalletTransaction"("orderId");

ALTER TABLE "CommissionRule"
  ADD CONSTRAINT "CommissionRule_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreWallet"
  ADD CONSTRAINT "StoreWallet_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction"
  ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "StoreWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "WalletTransaction_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "WalletTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "CommissionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

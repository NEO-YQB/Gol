-- Add product-specific complaint window and support ticket settlement review flow.

ALTER TABLE "CommissionRule"
  ADD COLUMN "complaintWindowHours" INTEGER NOT NULL DEFAULT 24,
  ALTER COLUMN "settlementHoldDays" SET DEFAULT 7;

ALTER TABLE "Order"
  ADD COLUMN "complaintWindowHours" INTEGER NOT NULL DEFAULT 24,
  ALTER COLUMN "settlementHoldDays" SET DEFAULT 7;

CREATE TYPE "SupportTicketStatus" AS ENUM (
  'OPEN',
  'IN_REVIEW',
  'WAITING_CUSTOMER',
  'WAITING_VENDOR',
  'ESCALATED_TO_FINANCE',
  'RESOLVED',
  'REJECTED',
  'CANCELLED'
);

CREATE TYPE "SupportTicketReason" AS ENUM (
  'DAMAGED_FLOWERS',
  'MISMATCHED_PRODUCT',
  'LATE_DELIVERY',
  'INCOMPLETE_OR_WRONG_ORDER',
  'DELIVERY_EXPERIENCE',
  'OTHER'
);

CREATE TYPE "SupportTicketFinanceOutcome" AS ENUM (
  'NO_ACTION_RELEASE',
  'FULL_REFUND',
  'PARTIAL_REFUND',
  'FULL_REVERSAL',
  'PARTIAL_REVERSAL',
  'EXTEND_HOLD'
);

CREATE TYPE "SupportTicketActorType" AS ENUM (
  'CUSTOMER',
  'VENDOR',
  'ADMIN',
  'FINANCE',
  'SYSTEM'
);

CREATE TABLE "SupportTicket" (
  "id" SERIAL NOT NULL,
  "orderId" INTEGER NOT NULL,
  "customerId" INTEGER NOT NULL,
  "storeId" INTEGER,
  "reason" "SupportTicketReason" NOT NULL,
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "customerEvidence" JSONB,
  "internalNote" TEXT,
  "financeOutcome" "SupportTicketFinanceOutcome",
  "financeAmount" DECIMAL(12,2),
  "financeNote" TEXT,
  "settlementBlockedAt" TIMESTAMP(3),
  "escalatedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "resolvedByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTicketNote" (
  "id" SERIAL NOT NULL,
  "ticketId" INTEGER NOT NULL,
  "actorType" "SupportTicketActorType" NOT NULL,
  "actorUserId" INTEGER,
  "message" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicketNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportTicket_orderId_idx" ON "SupportTicket"("orderId");
CREATE INDEX "SupportTicket_customerId_createdAt_idx" ON "SupportTicket"("customerId", "createdAt");
CREATE INDEX "SupportTicket_storeId_createdAt_idx" ON "SupportTicket"("storeId", "createdAt");
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");
CREATE INDEX "SupportTicketNote_ticketId_createdAt_idx" ON "SupportTicketNote"("ticketId", "createdAt");

ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportTicketNote"
  ADD CONSTRAINT "SupportTicketNote_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

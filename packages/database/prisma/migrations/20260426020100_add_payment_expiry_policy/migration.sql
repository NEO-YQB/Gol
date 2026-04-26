-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0;

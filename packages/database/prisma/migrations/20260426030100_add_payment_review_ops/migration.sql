-- CreateEnum
CREATE TYPE "PaymentReviewStatus" AS ENUM ('NONE', 'NEEDS_REVIEW', 'UNDER_REVIEW', 'RESOLVED');

-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN "reviewStatus" "PaymentReviewStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "reviewReason" TEXT,
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedByUserId" INTEGER;

CREATE TYPE "VendorHealthStatus" AS ENUM ('EXCELLENT', 'GOOD', 'WATCHLIST', 'AT_RISK');

ALTER TABLE "Store"
ADD COLUMN "customerRatingAverage" DECIMAL(3,2) NOT NULL DEFAULT 0,
ADD COLUMN "customerRatingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "vendorHealthScore" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN "vendorHealthStatus" "VendorHealthStatus" NOT NULL DEFAULT 'GOOD',
ADD COLUMN "vendorHealthCalculatedAt" TIMESTAMP(3),
ADD COLUMN "vendorHealthSnapshot" JSONB;

-- CreateTable
CREATE TABLE "PaymentGatewayConfig" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "driver" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "sandboxMode" BOOLEAN NOT NULL DEFAULT true,
    "merchantConfig" JSONB,
    "technicalConfig" JSONB,
    "callbackUrl" TEXT,
    "returnUrl" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGatewayConfig_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "gatewayConfigId" INTEGER,
ADD COLUMN "gatewayKey" TEXT,
ADD COLUMN "gatewaySnapshot" JSONB;

-- Migrate existing enum-backed gateway to text
ALTER TABLE "Payment" ADD COLUMN "gateway_tmp" TEXT;
UPDATE "Payment" SET "gateway_tmp" = "gateway"::text;
ALTER TABLE "Payment" ALTER COLUMN "gateway_tmp" SET NOT NULL;
ALTER TABLE "Payment" DROP COLUMN "gateway";
ALTER TABLE "Payment" RENAME COLUMN "gateway_tmp" TO "gateway";
DROP TYPE "PaymentGateway";

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayConfig_key_key" ON "PaymentGatewayConfig"("key");
CREATE INDEX "PaymentGatewayConfig_isActive_isDefault_idx" ON "PaymentGatewayConfig"("isActive", "isDefault");
CREATE INDEX "PaymentGatewayConfig_priority_idx" ON "PaymentGatewayConfig"("priority");
CREATE INDEX "Payment_gatewayConfigId_idx" ON "Payment"("gatewayConfigId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_gatewayConfigId_fkey" FOREIGN KEY ("gatewayConfigId") REFERENCES "PaymentGatewayConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

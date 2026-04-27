-- Add audit-friendly pricing snapshot fields to orders and order items.
ALTER TABLE "Order"
  ADD COLUMN "subtotalBaseAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "subtotalAfterLineDiscounts" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "lineDiscountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "couponDiscountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "couponCode" TEXT,
  ADD COLUMN "couponTitle" TEXT,
  ADD COLUMN "couponApplyOn" "CouponApplyOn",
  ADD COLUMN "pricingSnapshot" JSONB;

ALTER TABLE "OrderItem"
  ADD COLUMN "pricingSnapshot" JSONB;

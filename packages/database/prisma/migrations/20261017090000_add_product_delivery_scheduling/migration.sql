ALTER TABLE "Product"
ADD COLUMN "minDeliveryHours" INTEGER,
ADD COLUMN "maxDeliveryHours" INTEGER,
ADD COLUMN "hasExpressDelivery" BOOLEAN,
ADD COLUMN "expressDeliveryHours" INTEGER,
ADD COLUMN "maxAdvanceOrderDays" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "Product" ADD CONSTRAINT "Product_delivery_hours_check" CHECK (
  ("minDeliveryHours" IS NULL OR "minDeliveryHours" BETWEEN 0 AND 120)
  AND ("maxDeliveryHours" IS NULL OR "maxDeliveryHours" BETWEEN 0 AND 120)
  AND ("minDeliveryHours" IS NULL OR "maxDeliveryHours" IS NULL OR "minDeliveryHours" <= "maxDeliveryHours")
  AND ("expressDeliveryHours" IS NULL OR "expressDeliveryHours" BETWEEN 1 AND 120)
  AND "maxAdvanceOrderDays" BETWEEN 0 AND 5
);

ALTER TABLE "Order" ADD COLUMN "scheduledDeliveryAt" TIMESTAMP(3);

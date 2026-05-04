ALTER TABLE "Review" ADD COLUMN "orderId" INTEGER;

UPDATE "Review" r
SET "orderId" = o."id"
FROM "Order" o
JOIN "OrderItem" oi ON oi."orderId" = o."id"
WHERE r."orderId" IS NULL
  AND o."userId" = r."userId"
  AND oi."productId" = r."productId";

DELETE FROM "Review" WHERE "orderId" IS NULL;

DELETE FROM "Review" a
USING "Review" b
WHERE a."id" < b."id"
  AND a."orderId" = b."orderId";

ALTER TABLE "Review" ALTER COLUMN "orderId" SET NOT NULL;
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Review_orderId_key" ON "Review"("orderId");
CREATE INDEX "Review_userId_productId_idx" ON "Review"("userId", "productId");

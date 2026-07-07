CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

CREATE INDEX "Order_storeId_createdAt_idx" ON "Order"("storeId", "createdAt");

CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

CREATE INDEX "Order_settlementStatus_updatedAt_idx" ON "Order"("settlementStatus", "updatedAt");

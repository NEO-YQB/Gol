ALTER TABLE "User"
  ADD COLUMN "nationalId" TEXT;

ALTER TABLE "Order"
  ADD COLUMN "customerNationalId" TEXT;

CREATE UNIQUE INDEX "User_nationalId_key" ON "User"("nationalId");

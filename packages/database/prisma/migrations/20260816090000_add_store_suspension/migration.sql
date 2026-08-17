ALTER TABLE "Store"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "suspendedByUserId" INTEGER,
ADD COLUMN "suspensionReason" TEXT;

CREATE INDEX "Store_isActive_isVerified_idx" ON "Store"("isActive", "isVerified");

INSERT INTO "Permission" (
  "action",
  "subject",
  "inverted",
  "conditions",
  "createdAt",
  "updatedAt"
)
VALUES (
  'updateStatus',
  'Store',
  false,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("action", "subject") DO NOTHING;

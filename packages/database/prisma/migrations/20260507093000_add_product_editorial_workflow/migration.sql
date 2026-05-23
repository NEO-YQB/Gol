CREATE TYPE "ProductPublicationStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'PUBLISHED',
  'ARCHIVED'
);

ALTER TABLE "Product"
ADD COLUMN "mainImageAlt" TEXT,
ADD COLUMN "gallery" JSONB,
ADD COLUMN "publicationStatus" "ProductPublicationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "isPurchasable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedByUserId" INTEGER,
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "publishedByUserId" INTEGER;

UPDATE "Product"
SET
  "gallery" = CASE
    WHEN "images" IS NULL THEN NULL
    ELSE (
      SELECT jsonb_agg(jsonb_build_object('url', value, 'alt', NULL))
      FROM jsonb_array_elements_text("images")
    )
  END,
  "publicationStatus" = 'PUBLISHED',
  "isPurchasable" = CASE WHEN "quantity" > 0 THEN true ELSE false END,
  "submittedAt" = "createdAt",
  "approvedAt" = "createdAt",
  "publishedAt" = "createdAt";

ALTER TABLE "Product"
ADD CONSTRAINT "Product_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_publishedByUserId_fkey"
FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Product_publicationStatus_updatedAt_idx" ON "Product"("publicationStatus", "updatedAt");
CREATE INDEX "Product_storeId_publicationStatus_updatedAt_idx" ON "Product"("storeId", "publicationStatus", "updatedAt");
CREATE INDEX "Product_isPurchasable_isArchived_idx" ON "Product"("isPurchasable", "isArchived");

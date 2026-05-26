CREATE TYPE "PageType" AS ENUM ('HOME', 'LANDING', 'CAMPAIGN', 'STATIC');

CREATE TABLE "Page" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "pageType" "PageType" NOT NULL DEFAULT 'LANDING',
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "metaTitle" TEXT,
  "metaDescription" TEXT,
  "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "ogImage" TEXT,
  "canonicalUrl" TEXT,
  "noIndex" BOOLEAN NOT NULL DEFAULT false,
  "blocks" JSONB NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdByUserId" INTEGER,
  "updatedByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");
CREATE INDEX "Page_isActive_updatedAt_idx" ON "Page"("isActive", "updatedAt");

ALTER TABLE "Page"
  ADD CONSTRAINT "Page_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Page"
  ADD CONSTRAINT "Page_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

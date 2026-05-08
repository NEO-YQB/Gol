CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "Author" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "bio" TEXT,
  "avatarImage" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArticleCategory" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "coverImage" TEXT,
  "metaTitle" TEXT,
  "metaDescription" TEXT,
  "canonicalUrl" TEXT,
  "robotsIndex" BOOLEAN NOT NULL DEFAULT true,
  "robotsFollow" BOOLEAN NOT NULL DEFAULT true,
  "ogTitle" TEXT,
  "ogDescription" TEXT,
  "ogImage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ArticleCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Article" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "excerpt" TEXT,
  "coverImage" TEXT,
  "content" TEXT NOT NULL,
  "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "metaTitle" TEXT,
  "metaDescription" TEXT,
  "canonicalUrl" TEXT,
  "robotsIndex" BOOLEAN NOT NULL DEFAULT true,
  "robotsFollow" BOOLEAN NOT NULL DEFAULT true,
  "ogTitle" TEXT,
  "ogDescription" TEXT,
  "ogImage" TEXT,
  "authorId" INTEGER NOT NULL,
  "categoryId" INTEGER NOT NULL,
  "createdByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Author_slug_key" ON "Author"("slug");
CREATE UNIQUE INDEX "ArticleCategory_slug_key" ON "ArticleCategory"("slug");
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

CREATE INDEX "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");
CREATE INDEX "Article_authorId_createdAt_idx" ON "Article"("authorId", "createdAt");
CREATE INDEX "Article_categoryId_createdAt_idx" ON "Article"("categoryId", "createdAt");

ALTER TABLE "Article"
  ADD CONSTRAINT "Article_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Article"
  ADD CONSTRAINT "Article_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "ArticleCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Article"
  ADD CONSTRAINT "Article_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

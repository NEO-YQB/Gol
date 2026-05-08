ALTER TABLE "ArticleCategory"
  ADD COLUMN "introText" TEXT;

CREATE TABLE "ArticleTag" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "introText" TEXT,
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
  CONSTRAINT "ArticleTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArticleTagOnArticles" (
  "articleId" INTEGER NOT NULL,
  "tagId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArticleTagOnArticles_pkey" PRIMARY KEY ("articleId", "tagId")
);

CREATE TABLE "ArticleCategorySlugRedirect" (
  "id" SERIAL NOT NULL,
  "fromSlug" TEXT NOT NULL,
  "categoryId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArticleCategorySlugRedirect_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArticleTagSlugRedirect" (
  "id" SERIAL NOT NULL,
  "fromSlug" TEXT NOT NULL,
  "tagId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArticleTagSlugRedirect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArticleTag_slug_key" ON "ArticleTag"("slug");
CREATE UNIQUE INDEX "ArticleCategorySlugRedirect_fromSlug_key" ON "ArticleCategorySlugRedirect"("fromSlug");
CREATE UNIQUE INDEX "ArticleTagSlugRedirect_fromSlug_key" ON "ArticleTagSlugRedirect"("fromSlug");
CREATE INDEX "ArticleTagOnArticles_tagId_articleId_idx" ON "ArticleTagOnArticles"("tagId", "articleId");

ALTER TABLE "ArticleTagOnArticles"
  ADD CONSTRAINT "ArticleTagOnArticles_articleId_fkey"
  FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArticleTagOnArticles"
  ADD CONSTRAINT "ArticleTagOnArticles_tagId_fkey"
  FOREIGN KEY ("tagId") REFERENCES "ArticleTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArticleCategorySlugRedirect"
  ADD CONSTRAINT "ArticleCategorySlugRedirect_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "ArticleCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArticleTagSlugRedirect"
  ADD CONSTRAINT "ArticleTagSlugRedirect_tagId_fkey"
  FOREIGN KEY ("tagId") REFERENCES "ArticleTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

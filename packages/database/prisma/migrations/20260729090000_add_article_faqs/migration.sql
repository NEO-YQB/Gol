CREATE TABLE "ArticleFaq" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "articleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleFaq_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArticleFaq_articleId_sortOrder_idx" ON "ArticleFaq"("articleId", "sortOrder");

ALTER TABLE "ArticleFaq" ADD CONSTRAINT "ArticleFaq_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

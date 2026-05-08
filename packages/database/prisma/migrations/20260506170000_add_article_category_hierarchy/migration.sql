ALTER TABLE "ArticleCategory"
  ADD COLUMN "parentId" INTEGER;

CREATE INDEX "ArticleCategory_parentId_idx" ON "ArticleCategory"("parentId");

ALTER TABLE "ArticleCategory"
  ADD CONSTRAINT "ArticleCategory_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "ArticleCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

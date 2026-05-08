ALTER TABLE "Author"
  ADD COLUMN "seoBio" TEXT;

ALTER TABLE "Article"
  ADD COLUMN "focusKeyword" TEXT,
  ADD COLUMN "seoNotes" TEXT,
  ADD COLUMN "readingTimeMinutes" INTEGER,
  ADD COLUMN "tableOfContents" JSONB;

CREATE INDEX "Article_focusKeyword_idx" ON "Article"("focusKeyword");

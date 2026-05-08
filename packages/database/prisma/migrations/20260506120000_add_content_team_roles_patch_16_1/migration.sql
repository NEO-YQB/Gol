ALTER TABLE "Author"
  ADD COLUMN "userId" INTEGER;

CREATE UNIQUE INDEX "Author_userId_key" ON "Author"("userId");

ALTER TABLE "Author"
  ADD CONSTRAINT "Author_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "parentBookId" TEXT;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_parentBookId_fkey" FOREIGN KEY ("parentBookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

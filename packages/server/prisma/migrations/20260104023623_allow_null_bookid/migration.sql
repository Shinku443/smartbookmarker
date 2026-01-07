-- DropForeignKey
ALTER TABLE "Page" DROP CONSTRAINT "Page_bookId_fkey";

-- AlterTable
ALTER TABLE "Page" ALTER COLUMN "bookId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

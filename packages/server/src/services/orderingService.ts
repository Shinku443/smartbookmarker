import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const orderingService = {
  reorderPages(bookId: string, orderedIds: string[]) {
    return prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.page.update({
          where: { id },
          data: { order: index },
        })
      )
    );
  },

  reorderBooks(orderedIds: string[]) {
    return prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.book.update({
          where: { id },
          data: { order: index },
        })
      )
    );
  },
};

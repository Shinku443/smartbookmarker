import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const pageTagService = {
  addTag(pageId: string, tagId: string) {
    return prisma.pageTag.create({
      data: { pageId, tagId },
    });
  },

  removeTag(pageId: string, tagId: string) {
    return prisma.pageTag.delete({
      where: { pageId_tagId: { pageId, tagId } },
    });
  },
};

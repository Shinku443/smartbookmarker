import { PrismaClient } from "@prisma/client";
import { syncService } from "./syncService";
import { serializeBigInts } from "../utils/helpers";

const prisma = new PrismaClient();

export const pageService = {
  getAll(bookId: string) {
    return prisma.page.findMany({
      where: { bookId },
      orderBy: { order: "asc" },
      include: { tags: true },
    });
  },

  get(id: string) {
    return prisma.page.findUnique({
      where: { id },
      include: { tags: true },
    });
  },

  async create(data: { bookId: string; title: string; content?: string }) {
    const page = await prisma.page.create({
      data: {
        ...data,
        order: Date.now(),
      },
    });

    await syncService.record("page", page.id);
    return serializeBigInts(page);
  },

  async update(
    id: string,
    data: Partial<{ title: string; content: string; pinned: boolean }>,
  ) {
    const page = await prisma.page.update({
      where: { id },
      data,
    });

    await syncService.record("page", page.id);
    return serializeBigInts(page);
  },

  async delete(id: string) {
    const page = await prisma.page.delete({ where: { id } });
    await syncService.record("page", page.id);
    return serializeBigInts(page);
  },
};

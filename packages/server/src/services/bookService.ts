import { PrismaClient } from "@prisma/client";
import { syncService } from "./syncService";
import { serializeBigInts } from "../utils/helpers";

const prisma = new PrismaClient();

export const bookService = {
  async getAll() {
    const books = await prisma.book.findMany({
      orderBy: { order: "asc" },
    });
    return serializeBigInts(books);
  },

  async get(id: string) {
    const book = await prisma.book.findUnique({ where: { id } });
    return serializeBigInts(book);
  },

  async create(data: { title: string; emoji?: string }) {
    const book = await prisma.book.create({
      data: {
        title: data.title,
        emoji: data.emoji,
        order: Date.now(), // BigInt in DB, JS number here
      },
    });

    await syncService.record("book", book.id);
    return serializeBigInts(book);
  },

  async update(
    id: string,
    data: Partial<{ title: string; emoji: string }>
  ) {
    const book = await prisma.book.update({
      where: { id },
      data,
    });

    await syncService.record("book", book.id);
    return serializeBigInts(book);
  },

  async delete(id: string) {
    const book = await prisma.book.delete({ where: { id } });
    await syncService.record("book", book.id);
    return serializeBigInts(book);
  },
};
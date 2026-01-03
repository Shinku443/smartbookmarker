import { PrismaClient } from "@prisma/client";
import { syncService } from "./syncService";
import { serializeBigInts } from "../utils/helpers";

const prisma = new PrismaClient();

export const tagService = {
  getAll() {
    return prisma.tag.findMany();
  },

  async create(data: { name: string; color?: string }) {
    const tag = await prisma.tag.create({ data });
    await syncService.record("tag", tag.id);
    return serializeBigInts(tag);
  },

  async delete(id: string) {
    const tag = await prisma.tag.delete({ where: { id } });
    await syncService.record("tag", tag.id);
    return serializeBigInts(tag);
  },
};

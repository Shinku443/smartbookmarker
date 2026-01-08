import { PrismaClient } from "@prisma/client";
import { serializeBigInts } from "../utils/helpers";

const prisma = new PrismaClient();

export const syncService = {
  async record(entityType: string, entityId: string) {
    const existing = await prisma.syncMetadata.findUnique({
      where: { entityId },
    });

    let row;

    if (existing) {
      row = await prisma.syncMetadata.update({
        where: { entityId },
        data: { version: existing.version + 1 },
      });
    } else {
      row = await prisma.syncMetadata.create({
        data: {
          entityType,
          entityId,
        },
      });
    }

    return serializeBigInts(row);
  },

  async getSince(since?: Date) {
    const rows = await prisma.syncMetadata.findMany({
      where: since ? { updatedAt: { gt: since } } : {},
      orderBy: { updatedAt: "asc" },
    });

    return serializeBigInts(rows);
  },
};
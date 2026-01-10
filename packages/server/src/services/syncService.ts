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
        data: {
          version: existing.version + 1,
          updatedAt: new Date() // Ensure timestamp is updated
        },
      });
    } else {
      row = await prisma.syncMetadata.create({
        data: {
          entityType,
          entityId,
          version: 1,
          updatedAt: new Date()
        },
      });
    }

    return serializeBigInts(row);
  },

  async recordDeletion(entityType: string, entityId: string) {
    const existing = await prisma.syncMetadata.findUnique({
      where: { entityId },
    });

    let row;

    if (existing) {
      row = await prisma.syncMetadata.update({
        where: { entityId },
        data: {
          version: existing.version + 1,
          deleted: true,
          updatedAt: new Date()
        },
      });
    } else {
      row = await prisma.syncMetadata.create({
        data: {
          entityType,
          entityId,
          version: 1,
          deleted: true,
          updatedAt: new Date()
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

  // New method to clean up old deleted records
  async cleanupDeletedRecords(maxAgeDays: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    const result = await prisma.syncMetadata.deleteMany({
      where: {
        deleted: true,
        updatedAt: { lt: cutoffDate }
      }
    });

    return result.count;
  },

  // New method to get conflict detection info
  async getConflictInfo(entityType: string, entityId: string) {
    const metadata = await prisma.syncMetadata.findUnique({
      where: { entityId },
    });

    if (!metadata) {
      return null;
    }

    return {
      entityType: metadata.entityType,
      entityId: metadata.entityId,
      version: metadata.version,
      deleted: metadata.deleted,
      lastUpdated: metadata.updatedAt
    };
  },

  // New method to check if entity exists and get its sync status
  async getEntitySyncStatus(entityType: string, entityId: string) {
    const metadata = await prisma.syncMetadata.findUnique({
      where: { entityId },
    });

    if (!metadata) {
      return { exists: false };
    }

    return {
      exists: true,
      version: metadata.version,
      deleted: metadata.deleted,
      lastUpdated: metadata.updatedAt
    };
  }
};

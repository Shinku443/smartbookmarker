import { FastifyInstance } from "fastify";
import { syncService } from "../services/syncService";
import { PrismaClient } from "@prisma/client";
import { serializeBigInts } from "../utils/helpers";

const prisma = new PrismaClient();

// Type for sync metadata rows
type SyncChange = {
  entityType: string;
  entityId: string;
  version: number;
  updatedAt: Date;
};

export default async function syncRoutes(app: FastifyInstance) {
  app.get("/sync", async (req) => {
    const { since } = (req.query || {}) as { since?: string };

    const sinceDate = since ? new Date(since) : undefined;

    // Fetch sync metadata rows
    const changes = await syncService.getSince(sinceDate);

    // Explicitly type the array so reduce() is allowed
    const typedChanges: SyncChange[] = changes as SyncChange[];

    // Build a map of entityType → [entityIds]
    const entityIdsByType = typedChanges.reduce(
      (acc: Record<string, string[]>, change: SyncChange) => {
        if (!acc[change.entityType]) acc[change.entityType] = [];
        acc[change.entityType].push(change.entityId);
        return acc;
      },
      {} as Record<string, string[]>
    );

    // Fetch changed entities from DB
    const [books, pages, tags] = await Promise.all([
      entityIdsByType.book?.length
        ? prisma.book.findMany({
            where: { id: { in: entityIdsByType.book } },
          })
        : [],

      entityIdsByType.page?.length
        ? prisma.page.findMany({
            where: { id: { in: entityIdsByType.page } },
            include: { tags: true },
          })
        : [],

      entityIdsByType.tag?.length
        ? prisma.tag.findMany({
            where: { id: { in: entityIdsByType.tag } },
          })
        : [],
    ]);

    return serializeBigInts ({
      changes: typedChanges,
      books,
      pages,
      tags,
    });
  });
}
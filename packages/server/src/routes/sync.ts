import { FastifyInstance } from "fastify";
import { syncService } from "../services/syncService";
import { PrismaClient } from "@prisma/client";
import { serializeBigInts } from "../utils/helpers";
import { bookService } from "../services/bookService";
import { pageService } from "../services/pageService";

const prisma = new PrismaClient();

type PushPayload = {
  books: {
    id: string;
    title: string;
    emoji: string | null;
    order: number;
    createdAt: string;
    updatedAt: string;
  }[];
  pages: {
    id: string;
    bookId: string;
    title: string;
    content: string | null;
    order: number;
    pinned: boolean;
    createdAt: string;
    updatedAt: string;
    tagIds?: string[];
  }[];
  tags: any[];
};

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

  app.post("/sync", async (req) => {
    const payload = req.body as PushPayload;

    // Process books
    for (const book of payload.books) {
      const existing = await prisma.book.findUnique({
        where: { id: book.id },
      });

      if (existing) {
        await prisma.book.update({
          where: { id: book.id },
          data: {
            title: book.title,
            emoji: book.emoji,
            order: book.order,
          },
        });
      } else {
        await prisma.book.create({
          data: {
            id: book.id,
            title: book.title,
            emoji: book.emoji,
            order: book.order,
            createdAt: new Date(book.createdAt),
            updatedAt: new Date(book.updatedAt),
          },
        });
      }

      await syncService.record("book", book.id);
    }

    // Process pages
    for (const page of payload.pages) {
      const existing = await prisma.page.findUnique({
        where: { id: page.id },
      });

      if (existing) {
        await prisma.page.update({
          where: { id: page.id },
          data: {
            title: page.title,
            content: page.content,
            order: page.order,
            pinned: page.pinned,
          },
        });
      } else {
        await prisma.page.create({
          data: {
            id: page.id,
            bookId: page.bookId,
            title: page.title,
            content: page.content,
            order: page.order,
            pinned: page.pinned,
            createdAt: new Date(page.createdAt),
            updatedAt: new Date(page.updatedAt),
          },
        });
      }

      await syncService.record("page", page.id);
    }

    // TODO: Process tags when tag sync is implemented

    return { success: true };
  });
}

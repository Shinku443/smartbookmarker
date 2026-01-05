"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = syncRoutes;
const syncService_1 = require("../services/syncService");
const client_1 = require("@prisma/client");
const helpers_1 = require("../utils/helpers");
const prisma = new client_1.PrismaClient();
async function syncRoutes(app) {
    app.get("/sync", async (req) => {
        const { since } = (req.query || {});
        const sinceDate = since ? new Date(since) : undefined;
        // Fetch sync metadata rows
        const changes = await syncService_1.syncService.getSince(sinceDate);
        // Explicitly type the array so reduce() is allowed
        const typedChanges = changes;
        // Build a map of entityType → [entityIds]
        const entityIdsByType = typedChanges.reduce((acc, change) => {
            if (!acc[change.entityType])
                acc[change.entityType] = [];
            acc[change.entityType].push(change.entityId);
            return acc;
        }, {});
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
        return (0, helpers_1.serializeBigInts)({
            changes: typedChanges,
            books,
            pages,
            tags,
        });
    });
    app.post("/sync", async (req) => {
        const payload = req.body;
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
            }
            else {
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
            await syncService_1.syncService.record("book", book.id);
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
            }
            else {
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
            await syncService_1.syncService.record("page", page.id);
        }
        // TODO: Process tags when tag sync is implemented
        return { success: true };
    });
}

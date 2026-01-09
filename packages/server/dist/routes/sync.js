"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = syncRoutes;
const syncService_1 = require("../services/syncService");
const client_1 = require("@prisma/client");
const helpers_1 = require("../utils/helpers");
const prisma = new client_1.PrismaClient();
async function syncRoutes(app) {
    console.log('[API] Registering sync routes');
    app.get("/sync", async (req) => {
        console.log('[API] GET /sync - pulling sync data');
        const { since } = (req.query || {});
        const sinceDate = since ? new Date(since) : undefined;
        // Fetch sync metadata rows
        const changes = await syncService_1.syncService.getSince(sinceDate);
        // Filter out deleted entities - we don't want to send deleted items to clients
        const activeChanges = changes.filter((change) => !change.deleted);
        // Build a map of entityType → [entityIds] for active (non-deleted) entities
        const entityIdsByType = activeChanges.reduce((acc, change) => {
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
            changes: changes,
            books,
            pages,
            tags,
        });
    });
    app.post("/sync", async (req) => {
        const payload = req.body;
        console.log(`[API] POST /sync - pushing changes: ${payload.books.length} books, ${payload.pages.length} pages, ${payload.deletions?.length || 0} deletions`);
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
                        parentBookId: book.parentBookId,
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
                        parentBookId: book.parentBookId,
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
            // Handle tag associations
            if (page.tagIds && page.tagIds.length > 0) {
                // Remove existing tag associations
                await prisma.pageTag.deleteMany({
                    where: { pageId: page.id },
                });
                // Create new tag associations
                for (const tagName of page.tagIds) {
                    // Find or create the tag
                    let tag = await prisma.tag.findFirst({
                        where: { name: tagName },
                    });
                    if (!tag) {
                        tag = await prisma.tag.create({
                            data: { name: tagName },
                        });
                        await syncService_1.syncService.record("tag", tag.id);
                    }
                    // Create the association
                    await prisma.pageTag.create({
                        data: {
                            pageId: page.id,
                            tagId: tag.id,
                        },
                    });
                }
            }
            await syncService_1.syncService.record("page", page.id);
        }
        // Handle deletions from payload
        if (payload.deletions && payload.deletions.length > 0) {
            for (const deletion of payload.deletions) {
                if (deletion.entityType === "page") {
                    // Delete the page if it exists
                    await prisma.page.deleteMany({
                        where: { id: deletion.entityId },
                    });
                    // Also delete tag associations
                    await prisma.pageTag.deleteMany({
                        where: { pageId: deletion.entityId },
                    });
                }
                else if (deletion.entityType === "book") {
                    // Delete the book if it exists
                    await prisma.book.deleteMany({
                        where: { id: deletion.entityId },
                    });
                    // Also delete associated pages and tag associations
                    const pagesToDelete = await prisma.page.findMany({
                        where: { bookId: deletion.entityId },
                        select: { id: true },
                    });
                    for (const page of pagesToDelete) {
                        await prisma.pageTag.deleteMany({
                            where: { pageId: page.id },
                        });
                    }
                    await prisma.page.deleteMany({
                        where: { bookId: deletion.entityId },
                    });
                }
            }
        }
        // TODO: Process tags when tag sync is implemented
        // After successful sync, prune deleted records to keep the sync metadata clean
        // This runs after every successful sync to prevent the metadata table from growing indefinitely
        try {
            const allRecords = await prisma.syncMetadata.findMany({
                take: 100 // Limit to avoid long-running operations
            });
            const deletedRecords = allRecords.filter((r) => r.deleted);
            if (deletedRecords.length > 0) {
                const deletedIds = deletedRecords.map(r => r.entityId);
                await prisma.syncMetadata.deleteMany({
                    where: { entityId: { in: deletedIds } }
                });
                console.log(`[API] POST /sync - pruned ${deletedRecords.length} deleted records from sync metadata`);
            }
        }
        catch (error) {
            console.warn('[API] POST /sync - failed to prune deleted records:', error);
            // Don't fail the sync if pruning fails
        }
        return { success: true };
    });
    // Utility/Poweruser sync endpoints
    app.get("/sync/stats", async (req) => {
        console.log('[API] GET /sync/stats - fetching sync statistics');
        const allPages = await prisma.page.findMany();
        const allBooks = await prisma.book.findMany();
        const syncMetadata = await prisma.syncMetadata.findMany();
        const stats = {
            local: {
                pages: allPages.length,
                books: allBooks.length
            },
            sync: {
                totalRecords: syncMetadata.length,
                deletedRecords: syncMetadata.filter((m) => m.deleted).length,
                activeRecords: syncMetadata.filter((m) => !m.deleted).length,
                lastSync: syncMetadata.length > 0
                    ? new Date(Math.max(...syncMetadata.map(m => m.updatedAt.getTime())))
                    : null
            },
            recentChanges: syncMetadata
                .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
                .slice(0, 10)
                .map(m => ({
                type: m.entityType,
                id: m.entityId,
                deleted: m.deleted,
                version: m.version,
                updatedAt: m.updatedAt
            }))
        };
        console.log(`[API] GET /sync/stats - returning sync stats`);
        return (0, helpers_1.serializeBigInts)(stats);
    });
    app.post("/sync/reset", async (req) => {
        console.log('[API] POST /sync/reset - resetting sync metadata');
        await prisma.syncMetadata.deleteMany();
        console.log('[API] POST /sync/reset - sync metadata reset completed');
        return { success: true, message: 'Sync metadata reset' };
    });
    app.post("/sync/cleanup", async (req) => {
        console.log('[API] POST /sync/cleanup - cleaning up deleted records');
        const allRecords = await prisma.syncMetadata.findMany();
        const deletedRecords = allRecords.filter((r) => r.deleted);
        let cleanedCount = 0;
        for (const record of deletedRecords) {
            await prisma.syncMetadata.delete({
                where: { entityId: record.entityId }
            });
            cleanedCount++;
        }
        console.log(`[API] POST /sync/cleanup - cleaned up ${cleanedCount} deleted records`);
        return { success: true, cleaned: cleanedCount };
    });
    // Debug operations for development/testing
    app.post("/sync/clear-all-data", async (req) => {
        console.log('[API] POST /sync/clear-all-data - clearing all data from database');
        // Clear in order to avoid foreign key constraints
        await prisma.pageTag.deleteMany();
        await prisma.page.deleteMany();
        await prisma.book.deleteMany();
        await prisma.tag.deleteMany();
        await prisma.syncMetadata.deleteMany();
        await prisma.userPreference.deleteMany();
        console.log('[API] POST /sync/clear-all-data - all data cleared');
        return { success: true, message: 'All data cleared from database' };
    });
    app.delete("/sync/entity/:entityType/:entityId", async (req) => {
        const { entityType, entityId } = req.params;
        console.log(`[API] DELETE /sync/entity/${entityType}/${entityId} - deleting entity`);
        try {
            if (entityType === "page") {
                await prisma.pageTag.deleteMany({ where: { pageId: entityId } });
                await prisma.page.deleteMany({ where: { id: entityId } });
                await syncService_1.syncService.recordDeletion("page", entityId);
            }
            else if (entityType === "book") {
                // Delete associated pages first
                const pagesToDelete = await prisma.page.findMany({
                    where: { bookId: entityId },
                    select: { id: true },
                });
                for (const page of pagesToDelete) {
                    await prisma.pageTag.deleteMany({ where: { pageId: page.id } });
                }
                await prisma.page.deleteMany({ where: { bookId: entityId } });
                await prisma.book.deleteMany({ where: { id: entityId } });
                await syncService_1.syncService.recordDeletion("book", entityId);
            }
            else if (entityType === "tag") {
                await prisma.pageTag.deleteMany({ where: { tagId: entityId } });
                await prisma.tag.deleteMany({ where: { id: entityId } });
                await syncService_1.syncService.recordDeletion("tag", entityId);
            }
            else {
                return { success: false, error: `Unknown entity type: ${entityType}` };
            }
            console.log(`[API] DELETE /sync/entity/${entityType}/${entityId} - entity deleted`);
            return { success: true, message: `${entityType} ${entityId} deleted` };
        }
        catch (error) {
            console.error(`[API] DELETE /sync/entity/${entityType}/${entityId} - error:`, error);
            return { success: false, error: `Failed to delete ${entityType} ${entityId}` };
        }
    });
    app.get("/sync/all-data", async (req) => {
        console.log('[API] GET /sync/all-data - fetching all data for debugging');
        const [books, pages, tags, syncMetadata] = await Promise.all([
            prisma.book.findMany({ include: { pages: true } }),
            prisma.page.findMany({ include: { tags: true, book: true } }),
            prisma.tag.findMany(),
            prisma.syncMetadata.findMany(),
        ]);
        return (0, helpers_1.serializeBigInts)({
            books,
            pages,
            tags,
            syncMetadata,
        });
    });
}

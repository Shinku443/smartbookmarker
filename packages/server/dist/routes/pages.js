"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = pageRoutes;
const pageService_1 = require("../services/pageService");
const helpers_1 = require("../utils/helpers");
async function pageRoutes(app) {
    console.log('[API] Registering page routes');
    // Basic CRUD operations
    app.get("/pages", async (req) => {
        console.log('[API] GET /pages - fetching all pages');
        const result = await pageService_1.pageService.getAll();
        console.log(`[API] GET /pages - returning ${result.length} pages`);
        return (0, helpers_1.serializeBigInts)(result);
    });
    app.get("/pages/:bookId", async (req) => {
        const bookId = req.params.bookId;
        console.log(`[API] GET /pages/${bookId} - fetching pages for book`);
        const result = await pageService_1.pageService.getAll(bookId);
        console.log(`[API] GET /pages/${bookId} - returning ${result.length} pages`);
        return (0, helpers_1.serializeBigInts)(result);
    });
    app.post("/pages", async (req) => {
        console.log('[API] POST /pages - creating new page');
        const result = await pageService_1.pageService.create(req.body);
        console.log(`[API] POST /pages - created page with ID: ${result.id}`);
        return (0, helpers_1.serializeBigInts)(result);
    });
    app.patch("/pages/:id", async (req) => {
        const id = req.params.id;
        console.log(`[API] PATCH /pages/${id} - updating page`);
        const result = await pageService_1.pageService.update(id, req.body);
        console.log(`[API] PATCH /pages/${id} - updated successfully`);
        return (0, helpers_1.serializeBigInts)(result);
    });
    app.delete("/pages/:id", async (req) => {
        const id = req.params.id;
        console.log(`[API] DELETE /pages/${id} - deleting page`);
        const result = await pageService_1.pageService.delete(id);
        console.log(`[API] DELETE /pages/${id} - deleted successfully`);
        return (0, helpers_1.serializeBigInts)(result);
    });
    // Enhanced operations
    app.post("/pages/:id/extract", async (req) => {
        const id = req.params.id;
        const url = req.body.url;
        console.log(`[API] POST /pages/${id}/extract - extracting content for URL: ${url}`);
        const result = await pageService_1.pageService.extractContent(id, url);
        console.log(`[API] POST /pages/${id}/extract - extraction completed`);
        return (0, helpers_1.serializeBigInts)(result);
    });
    app.patch("/pages/:id/status", async (req) => {
        const id = req.params.id;
        const status = req.body.status;
        console.log(`[API] PATCH /pages/${id}/status - updating status to: ${status}`);
        const result = await pageService_1.pageService.updateStatus(id, status);
        console.log(`[API] PATCH /pages/${id}/status - status updated`);
        return (0, helpers_1.serializeBigInts)(result);
    });
    app.patch("/pages/:id/notes", async (req) => {
        const id = req.params.id;
        const notes = req.body.notes;
        console.log(`[API] PATCH /pages/${id}/notes - updating notes`);
        const result = await pageService_1.pageService.addNotes(id, notes);
        console.log(`[API] PATCH /pages/${id}/notes - notes updated`);
        return (0, helpers_1.serializeBigInts)(result);
    });
    // Utility/Poweruser endpoints
    app.get("/pages/stats", async (req) => {
        console.log('[API] GET /pages/stats - fetching page statistics');
        const allPages = await pageService_1.pageService.getAll();
        const stats = {
            total: allPages.length,
            bySource: allPages.reduce((acc, page) => {
                acc[page.source] = (acc[page.source] || 0) + 1;
                return acc;
            }, {}),
            byStatus: allPages.reduce((acc, page) => {
                const status = page.status || 'active';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {}),
            recent: allPages
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 5)
                .map(p => ({ id: p.id, title: p.title, createdAt: p.createdAt }))
        };
        console.log(`[API] GET /pages/stats - returning stats for ${allPages.length} pages`);
        return stats;
    });
    app.post("/pages/bulk-delete", async (req) => {
        const ids = req.body.ids || [];
        console.log(`[API] POST /pages/bulk-delete - deleting ${ids.length} pages`);
        let deletedCount = 0;
        for (const id of ids) {
            try {
                await pageService_1.pageService.delete(id);
                deletedCount++;
            }
            catch (error) {
                console.error(`Failed to delete page ${id}:`, error);
            }
        }
        console.log(`[API] POST /pages/bulk-delete - deleted ${deletedCount} pages`);
        return { deleted: deletedCount };
    });
    app.get("/pages/search", async (req) => {
        const query = req.query.q || '';
        console.log(`[API] GET /pages/search - searching for: "${query}"`);
        const allPages = await pageService_1.pageService.getAll();
        const results = allPages.filter(page => page.title.toLowerCase().includes(query.toLowerCase()) ||
            (page.content && page.content.toLowerCase().includes(query.toLowerCase()))).slice(0, 20); // Limit results
        console.log(`[API] GET /pages/search - found ${results.length} results`);
        return (0, helpers_1.serializeBigInts)(results);
    });
}

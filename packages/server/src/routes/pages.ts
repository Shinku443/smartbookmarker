import { FastifyInstance } from "fastify";
import { pageService } from "../services/pageService";
import { serializeBigInts } from "../utils/helpers";

export default async function pageRoutes(app: FastifyInstance) {
  console.log('[API] Registering page routes');

  // Basic CRUD operations
  app.get("/pages", async (req) => {
    console.log('[API] GET /pages - fetching all pages');
    const result = await pageService.getAll();
    console.log(`[API] GET /pages - returning ${result.length} pages`);
    return serializeBigInts(result);
  });

  app.get("/pages/:bookId", async (req) => {
    const bookId = (req.params as any).bookId;
    console.log(`[API] GET /pages/${bookId} - fetching pages for book`);
    const result = await pageService.getAll(bookId);
    console.log(`[API] GET /pages/${bookId} - returning ${result.length} pages`);
    return serializeBigInts(result);
  });

  app.post("/pages", async (req) => {
    console.log('[API] POST /pages - creating new page');
    const result = await pageService.create(req.body as any);
    console.log(`[API] POST /pages - created page with ID: ${(result as any).id}`);
    return serializeBigInts(result);
  });

  app.patch("/pages/:id", async (req) => {
    const id = (req.params as any).id;
    console.log(`[API] PATCH /pages/${id} - updating page`);
    const result = await pageService.update(id, req.body as any);
    console.log(`[API] PATCH /pages/${id} - updated successfully`);
    return serializeBigInts(result);
  });

  app.delete("/pages/:id", async (req) => {
    const id = (req.params as any).id;
    console.log(`[API] DELETE /pages/${id} - deleting page`);
    const result = await pageService.delete(id);
    console.log(`[API] DELETE /pages/${id} - deleted successfully`);
    return serializeBigInts(result);
  });

  // Enhanced operations
  app.post("/pages/:id/extract", async (req) => {
    const id = (req.params as any).id;
    const url = (req.body as any).url;
    console.log(`[API] POST /pages/${id}/extract - extracting content for URL: ${url}`);
    const result = await pageService.extractContent(id, url);
    console.log(`[API] POST /pages/${id}/extract - extraction completed`);
    return serializeBigInts(result);
  });

  app.patch("/pages/:id/status", async (req) => {
    const id = (req.params as any).id;
    const status = (req.body as any).status;
    console.log(`[API] PATCH /pages/${id}/status - updating status to: ${status}`);
    const result = await pageService.updateStatus(id, status);
    console.log(`[API] PATCH /pages/${id}/status - status updated`);
    return serializeBigInts(result);
  });

  app.patch("/pages/:id/notes", async (req) => {
    const id = (req.params as any).id;
    const notes = (req.body as any).notes;
    console.log(`[API] PATCH /pages/${id}/notes - updating notes`);
    const result = await pageService.addNotes(id, notes);
    console.log(`[API] PATCH /pages/${id}/notes - notes updated`);
    return serializeBigInts(result);
  });

  // Utility/Poweruser endpoints
  app.get("/pages/stats", async (req) => {
    console.log('[API] GET /pages/stats - fetching page statistics');
    const allPages = await pageService.getAll();
    const stats = {
      total: allPages.length,
      bySource: allPages.reduce((acc, page) => {
        acc[page.source] = (acc[page.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStatus: allPages.reduce((acc, page) => {
        const status = page.status || 'active';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recent: allPages
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map(p => ({ id: p.id, title: p.title, createdAt: p.createdAt }))
    };
    console.log(`[API] GET /pages/stats - returning stats for ${allPages.length} pages`);
    return stats;
  });

  app.post("/pages/bulk-delete", async (req) => {
    const ids = (req.body as any).ids || [];
    console.log(`[API] POST /pages/bulk-delete - deleting ${ids.length} pages`);
    let deletedCount = 0;
    for (const id of ids) {
      try {
        await pageService.delete(id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete page ${id}:`, error);
      }
    }
    console.log(`[API] POST /pages/bulk-delete - deleted ${deletedCount} pages`);
    return { deleted: deletedCount };
  });

  app.get("/pages/search", async (req) => {
    const query = (req.query as any).q || '';
    console.log(`[API] GET /pages/search - searching for: "${query}"`);
    const allPages = await pageService.getAll();
    const results = allPages.filter(page =>
      page.title.toLowerCase().includes(query.toLowerCase()) ||
      (page.content && page.content.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 20); // Limit results
    console.log(`[API] GET /pages/search - found ${results.length} results`);
    return serializeBigInts(results);
  });
}

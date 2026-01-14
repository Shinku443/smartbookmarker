import { FastifyInstance } from "fastify";

// CouchDB integration for pages
let PouchDB: any = null;

// Initialize CouchDB
try {
  import('pouchdb').then(pouchdb => {
    PouchDB = pouchdb.default;
    console.log('✅ CouchDB loaded in page routes');
  }).catch(err => {
    console.log('❌ CouchDB not available in page routes:', err.message);
  });
} catch (e: any) {
  console.log('❌ CouchDB integration failed to load:', e.message);
}

export default async function pageRoutes(app: FastifyInstance) {
  console.log('[API] Registering CouchDB-based page routes');

  // Initialize CouchDB database connection
  let couchDB: any = null;
  let couchDBAvailable = false;

  const getCouchDB = () => {
    if (!couchDB && PouchDB) {
      try {
        couchDB = new PouchDB('http://admin:changeme123@localhost:5984/bookmarks');
        couchDBAvailable = true;
        console.log('✅ CouchDB connection established for pages');
      } catch (error) {
        console.error('❌ CouchDB connection failed:', error);
        couchDBAvailable = false;
      }
    }
    return couchDB;
  };

  // GET /pages - Get all pages
  app.get("/pages", async (req) => {
    console.log('[API] GET /pages - fetching all pages from CouchDB');
    const db = getCouchDB();
    if (!db) {
      return { error: 'CouchDB not available' };
    }

    try {
      const result = await db.allDocs({ include_docs: true });
      const pages = result.rows
        .filter((row: any) => row.doc && row.doc.type === 'page')
        .map((row: any) => row.doc);

      console.log(`[API] GET /pages - returning ${pages.length} pages from CouchDB`);
      return { pages };
    } catch (error: any) {
      console.error('[API] CouchDB query failed:', error);
      return { error: error.message };
    }
  });

  // GET /pages/:bookId - Get pages for specific book
  app.get("/pages/:bookId", async (req) => {
    const bookId = (req.params as any).bookId;
    console.log(`[API] GET /pages/${bookId} - fetching pages for book from CouchDB`);

    const db = getCouchDB();
    if (!db) {
      return { error: 'CouchDB not available' };
    }

    try {
      const result = await db.allDocs({ include_docs: true });
      const pages = result.rows
        .filter((row: any) => row.doc && row.doc.type === 'page' && row.doc.bookId === bookId)
        .map((row: any) => row.doc);

      console.log(`[API] GET /pages/${bookId} - returning ${pages.length} pages from CouchDB`);
      return { pages };
    } catch (error: any) {
      console.error('[API] CouchDB query failed:', error);
      return { error: error.message };
    }
  });

  // POST /pages - Create new page
  app.post("/pages", async (req) => {
    const data = req.body as any;
    console.log('[API] POST /pages - REQUEST RECEIVED');
    console.log('[API] POST /pages - Request body:', JSON.stringify(data, null, 2));
    console.log('[API] POST /pages - Creating new page in CouchDB:', data.title);

    const db = getCouchDB();
    console.log('[API] POST /pages - CouchDB available:', !!db);

    if (!db) {
      console.error('[API] POST /pages - CouchDB not available');
      return { error: 'CouchDB not available' };
    }

    try {
      // Use frontend-provided ID or generate one
      const pageId = data.id || `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const pageDoc = {
        _id: pageId,
        type: 'page',
        id: pageId,
        bookId: data.bookId || null,
        title: data.title,
        url: data.url,
        content: data.content || null,
        description: data.description || null,
        faviconUrl: data.faviconUrl || null,
        thumbnailUrl: data.thumbnailUrl || null,
        extractedText: data.extractedText || null,
        screenshotUrl: data.screenshotUrl || null,
        metaDescription: data.metaDescription || null,
        status: data.status || null,
        notes: data.notes || null,
        source: data.source || 'manual',
        rawMetadata: data.rawMetadata || null,
        tags: data.tags || [], // Add tags to CouchDB document
        order: Date.now(),
        pinned: data.pinned || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('[API] POST /pages - About to save pageDoc:', JSON.stringify(pageDoc, null, 2));
      const result = await db.put(pageDoc);
      console.log(`[API] POST /pages - CouchDB put result:`, result);

      // Return the created document
      const created = await db.get(result.id);
      console.log('[API] POST /pages - Retrieved created document:', JSON.stringify(created, null, 2));
      return created;
    } catch (error: any) {
      console.error('[API] POST /pages - CouchDB create failed:', error);
      console.error('[API] POST /pages - Error details:', error.stack);
      return { error: error.message };
    }
  });

  // PATCH /pages/:id - Update page
  app.patch("/pages/:id", async (req) => {
    const id = (req.params as any).id;
    const updates = req.body as any;
    console.log(`[API] PATCH /pages/${id} - updating page in CouchDB`);

    const db = getCouchDB();
    if (!db) {
      return { error: 'CouchDB not available' };
    }

    try {
      const doc = await db.get(id);
      const updatedDoc = {
        ...doc,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const result = await db.put(updatedDoc);
      console.log(`[API] PATCH /pages/${id} - updated successfully`);

      // Return the updated document
      const updated = await db.get(id);
      return updated;
    } catch (error: any) {
      console.error('[API] CouchDB update failed:', error);
      return { error: error.message };
    }
  });

  // DELETE /pages/:id - Delete page
  app.delete("/pages/:id", async (req) => {
    const id = (req.params as any).id;
    console.log(`[API] DELETE /pages/${id} - REQUEST RECEIVED`);
    console.log(`[API] DELETE /pages/${id} - Params:`, req.params);

    const db = getCouchDB();
    console.log(`[API] DELETE /pages/${id} - CouchDB available:`, !!db);

    if (!db) {
      console.error(`[API] DELETE /pages/${id} - CouchDB not available`);
      return { error: 'CouchDB not available' };
    }

    try {
      console.log(`[API] DELETE /pages/${id} - Fetching document from CouchDB`);
      const doc = await db.get(id);
      console.log(`[API] DELETE /pages/${id} - Retrieved document:`, JSON.stringify(doc, null, 2));

      const tombstoneDoc = {
        ...doc,
        _deleted: true,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log(`[API] DELETE /pages/${id} - Constructed tombstone:`, JSON.stringify(tombstoneDoc, null, 2));
      console.log(`[API] DELETE /pages/${id} - Saving tombstone to CouchDB`);
      const result = await db.put(tombstoneDoc);
      console.log(`[API] DELETE /pages/${id} - Tombstone saved:`, result);

      console.log(`[API] DELETE /pages/${id} - Page deleted successfully`);
      return { success: true, id, deletedAt: tombstoneDoc.deletedAt };
    } catch (error: any) {
      console.error(`[API] DELETE /pages/${id} - CouchDB delete failed:`, error);
      console.error(`[API] DELETE /pages/${id} - Error details:`, error.stack);
      return { error: error.message };
    }
  });
}

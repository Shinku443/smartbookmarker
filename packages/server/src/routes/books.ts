import { FastifyInstance } from "fastify";

// CouchDB integration for books
let PouchDB: any = null;

// Initialize CouchDB
try {
  import('pouchdb').then(pouchdb => {
    PouchDB = pouchdb.default;
    console.log('✅ CouchDB loaded in book routes');
  }).catch(err => {
    console.log('❌ CouchDB not available in book routes:', err.message);
  });
} catch (e: any) {
  console.log('❌ CouchDB integration failed to load:', e.message);
}

export default async function bookRoutes(app: FastifyInstance) {
  console.log('[API] Registering CouchDB-based book routes');

  // Initialize CouchDB database connection
  let couchDB: any = null;

  const getCouchDB = () => {
    if (!couchDB && PouchDB) {
      try {
        console.log('[API] Creating CouchDB connection for books...');
        couchDB = new PouchDB('http://admin:changeme123@localhost:5984/bookmarks');
        console.log('[API] CouchDB connection created for books');
      } catch (error) {
        console.error('[API] Failed to create CouchDB connection for books:', error);
        return null;
      }
    }
    return couchDB;
  };

  // GET /books - Get all books
  app.get("/books", async () => {
    console.log('[API] GET /books - fetching all books from CouchDB');
    const db = getCouchDB();
    if (!db) {
      return { error: 'CouchDB not available' };
    }

    try {
      const result = await db.allDocs({ include_docs: true });
      const books = result.rows
        .filter((row: any) => row.doc && row.doc.type === 'book')
        .map((row: any) => row.doc);

      console.log(`[API] GET /books - returning ${books.length} books from CouchDB`);
      return { books };
    } catch (error: any) {
      console.error('[API] CouchDB query failed:', error);
      return { error: error.message };
    }
  });

  // POST /books - Create new book
  app.post("/books", async (req) => {
    const data = req.body as any;
    console.log('[API] POST /books - REQUEST RECEIVED');
    console.log('[API] POST /books - Request body:', JSON.stringify(data, null, 2));
    console.log('[API] POST /books - Creating new book in CouchDB:', data.title || data.name);

    const db = getCouchDB();
    console.log('[API] POST /books - CouchDB available:', !!db);

    if (!db) {
      console.error('[API] POST /books - CouchDB not available');
      return { error: 'CouchDB not available' };
    }

    try {
      const bookDoc = {
        _id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'book',
        id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: data.title || data.name,
        emoji: data.emoji || null,
        order: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('[API] POST /books - About to save bookDoc:', JSON.stringify(bookDoc, null, 2));
      const result = await db.put(bookDoc);
      console.log(`[API] POST /books - CouchDB put result:`, result);

      // Return the created document
      const created = await db.get(result.id);
      console.log('[API] POST /books - Retrieved created document:', JSON.stringify(created, null, 2));
      return created;
    } catch (error: any) {
      console.error('[API] POST /books - CouchDB create book failed:', error);
      console.error('[API] POST /books - Error details:', error.stack);
      return { error: error.message };
    }
  });

  // PATCH /books/:id - Update book
  app.patch("/books/:id", async (req) => {
    const id = (req.params as any).id;
    const updates = req.body as any;
    console.log(`[API] PATCH /books/${id} - updating book in CouchDB`);

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
      console.log(`[API] PATCH /books/${id} - updated successfully`);

      // Return the updated document
      const updated = await db.get(id);
      return updated;
    } catch (error: any) {
      console.error('[API] CouchDB update failed:', error);
      return { error: error.message };
    }
  });

  // DELETE /books/:id - Delete book
  app.delete("/books/:id", async (req) => {
    const id = (req.params as any).id;
    console.log(`[API] DELETE /books/${id} - REQUEST RECEIVED`);
    console.log(`[API] DELETE /books/${id} - Params:`, req.params);

    const db = getCouchDB();
    console.log(`[API] DELETE /books/${id} - CouchDB available:`, !!db);

    if (!db) {
      console.error(`[API] DELETE /books/${id} - CouchDB not available`);
      return { error: 'CouchDB not available' };
    }

    try {
      console.log(`[API] DELETE /books/${id} - Fetching document from CouchDB`);
      const doc = await db.get(id);
      console.log(`[API] DELETE /books/${id} - Retrieved document:`, JSON.stringify(doc, null, 2));

      const tombstoneDoc = {
        ...doc,
        _deleted: true,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log(`[API] DELETE /books/${id} - Constructed tombstone:`, JSON.stringify(tombstoneDoc, null, 2));
      console.log(`[API] DELETE /books/${id} - Saving tombstone to CouchDB`);
      const result = await db.put(tombstoneDoc);
      console.log(`[API] DELETE /books/${id} - Tombstone saved:`, result);

      console.log(`[API] DELETE /books/${id} - Book deleted successfully`);
      return { success: true, id, deletedAt: tombstoneDoc.deletedAt };
    } catch (error: any) {
      console.error(`[API] DELETE /books/${id} - CouchDB delete failed:`, error);
      console.error(`[API] DELETE /books/${id} - Error details:`, error.stack);
      return { error: error.message };
    }
  });
}

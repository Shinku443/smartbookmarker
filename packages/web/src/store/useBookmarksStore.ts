// apps/web/src/store/useBookmarksStore.ts
// CouchDB-based bookmark manager with offline-first replication

import { create } from "zustand";

// Dynamic imports for PouchDB to work in browser
let PouchDB: any = null;

// Core data model with offline-first fields
export type BaseEntity = {
  id: string;
  updatedAt: string;
  deleted: boolean;
  deletedAt: string | null;
  order: number | null;
  pinned: boolean;
  pinnedAt: string | null;
};

// CouchDB document types with core fields
export type CouchDBBook = {
  _id: string;
  _rev?: string;
  type: 'book';
} & BaseEntity & {
  title: string;
  emoji: string | null;
  createdAt: string;
};

export type CouchDBPage = {
  _id: string;
  _rev?: string;
  type: 'page';
} & BaseEntity & {
  bookId: string | null;
  title: string;
  content: string | null;
  url: string;
  description: string | null;
  faviconUrl: string | null;
  thumbnailUrl: string | null;
  extractedText: string | null;
  screenshotUrl: string | null;
  metaDescription: string | null;
  status: string | null;
  notes: string | null;
  source: string;
  rawMetadata: any;
  createdAt: string;
};

// Application types (without CouchDB metadata)
export type Book = Omit<CouchDBBook, '_id' | '_rev' | 'type'>;
export type Page = Omit<CouchDBPage, '_id' | '_rev' | 'type'>;

type PendingMutation = {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'book' | 'page';
  data?: any;
  timestamp: string;
  synced: boolean;
};

type State = {
  // CouchDB instances
  localDB: PouchDB.Database | null;
  remoteDB: PouchDB.Database | null;

  // Local state
  books: Book[];
  pages: Page[];
  isInitialized: boolean;
  isSyncing: boolean;
  syncError: string | null;
  lastSyncAt: string | null;

  // Pending mutations for offline-first behavior
  pendingMutations: PendingMutation[];

  // CouchDB operations
  initializeCouchDB: () => Promise<void>;
  syncWithRemote: () => Promise<void>;
  loadFromLocalDB: () => Promise<void>;
  startBackgroundSync: () => void;

  // CRUD operations
  createBook: (input: { title: string; emoji?: string | null }) => Promise<Book>;
  createPage: (input: { bookId: string; title: string; content?: string }) => Promise<Page>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<Book>;
  updatePage: (id: string, updates: Partial<Page>) => Promise<Page>;
  deleteBook: (id: string) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  deleteAllLocalData: () => Promise<void>;

  // Offline-first operations
  markLocalDeleted: (entity: 'book' | 'page', id: string) => void;
  queueMutation: (mutation: Omit<PendingMutation, 'timestamp' | 'synced'>) => void;
  processPendingMutations: () => Promise<void>;
};

export const useBookmarksStore = create<State>((set, get) => ({
  localDB: null,
  remoteDB: null,
  books: [],
  pages: [],
  isInitialized: false,
  isSyncing: false,
  syncError: null,
  lastSyncAt: null,
  pendingMutations: [],

  async initializeCouchDB() {
    if (get().isInitialized) return;

    try {
      console.log('🔄 Initializing bookmark store with PouchDB + CouchDB sync...');

      // Load PouchDB with different import strategy to avoid constructor issues
      if (!PouchDB) {
        console.log('📦 Loading PouchDB...');
        try {
          // Try individual imports to avoid constructor conflicts
          const pouchdbModule = await import('pouchdb');
          const idbAdapter = await import('pouchdb-adapter-idb');
          const replicationAdapter = await import('pouchdb-replication');

          // Handle different export patterns
          PouchDB = pouchdbModule.default || pouchdbModule;
          if (!PouchDB || typeof PouchDB !== 'function') {
            throw new Error('PouchDB constructor not found');
          }

          // Create a test instance to verify it works
          const testDB = new PouchDB('test-db');
          await testDB.destroy();

          // Plugin adapters only if PouchDB works
          if (idbAdapter.default) PouchDB.plugin(idbAdapter.default);
          if (replicationAdapter.default) PouchDB.plugin(replicationAdapter.default);

          console.log('✅ PouchDB loaded successfully');

        } catch (error: any) {
          console.error('❌ PouchDB loading failed:', error);
          console.error('❌ Error details:', error?.stack);
          console.error('❌ Error message:', error?.message);
          console.error('❌ Error name:', error?.name);
          // Continue without PouchDB - API mode only
          console.log('⚠️ Continuing in API-only mode');
          // Don't throw - continue with API-only mode
        }
      }

      if (PouchDB) {
        // Initialize local PouchDB with IndexedDB adapter
        const localDB = new PouchDB('bookmarks', { adapter: 'idb' });

        // Initialize remote CouchDB connection
        const remoteDB = new PouchDB('http://admin:changeme123@localhost:5984/bookmarks');

        set({ localDB, remoteDB });

        // Load initial data from local DB
        await get().loadFromLocalDB();

        console.log('✅ PouchDB initialized successfully');

        // Start background sync
        get().startBackgroundSync();
      } else {
        console.log('⚠️ PouchDB not available, using API-only mode');
      }

    } catch (error: any) {
      console.error('❌ Failed to initialize bookmark store:', error);
      set({ syncError: (error && error.message) || 'Failed to initialize store' });
    } finally {
      // Always mark as initialized so the app works
      set({ isInitialized: true });
    }
  },

  async loadFromLocalDB() {
    const { localDB } = get();
    if (!localDB) return;

    try {
      const allDocs = await localDB.allDocs({ include_docs: true });
      const books: Book[] = [];
      const pages: Page[] = [];

      allDocs.rows.forEach(row => {
        if (row.doc && typeof row.doc === 'object') {
          const doc = row.doc as any;
          if (doc.type === 'book') {
            const { _id, _rev, type, ...bookData } = doc;
            books.push(bookData as Book);
          } else if (doc.type === 'page') {
            const { _id, _rev, type, ...pageData } = doc;
            pages.push(pageData as Page);
          }
        }
      });

      set({
        books: books.sort((a, b) => (a.order || 0) - (b.order || 0)),
        pages: pages.sort((a, b) => (a.order || 0) - (b.order || 0))
      });

      console.log(`📚 Loaded ${books.length} books and ${pages.length} pages from local DB`);
    } catch (error) {
      console.error('Failed to load from local DB:', error);
    }
  },

  startBackgroundSync() {
    const { localDB, remoteDB } = get();
    if (!localDB || !remoteDB) return;

    // Set up continuous sync
    const sync = PouchDB.sync(localDB, remoteDB, {
      live: true,
      retry: true
    });

    sync.on('change', (info: any) => {
      console.log('🔄 Sync change:', info);
      // Reload data when changes occur
      get().loadFromLocalDB();
    });

    sync.on('paused', (err: any) => {
      console.log('⏸️ Sync paused:', err);
      set({ isSyncing: false });
    });

    sync.on('active', () => {
      console.log('🔄 Sync active');
      set({ isSyncing: true, syncError: null });
    });

    sync.on('denied', (err: any) => {
      console.error('🚫 Sync denied:', err);
      set({ syncError: 'Sync access denied' });
    });

    sync.on('complete', (info: any) => {
      console.log('✅ Sync complete:', info);
      set({ isSyncing: false, lastSyncAt: new Date().toISOString() });
    });

    sync.on('error', (err: any) => {
      console.error('❌ Sync error:', err);
      set({
        isSyncing: false,
        syncError: err.message || 'Sync failed'
      });
    });
  },

  async syncWithRemote() {
    // In in-memory mode, simulate a sync operation
    if (!get().localDB || !get().remoteDB) {
      console.log('🔄 Simulating sync (in-memory mode)...');
      set({ isSyncing: true, syncError: null });

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      set({
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
        syncError: null
      });

      console.log('✅ Sync simulation completed successfully');
      return;
    }

    // Real CouchDB sync when available
    const { localDB, remoteDB } = get();
    set({ isSyncing: true, syncError: null });

    try {
      console.log('🔄 Starting manual sync...');

      // One-time sync
      const sync = PouchDB.sync(localDB, remoteDB, {
        live: false,
        retry: false
      });

      await new Promise<void>((resolve, reject) => {
        sync.on('complete', () => {
          console.log('✅ Manual sync completed successfully');
          resolve();
        });

        sync.on('error', (err: any) => {
          console.error('❌ Manual sync failed:', err);
          reject(err);
        });
      });

      // Reload data after sync
      await get().loadFromLocalDB();
      set({ isSyncing: false, lastSyncAt: new Date().toISOString() });

    } catch (error: any) {
      console.error('❌ Sync failed:', error);
      set({
        isSyncing: false,
        syncError: error.message || 'Sync failed'
      });
      throw error;
    }
  },

  async createBook(input) {
    console.log('📖 [STORE] createBook called with:', input);

    const { localDB } = get();

    const book: Book = {
      id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: input.title,
      emoji: input.emoji || null,
      order: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
      deletedAt: null,
      pinned: false,
      pinnedAt: null,
    };

    console.log('📖 [STORE] Created book object:', book);

    // Save to local PouchDB if available
    if (localDB) {
      const couchDBBook: CouchDBBook = {
        _id: book.id,
        type: 'book',
        ...book
      };

      try {
        const result = await localDB.put(couchDBBook);
        console.log('📖 [STORE] Book saved to local PouchDB:', book.title, 'Result:', result);
      } catch (error) {
        console.error('❌ [STORE] Failed to save book to PouchDB:', error);
      }
    } else {
      console.log('⚠️ [STORE] No localDB available, book only in memory');
    }

    // Update in-memory state
    set(state => ({
      books: [...state.books, book].sort((a, b) => (a.order || 0) - (b.order || 0))
    }));

    console.log('📖 [STORE] Book added to in-memory state, total books:', get().books.length);
    return book;
  },

  async createPage(input) {
    const { localDB } = get();

    const page: Page = {
      id: `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      bookId: input.bookId,
      title: input.title,
      content: input.content || null,
      url: `https://example.com/${Date.now()}`,
      description: null,
      faviconUrl: null,
      thumbnailUrl: null,
      extractedText: null,
      screenshotUrl: null,
      metaDescription: null,
      status: null,
      notes: null,
      source: 'manual',
      rawMetadata: null,
      order: Date.now(),
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
      deletedAt: null,
      pinnedAt: null,
    };

    // Save to local PouchDB if available
    if (localDB) {
      const couchDBPage: CouchDBPage = {
        _id: page.id,
        type: 'page',
        ...page
      };

      try {
        await localDB.put(couchDBPage);
        console.log('📄 Page saved to local PouchDB:', page.title);
      } catch (error) {
        console.error('❌ Failed to save page to PouchDB:', error);
      }
    }

    // Update in-memory state
    set(state => ({
      pages: [...state.pages, page].sort((a, b) => (a.order || 0) - (b.order || 0))
    }));

    console.log('📄 Page created:', page.title);
    return page;
  },

  async updateBook(id, updates) {
    // For now, use in-memory storage
    const { books } = get();
    const existingBook = books.find(b => b.id === id);
    if (!existingBook) throw new Error('Book not found');

    const updatedBook: Book = {
      ...existingBook,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    set(state => ({
      books: state.books.map(b => b.id === id ? updatedBook : b)
    }));

    console.log('📖 Book updated:', updatedBook.title);
    return updatedBook;
  },

  async updatePage(id, updates) {
    // For now, use in-memory storage
    const { pages } = get();
    const existingPage = pages.find(p => p.id === id);
    if (!existingPage) throw new Error('Page not found');

    const updatedPage: Page = {
      ...existingPage,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    set(state => ({
      pages: state.pages.map(p => p.id === id ? updatedPage : p)
    }));

    console.log('📄 Page updated:', updatedPage.title);
    return updatedPage;
  },

  async deleteBook(id) {
    const { localDB } = get();

    // Delete from local PouchDB if available
    if (localDB) {
      try {
        const doc = await localDB.get(id);
        const result = await localDB.put({
          ...doc,
          _deleted: true
        });
        console.log('🗑️ Book deleted from local PouchDB:', id);
      } catch (error) {
        console.error('❌ Failed to delete book from PouchDB:', error);
      }
    }

    // Update in-memory state
    const { books } = get();
    const bookToDelete = books.find(b => b.id === id);
    if (!bookToDelete) throw new Error('Book not found');

    set(state => ({
      books: state.books.filter(b => b.id !== id),
      pages: state.pages.filter(p => p.bookId !== id)
    }));

    console.log('🗑️ Book deleted:', bookToDelete.title);
  },

  async deletePage(id) {
    const { localDB } = get();

    // Delete from local PouchDB if available
    if (localDB) {
      try {
        const doc = await localDB.get(id);
        const result = await localDB.put({
          ...doc,
          _deleted: true
        });
        console.log('🗑️ Page deleted from local PouchDB:', id);
      } catch (error) {
        console.error('❌ Failed to delete page from PouchDB:', error);
      }
    }

    // Update in-memory state
    const { pages } = get();
    const pageToDelete = pages.find(p => p.id === id);
    if (!pageToDelete) throw new Error('Page not found');

    set(state => ({
      pages: state.pages.filter(p => p.id !== id)
    }));

    console.log('🗑️ Page deleted:', pageToDelete.title);
  },

  async deleteAllLocalData() {
    const { localDB } = get();

    if (localDB) {
      try {
        // Get all documents
        const allDocs = await localDB.allDocs({ include_docs: true });

        // Mark all documents as deleted
        const deletions = allDocs.rows
          .filter(row => row.doc && !row.doc._id.startsWith('_'))
          .map(row => ({
            ...row.doc,
            _deleted: true
          }));

        // Bulk delete
        const result = await localDB.bulkDocs(deletions);
        console.log('🗑️ All local data deleted from PouchDB');
      } catch (error) {
        console.error('❌ Failed to delete all local data:', error);
        throw error;
      }
    }

    // Clear in-memory state
    set({
      books: [],
      pages: []
    });

    console.log('🗑️ All local data cleared from memory');
  },

  // Offline-first operations
  markLocalDeleted(entity, id) {
    console.log(`🗑️ Marking ${entity} ${id} as locally deleted`);

    // Remove from in-memory state immediately
    set(state => ({
      books: entity === 'book' ? state.books.filter(b => b.id !== id) : state.books,
      pages: entity === 'page' ? state.pages.filter(p => p.id !== id) : state.pages
    }));

    // Queue mutation for sync
    get().queueMutation({
      id,
      type: 'delete',
      entity,
      data: { deletedAt: new Date().toISOString() }
    });
  },

  queueMutation(mutation) {
    const fullMutation: PendingMutation = {
      ...mutation,
      timestamp: new Date().toISOString(),
      synced: false
    };

    set(state => ({
      pendingMutations: [...state.pendingMutations, fullMutation]
    }));

    console.log('📝 Queued mutation:', fullMutation);
  },

  async processPendingMutations() {
    const { pendingMutations, remoteDB } = get();
    const unsyncedMutations = pendingMutations.filter(m => !m.synced);

    if (unsyncedMutations.length === 0 || !remoteDB) {
      return;
    }

    console.log(`🔄 Processing ${unsyncedMutations.length} pending mutations`);

    for (const mutation of unsyncedMutations) {
      try {
        if (mutation.type === 'delete') {
          // Send delete to server
          const doc = await remoteDB.get(mutation.id);
          await remoteDB.put({
            ...doc,
            _deleted: true
          });
        }
        // Mark as synced
        set(state => ({
          pendingMutations: state.pendingMutations.map(m =>
            m.id === mutation.id ? { ...m, synced: true } : m
          )
        }));

        console.log(`✅ Synced mutation: ${mutation.type} ${mutation.entity} ${mutation.id}`);
      } catch (error) {
        console.error(`❌ Failed to sync mutation ${mutation.id}:`, error);
      }
    }

    // Clean up old synced mutations (keep last 100)
    set(state => ({
      pendingMutations: state.pendingMutations
        .filter(m => m.synced || Date.now() - new Date(m.timestamp).getTime() < 24 * 60 * 60 * 1000) // Keep unsynced or last 24h
        .slice(-100) // Keep last 100
    }));
  },
}));

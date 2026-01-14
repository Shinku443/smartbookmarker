// apps/web/src/store/useBookmarksStore.ts
// CouchDB-based bookmark manager with offline-first replication

import { create } from "zustand";

// Dynamic imports for PouchDB to work in browser
let PouchDB: any = null;

// Simple toast notification system (copied from SyncDebugPanel)
let toastTimeouts: NodeJS.Timeout[] = [];

const showToast = (message: string, duration = 3000) => {
  // Clear existing toasts
  toastTimeouts.forEach(clearTimeout);
  toastTimeouts = [];

  // Create toast element
  const existingToast = document.getElementById('sync-debug-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'sync-debug-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10000;
    max-width: 300px;
    word-wrap: break-word;
  `;

  document.body.appendChild(toast);

  // Auto remove after duration
  const timeout = setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
    toastTimeouts = toastTimeouts.filter(t => t !== timeout);
  }, duration);

  toastTimeouts.push(timeout);
};

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
  syncPaused: boolean;

  // Pending mutations for offline-first behavior
  pendingMutations: PendingMutation[];

  // CouchDB operations
  initializeCouchDB: () => Promise<void>;
  syncWithRemote: () => Promise<void>;
  syncLocalStorageToCouchDB: () => Promise<void>;
  loadFromLocalDB: () => Promise<void>;
  startBackgroundSync: () => void;
  pauseSync: () => void;
  resumeSync: () => void;

  // CRUD operations
  createBook: (input: { title: string; emoji?: string | null }) => Promise<Book>;
  createPage: (input: { bookId: string; title: string; content?: string }) => Promise<Page>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<Book>;
  updatePage: (id: string, updates: Partial<Page>) => Promise<Page>;
  deleteBook: (id: string) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  deleteAllLocalData: () => Promise<void>;
  deleteLocalDataOnly: () => Promise<void>;
  resetAccount: () => Promise<void>;

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
  syncPaused: false,
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
    const { localDB, remoteDB, syncPaused } = get();
    if (!localDB || !remoteDB || syncPaused) return;

    // Set up continuous sync
    const sync = PouchDB.sync(localDB, remoteDB, {
      live: true,
      retry: true
    });

    // Store the sync object for pause/resume functionality
    (get() as any).currentSync = sync;

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

  pauseSync() {
    console.log('⏸️ [SYNC] User requested to pause background sync');
    set({ syncPaused: true });
    showToast('⏸️ Background sync paused');

    // Cancel any currently running sync
    const store = get() as any;
    if (store.currentSync) {
      console.log('⏸️ [SYNC] Canceling active sync process');
      store.currentSync.cancel();
      store.currentSync = null;
    }
  },

  resumeSync() {
    console.log('▶️ [SYNC] User requested to resume background sync');
    set({ syncPaused: false });
    showToast('▶️ Background sync resumed');
    // Restart the background sync
    get().startBackgroundSync();
  },

  async syncWithRemote() {
    console.log('🔄 [SYNC] Manual sync triggered');

    // Check if we have real PouchDB or just simulation
    const hasPouchDB = get().localDB && get().remoteDB;
    console.log('🔄 [SYNC] PouchDB available:', hasPouchDB);

    if (!hasPouchDB) {
      console.log('⚠️ [SYNC] PouchDB not available - syncing localStorage data to CouchDB API');

      // Sync localStorage data to CouchDB API directly
      await get().syncLocalStorageToCouchDB();
      return;
    }

    // Real PouchDB sync
    console.log('🔄 [SYNC] Processing pending mutations...');
    await get().processPendingMutations();

    const { localDB, remoteDB } = get();
    set({ isSyncing: true, syncError: null });

    try {
      console.log('🔄 [SYNC] Starting manual CouchDB sync...');
      console.log('🔄 [SYNC] Local DB ready:', !!localDB);
      console.log('🔄 [SYNC] Remote DB ready:', !!remoteDB);

      // Test remote connection first
      try {
        console.log('🔄 [SYNC] Testing remote connection...');
        const remoteInfo = await remoteDB!.info();
        console.log('✅ [SYNC] Remote connection OK:', remoteInfo);
      } catch (connError: any) {
        console.error('❌ [SYNC] Remote connection failed:', connError);
        throw new Error(`Remote connection failed: ${connError.message}`);
      }

      // One-time sync
      console.log('🔄 [SYNC] Starting PouchDB sync...');
      const sync = PouchDB.sync(localDB, remoteDB, {
        live: false,
        retry: false
      });

      await new Promise<void>((resolve, reject) => {
        sync.on('complete', (info: any) => {
          console.log('✅ [SYNC] PouchDB sync completed:', info);
          resolve();
        });

        sync.on('error', (err: any) => {
          console.error('❌ [SYNC] PouchDB sync failed:', err);
          reject(err);
        });

        sync.on('change', (change: any) => {
          console.log('🔄 [SYNC] PouchDB sync change:', change);
        });
      });

      console.log('✅ [SYNC] Manual sync completed successfully');

      // Reload data after sync
      console.log('🔄 [SYNC] Reloading local data...');
      await get().loadFromLocalDB();

      set({ isSyncing: false, lastSyncAt: new Date().toISOString() });
      console.log('✅ [SYNC] All operations completed');

    } catch (error: any) {
      console.error('❌ [SYNC] Sync failed:', error);
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

    // Queue mutation for sync
    get().queueMutation({
      id: book.id,
      type: 'create',
      entity: 'book'
    });

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

    // Queue mutation for sync
    get().queueMutation({
      id: page.id,
      type: 'create',
      entity: 'page'
    });

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

  // Delete functions
  async deleteLocalDataOnly() {
    try {
      console.log('🗑️ Deleting only local bookmark data (books/pages), keeping settings...');

      // Clear bookmark data from localStorage only
      console.log('🗑️ Clearing bookmark data from localStorage...');
      localStorage.removeItem('emperor_library');
      console.log('✅ Bookmark data cleared from localStorage');

      // Clear the entire CouchDB store (if available)
      console.log('🗑️ Clearing CouchDB store...');
      await get().deleteAllLocalData();
      console.log('✅ CouchDB store cleared');

      // Trigger page reload to refresh the main app
      console.log('🔄 Reloading page to refresh UI...');
      window.location.reload();

      showToast('🗑️ Local bookmark data deleted - page will reload');
    } catch (error: unknown) {
      console.error('❌ Failed to delete local bookmark data:', error);
      showToast(`❌ Delete local failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  async resetAccount() {
    try {
      console.log('🔄 Resetting account - deleting all local data AND settings...');

      // Clear ALL localStorage data (including settings)
      console.log('🗑️ Clearing ALL localStorage data...');
      localStorage.clear();
      console.log('✅ All localStorage data cleared');

      // Clear the entire CouchDB store (if available)
      console.log('🗑️ Clearing CouchDB store...');
      await get().deleteAllLocalData();
      console.log('✅ CouchDB store cleared');

      // Trigger page reload to refresh the main app
      console.log('🔄 Reloading page to refresh UI...');
      window.location.reload();

      showToast('🔄 Account reset - all data cleared, page will reload');
    } catch (error: unknown) {
      console.error('❌ Failed to reset account:', error);
      showToast(`❌ Reset account failed: ${error instanceof Error ? error.message : String(error)}`);
    }
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
    const { pendingMutations, remoteDB, localDB } = get();
    const unsyncedMutations = pendingMutations.filter(m => !m.synced);

    if (unsyncedMutations.length === 0 || !remoteDB || !localDB) {
      return;
    }

    console.log(`🔄 Processing ${unsyncedMutations.length} pending mutations`);

    // ⭐ LOCAL-FIRST RULE: Push local changes to remote first
    for (const mutation of unsyncedMutations) {
      try {
        if (mutation.type === 'create') {
          // Push new local items to remote
          const localDoc = await localDB.get(mutation.id);
          await remoteDB.put(localDoc);
          console.log(`📤 Pushed ${mutation.entity} ${mutation.id} to remote`);
        } else if (mutation.type === 'update') {
          // Push local updates to remote
          const localDoc = await localDB.get(mutation.id);
          await remoteDB.put(localDoc);
          console.log(`📤 Pushed ${mutation.entity} ${mutation.id} update to remote`);
        } else if (mutation.type === 'delete') {
          // Send tombstone to remote
          const localDoc = await localDB.get(mutation.id);
          await remoteDB.put({
            ...localDoc,
            _deleted: true,
            deletedAt: mutation.data?.deletedAt || new Date().toISOString()
          });
          console.log(`🗑️ Pushed ${mutation.entity} ${mutation.id} tombstone to remote`);
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

    // ⭐ LOCAL-FIRST RULE: Then pull remote changes and merge
    try {
      console.log('🔄 Pulling remote changes and merging...');

      // Get all remote documents
      const remoteDocs = await remoteDB.allDocs({ include_docs: true });

      for (const row of remoteDocs.rows) {
        if (!row.doc || row.doc._id.startsWith('_')) continue;

        const remoteDoc = row.doc as any;
        const localDoc = await localDB.get(remoteDoc._id).catch(() => null) as any;

        if (!localDoc) {
          // ⭐ LOCAL-FIRST: Remote has item, local doesn't → pull it
          await localDB.put(remoteDoc);
          console.log(`📥 Pulled ${remoteDoc.type} ${remoteDoc._id} from remote`);
        } else if (remoteDoc._deleted && !localDoc._deleted) {
          // Remote has tombstone, local doesn't → check timestamps
          const remoteDeletedAt = new Date(remoteDoc.deletedAt || 0);
          const localUpdatedAt = new Date(localDoc.updatedAt || 0);

          if (remoteDeletedAt > localUpdatedAt) {
            // ⭐ Delete wins: apply tombstone
            await localDB.put({
              ...localDoc,
              _deleted: true,
              deletedAt: remoteDoc.deletedAt
            });
            console.log(`🗑️ Applied remote tombstone for ${remoteDoc._id}`);
          } else {
            // ⭐ Local wins: resurrect by pushing local version
            await remoteDB.put(localDoc);
            console.log(`🔄 Local ${remoteDoc._id} resurrected (newer than remote delete)`);
          }
        } else if (!remoteDoc._deleted && localDoc._deleted) {
          // Local has tombstone, remote doesn't → check timestamps
          const localDeletedAt = new Date(localDoc.deletedAt || 0);
          const remoteUpdatedAt = new Date(remoteDoc.updatedAt || 0);

          if (remoteUpdatedAt > localDeletedAt) {
            // ⭐ Remote wins: resurrect locally
            await localDB.put(remoteDoc);
            console.log(`🔄 Remote ${remoteDoc._id} resurrected locally`);
          } else {
            // ⭐ Local delete wins: push tombstone
            await remoteDB.put({
              ...remoteDoc,
              _deleted: true,
              deletedAt: localDoc.deletedAt
            });
            console.log(`🗑️ Local tombstone pushed for ${remoteDoc._id}`);
          }
        } else if (!remoteDoc._deleted && !localDoc._deleted) {
          // Both exist and not deleted → compare timestamps
          const remoteTime = new Date(remoteDoc.updatedAt || 0);
          const localTime = new Date(localDoc.updatedAt || 0);

          if (remoteTime > localTime) {
            // Remote is newer → pull it
            await localDB.put(remoteDoc);
            console.log(`📥 Updated ${remoteDoc._id} from remote (newer)`);
          } else if (localTime > remoteTime) {
            // Local is newer → push it
            await remoteDB.put(localDoc);
            console.log(`📤 Updated ${remoteDoc._id} to remote (newer)`);
          }
        }
      }

      console.log('✅ Sync merge completed');
    } catch (error) {
      console.error('❌ Failed to pull and merge remote changes:', error);
    }

    // Clean up old synced mutations (keep last 100)
    set(state => ({
      pendingMutations: state.pendingMutations
        .filter(m => m.synced || Date.now() - new Date(m.timestamp).getTime() < 24 * 60 * 60 * 1000) // Keep unsynced or last 24h
        .slice(-100) // Keep last 100
    }));

    // Reload data after sync
    await get().loadFromLocalDB();
  },

  // Sync localStorage data to CouchDB API (when PouchDB is not available)
  async syncLocalStorageToCouchDB() {
    console.log('🔄 [SYNC] Syncing localStorage data to/from CouchDB API...');

    // Import the localStorage functions
    const { loadBookmarks, saveBookmarks } = await import('../storage/webStorage');

    try {
      // Load data from localStorage
      const localData = await loadBookmarks();
      console.log('📚 Loaded local data:', {
        books: localData.books?.length || 0,
        bookmarks: localData.bookmarks?.length || 0
      });

      // FIRST: Push local data to CouchDB (if any exists)
      // Convert and sync books
      if (localData.books && localData.books.length > 0) {
        console.log('📖 Syncing books to CouchDB...');

        // First, get all existing books from CouchDB to check for duplicates
        let existingBooks: any[] = [];
        try {
          const allBooksResponse = await fetch('http://localhost:4000/books');
          if (allBooksResponse.ok) {
            const allBooksData = await allBooksResponse.json();
            existingBooks = allBooksData.books || [];
            console.log(`📋 Found ${existingBooks.length} existing books in CouchDB`);
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch existing books:', error);
        }

        for (const book of localData.books) {
          try {
            // Check if book already exists by title (not ID, since IDs differ)
            const existingBook = existingBooks.find(b => b.title === book.name);

            if (!existingBook) {
              // Book doesn't exist, create it
              const createResponse = await fetch('http://localhost:4000/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: book.name,
                  emoji: book.icon || null
                })
              });

              if (createResponse.ok) {
                console.log(`✅ Synced book: ${book.name}`);
              } else {
                const errorText = await createResponse.text();
                console.warn(`⚠️ Failed to sync book: ${book.name} - ${createResponse.status}: ${errorText}`);
              }
            } else {
              console.log(`ℹ️ Book already exists: ${book.name}`);
            }
          } catch (error) {
            console.warn(`⚠️ Error syncing book ${book.name}:`, error);
          }
        }
      }

      // Convert and sync pages (bookmarks)
      if (localData.bookmarks && localData.bookmarks.length > 0) {
        console.log('📄 Syncing pages to CouchDB...');

        // First, get all existing pages from CouchDB to check for duplicates
        let existingPages: any[] = [];
        try {
          const allPagesResponse = await fetch('http://localhost:4000/pages');
          if (allPagesResponse.ok) {
            const allPagesData = await allPagesResponse.json();
            existingPages = allPagesData.pages || [];
            console.log(`📋 Found ${existingPages.length} existing pages in CouchDB`);
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch existing pages:', error);
        }

        for (const bookmark of localData.bookmarks) {
          try {
            // Check if page already exists by title AND URL (since IDs differ)
            const existingPage = existingPages.find(p =>
              p.title === bookmark.title && p.url === bookmark.url
            );

            if (!existingPage) {
              // Page doesn't exist, create it
              const createResponse = await fetch('http://localhost:4000/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: bookmark.title,
                  url: bookmark.url,
                  bookId: bookmark.bookId || null,
                  content: bookmark.extractedText || bookmark.description || null,
                  tags: bookmark.tags?.map(t => t.label) || []
                })
              });

              if (createResponse.ok) {
                console.log(`✅ Synced page: ${bookmark.title}`);
              } else {
                const errorText = await createResponse.text();
                console.warn(`⚠️ Failed to sync page: ${bookmark.title} - ${createResponse.status}: ${errorText}`);
              }
            } else {
              console.log(`ℹ️ Page already exists: ${bookmark.title}`);
            }
          } catch (error) {
            console.warn(`⚠️ Error syncing page ${bookmark.title}:`, error);
          }
        }
      }

      // SECOND: Pull data from CouchDB and update localStorage
      console.log('🔄 [SYNC] Pulling latest data from CouchDB...');

      // Fetch all books from CouchDB
      let couchdbBooks: any[] = [];
      try {
        const booksResponse = await fetch('http://localhost:4000/books');
        if (booksResponse.ok) {
          const booksData = await booksResponse.json();
          couchdbBooks = booksData.books || [];
          console.log(`📖 Pulled ${couchdbBooks.length} books from CouchDB`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch books from CouchDB:', error);
      }

      // Fetch all pages from CouchDB
      let couchdbPages: any[] = [];
      try {
        const pagesResponse = await fetch('http://localhost:4000/pages');
        if (pagesResponse.ok) {
          const pagesData = await pagesResponse.json();
          couchdbPages = pagesData.pages || [];
          console.log(`📄 Pulled ${couchdbPages.length} pages from CouchDB`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch pages from CouchDB:', error);
      }

      // Convert CouchDB data to local storage format
      const syncedData = {
        bookmarks: couchdbPages.map((page: any) => ({
          id: page.id,
          title: page.title,
          url: page.url,
          description: page.description || null,
          faviconUrl: page.faviconUrl || null,
          thumbnailUrl: page.thumbnailUrl || null,
          extractedText: page.extractedText || null,
          screenshotUrl: page.screenshotUrl || null,
          metaDescription: page.metaDescription || null,
          status: page.status || null,
          notes: page.notes || null,
          source: page.source || 'manual',
          rawMetadata: page.rawMetadata || null,
          bookId: page.bookId || null,
          tags: page.tags || [],
          order: page.order || Date.now(),
          pinned: page.pinned || false,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          deleted: page.deleted || false,
          deletedAt: page.deletedAt || null,
          pinnedAt: page.pinnedAt || null,
          content: page.content || null
        })),
        books: couchdbBooks.map((book: any) => ({
          id: book.id,
          title: book.title,
          emoji: book.emoji || null,
          order: book.order || Date.now(),
          createdAt: book.createdAt,
          updatedAt: book.updatedAt,
          deleted: book.deleted || false,
          deletedAt: book.deletedAt || null,
          pinned: book.pinned || false,
          pinnedAt: book.pinnedAt || null,
          parentBookId: book.parentBookId || null,
          name: book.title, // Add name for compatibility
          icon: book.emoji || null // Add icon for compatibility
        })),
        rootOrder: couchdbBooks
          .filter((book: any) => !book.pinned)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          .map((book: any) => book.id),
        pinnedOrder: couchdbBooks
          .filter((book: any) => book.pinned)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          .map((book: any) => book.id)
      };

      // Save the synced data to localStorage
      await saveBookmarks(syncedData);
      console.log('💾 Updated localStorage with CouchDB data');

      // Update in-memory state
      set({
        books: syncedData.books,
        pages: syncedData.bookmarks,
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
        syncError: null
      });

      // Notify other components (like useBookmarks hook) to reload data
      window.dispatchEvent(new CustomEvent('bookmarks-reload'));

      console.log('✅ [SYNC] LocalStorage sync to/from CouchDB completed');
      console.log(`📊 Final state: ${syncedData.books.length} books, ${syncedData.bookmarks.length} pages`);

    } catch (error: any) {
      console.error('❌ [SYNC] Failed to sync localStorage to/from CouchDB:', error);
      set({
        isSyncing: false,
        syncError: error.message || 'Sync failed'
      });
      throw error;
    }
  },
}));

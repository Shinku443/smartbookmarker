import React, { useState } from "react";
import { useBookmarks } from "../hooks/useBookmarks";
import { useBookmarksStore } from "../store/useBookmarksStore";
import type { RichBookmark } from "../models/RichBookmark";

// Simple toast notification system
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

type Props = {
  books: any[];
  bookmarks: RichBookmark[];
  onCreateBook: (parentId: string | null, name: string) => void;
  onCreatePage: (title: string, url: string, description: string | null, bookId: string | null, tags?: string[]) => Promise<void>;
};

export function SyncDebugPanel({ books: propBooks, bookmarks, onCreateBook, onCreatePage }: Props) {
  // Get real data from the CouchDB store
  const { books: realBooks, pages: realPages } = useBookmarksStore();
  const books = realBooks; // Use real books from store
  const pages = realPages; // Use real pages from store

  // Use the CouchDB store for sync functionality
  const { syncWithRemote } = useBookmarksStore();

  // Function to trigger sync after API operations
  const triggerSync = async () => {
    try {
      await syncWithRemote();
      console.log('✅ Sync triggered successfully after API operation');
    } catch (error) {
      console.error('❌ Sync failed after API operation:', error);
    }
  };

  // Debug: Log when component re-renders with detailed data
  console.log('🔄 [SyncDebugPanel] Re-rendering with books:', books.length, 'pages:', pages.length);
  console.log('📊 [SyncDebugPanel] Books data:', books.map(b => ({ id: b.id, title: b.title })));
  console.log('📊 [SyncDebugPanel] Pages data:', pages.slice(-3).map(p => ({ id: p.id, title: p.title, bookId: p.bookId })));

  // Use the same functions passed from App
  const createBook = async (input: { title: string; emoji?: string | null }) => {
    onCreateBook(null, input.title); // null = root level
  };

  const createPage = async (input: { bookId: string; title: string; content?: string }) => {
    // Create with a dummy URL to ensure it shows up in UI
    const dummyUrl = `https://example.com/${Date.now()}`;
    await onCreatePage(input.title, dummyUrl, null, input.bookId || null, []);
  };

  // Backend API functions for CouchDB
  const createBookViaAPI = async () => {
    try {
      const title = generateRandomTitle();
      console.log('🔄 Creating book via CouchDB API:', title);

      // Call the books API directly (bypass proxy for now)
      const response = await fetch('http://localhost:4000/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          emoji: null
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Book created via API:', result);

      // Trigger sync to bring new data into local store
      await triggerSync();

      showToast(`✅ Book created in CouchDB: ${title}\nCheck http://localhost:5984/_utils/ to verify`);
    } catch (error: unknown) {
      console.error('❌ Failed to create book via API:', error);
      showToast(`❌ API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const createPageViaAPI = async () => {
    try {
      let bookId: string | null = null;
      let bookTitle = '';

      if (books.length > 0) {
        // Add to a random existing book
        const randomBook = books[Math.floor(Math.random() * books.length)];
        bookId = randomBook.id;
        bookTitle = randomBook.title;
      }

      const pageTitle = generateRandomTitle();
      const dummyUrl = `https://example.com/${Date.now()}`;

      console.log('🔄 Creating page via CouchDB API:', pageTitle);

      const response = await fetch('http://localhost:4000/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pageTitle,
          url: dummyUrl,
          bookId,
          content: null
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Page created via API:', result);

      // Trigger sync to bring new data into local store
      await triggerSync();

      showToast(`✅ Page created in CouchDB: ${pageTitle}\nCheck http://localhost:5984/_utils/ to verify`);
    } catch (error: unknown) {
      console.error('❌ Failed to create page via API:', error);
      showToast(`❌ API Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Get delete functions from store
  const { markLocalDeleted } = useBookmarksStore();

  // Delete functions
  const deleteLocalData = async () => {
    try {
      console.log('🗑️ Deleting all local data (offline-first)...');

      // Use offline-first delete: mark as deleted locally and queue for sync
      const booksToDelete = [...books];
      for (const book of booksToDelete) {
        markLocalDeleted('book', book.id);
        console.log(`🗑️ Marked local book as deleted: ${book.title}`);
      }

      // Delete all pages from local store
      const pagesToDelete = [...pages];
      for (const page of pagesToDelete) {
        markLocalDeleted('page', page.id);
        console.log(`🗑️ Marked local page as deleted: ${page.title}`);
      }

      showToast('🗑️ All local data marked for deletion');
    } catch (error: unknown) {
      console.error('❌ Failed to delete local data:', error);
      showToast(`❌ Delete local failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const deleteBackendData = async () => {
    try {
      console.log('🔄 Deleting all backend data (fetching fresh list)...');

      let totalDeleted = 0;
      let totalErrors = 0;

      // Function to delete all items of a type
      const deleteAllItems = async (endpoint: string, itemType: string) => {
        try {
          console.log(`🗑️ Fetching current ${itemType} list from backend...`);

          // Fetch fresh list from backend
          const response = await fetch(`http://localhost:4000/${endpoint}`, {
            method: 'GET'
          });

          if (!response.ok) {
            console.warn(`⚠️ Failed to fetch ${itemType} list:`, response.status);
            return;
          }

          const data = await response.json();
          const items = data[endpoint] || [];
          console.log(`📋 Found ${items.length} ${itemType} to delete`);

          // Delete each item
          for (const item of items) {
            try {
              const deleteResponse = await fetch(`http://localhost:4000/${endpoint}/${item.id}`, {
                method: 'DELETE'
              });

              if (deleteResponse.ok) {
                console.log(`✅ Deleted ${itemType}: ${item.title || item.name || item.id}`);
                totalDeleted++;
              } else if (deleteResponse.status === 404) {
                console.log(`ℹ️ ${itemType} already deleted: ${item.id}`);
                totalDeleted++; // Count as deleted even if already gone
              } else {
                console.warn(`⚠️ Failed to delete ${itemType} ${item.id}:`, deleteResponse.status);
                totalErrors++;
              }
            } catch (error) {
              console.warn(`⚠️ Error deleting ${itemType} ${item.id}:`, error);
              totalErrors++;
            }
          }
        } catch (error) {
          console.error(`❌ Failed to delete ${itemType}:`, error);
        }
      };

      // Delete all books and pages
      await deleteAllItems('books', 'books');
      await deleteAllItems('pages', 'pages');

      // Trigger sync to update local store
      await triggerSync();

      const message = totalErrors > 0
        ? `🗑️ Deleted ${totalDeleted} items (${totalErrors} errors)`
        : `🗑️ All backend data deleted (${totalDeleted} items)`;

      showToast(message);
      console.log(`🗑️ Backend delete complete: ${totalDeleted} deleted, ${totalErrors} errors`);
    } catch (error: unknown) {
      console.error('❌ Failed to delete backend data:', error);
      showToast(`❌ Delete failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const deleteAllData = async () => {
    try {
      console.log('🔄 Deleting ALL data (local + backend)...');

      // Delete backend data first
      await deleteBackendData();

      // Delete local data
      deleteLocalData();

      showToast('🗑️ ALL data deleted (local + backend)');
    } catch (error: unknown) {
      console.error('❌ Failed to delete all data:', error);
      showToast(`❌ Delete all failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Use real data from the store
  const { isInitialized, isSyncing, syncError, lastSyncAt, initializeCouchDB } = useBookmarksStore();

  // Mock function for the sync button (different name to avoid conflict)
  const manualSync = async () => {
    try {
      await syncWithRemote();
      showToast('🔄 Manual sync completed');
    } catch (error) {
      showToast('❌ Manual sync failed');
    }
  };

  const [showDetails, setShowDetails] = useState(false);
  const [showRecent, setShowRecent] = useState(false);

  // Random data generation functions
  const generateRandomTitle = () => {
    const adjectives = ['Amazing', 'Fantastic', 'Great', 'Awesome', 'Super', 'Cool', 'Epic', 'Legendary', 'Mighty', 'Powerful'];
    const nouns = ['Project', 'Idea', 'Concept', 'Plan', 'Strategy', 'Journey', 'Adventure', 'Quest', 'Mission', 'Task'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj} ${noun}`;
  };

  const generateRandomEmoji = () => {
    const emojis = ['📚', '📖', '📝', '✨', '🚀', '⭐', '🔥', '💡', '🎯', '🌟'];
    return emojis[Math.floor(Math.random() * emojis.length)];
  };

  const generateRandomContent = () => {
    const contents = [
      'This is some sample content for testing purposes.',
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      'Here is a bookmark with some interesting information.',
      'This page contains useful notes and references.',
      'Sample text for development and testing.'
    ];
    return contents[Math.floor(Math.random() * contents.length)];
  };

  const addRandomBook = async () => {
    try {
      const title = generateRandomTitle();
      onCreateBook(null, title);
      console.log('📖 [SyncDebugPanel] Created book:', title);
      console.log('📊 [SyncDebugPanel] Books after creation:', books.length, books.map(b => b.title));
      showToast(`✅ Created book: ${title}`);
    } catch (error: unknown) {
      console.error('❌ [SyncDebugPanel] Failed to create book:', error);
      showToast(`❌ Failed to create book: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const addRandomPage = async () => {
    try {
      let bookId: string | null = null;
      let bookTitle = '';

      if (books.length > 0) {
        // Add to a random existing book
        const randomBook = books[Math.floor(Math.random() * books.length)];
        bookId = randomBook.id;
        bookTitle = randomBook.title;
      } else {
        // No books, create one first
        const title = generateRandomTitle();
        onCreateBook(null, title);
        // Find the newly created book
        const newBook = books.find(b => b.title === title);
        if (newBook) {
          bookId = newBook.id;
          bookTitle = newBook.title;
        }
        console.log('📖 [SyncDebugPanel] Created book for page:', title);
      }

      const pageTitle = generateRandomTitle();
      const dummyUrl = `https://example.com/${Date.now()}`;
      await onCreatePage(pageTitle, dummyUrl, null, bookId, []);

      console.log('📄 [SyncDebugPanel] Created page:', pageTitle, 'in book:', bookTitle);
      showToast(`✅ Created page: ${pageTitle}`);
    } catch (error: unknown) {
      console.error('❌ [SyncDebugPanel] Failed to create page:', error);
      showToast(`❌ Failed to create page: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="fixed bottom-3 right-3 max-w-xs rounded-md bg-neutral-900/95 text-neutral-100 text-xs shadow-lg border border-neutral-700 p-3 space-y-2 z-50">
      <div className="flex items-center justify-between">
        <span className="font-semibold tracking-wide">CouchDB</span>
        <div className="flex gap-1">
          {!isInitialized && (
            <button
              onClick={initializeCouchDB}
              className="px-2 py-0.5 rounded border border-green-500 hover:bg-green-800 text-green-400"
            >
              Init
            </button>
          )}
          <button
            onClick={syncWithRemote}
            disabled={isSyncing || !isInitialized}
            className="px-2 py-0.5 rounded border border-neutral-500 hover:bg-neutral-800 disabled:opacity-50"
          >
            {isSyncing ? "Syncing…" : "Sync"}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div>
          <span className="text-neutral-400">Status:</span>{" "}
          <span
            className={
              !isInitialized
                ? "text-yellow-400"
                : syncError
                ? "text-red-400"
                : isSyncing
                ? "text-amber-300"
                : "text-emerald-300"
            }
          >
            {!isInitialized ? "Not initialized" : syncError ? "Error" : isSyncing ? "Syncing" : "Ready"}
          </span>
        </div>

        <div>
          <span className="text-neutral-400">Books:</span>{" "}
          <span>{books.length}</span>
        </div>

        <div>
          <span className="text-neutral-400">Pages:</span>{" "}
          <span>{pages.length}</span>
        </div>

        {syncError && (
          <div className="text-red-400">
            Error: <span>{syncError}</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="border-t border-neutral-700 pt-2">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1"
        >
          <span>{showDetails ? "▼" : "▶"}</span>
          <span>Details</span>
        </button>

        {showDetails && (
          <div className="mt-2 space-y-2">
            {/* Local Creation (In-Memory) */}
            <div className="space-y-1">
              <div className="text-neutral-500 text-xs">Local (In-Memory):</div>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={addRandomBook}
                  className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded"
                  title="Add random book locally (in-memory)"
                >
                  + Book
                </button>
                <button
                  onClick={addRandomPage}
                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                  title="Add random page locally (in-memory)"
                >
                  + Page
                </button>
              </div>
            </div>

            {/* Backend Creation (CouchDB API) */}
            <div className="space-y-1">
              <div className="text-neutral-500 text-xs">Backend (CouchDB API):</div>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={createBookViaAPI}
                  className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded"
                  title="Create book directly in CouchDB via API"
                >
                  + Book
                </button>
                <button
                  onClick={createPageViaAPI}
                  className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 rounded"
                  title="Create page directly in CouchDB via API"
                >
                  + Page
                </button>
              </div>
              <div className="text-neutral-400 text-xs">
                Status: 🟢 API endpoints ready
              </div>
            </div>

            {/* Delete Operations */}
            <div className="space-y-1">
              <div className="text-neutral-500 text-xs">Delete Operations:</div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={deleteLocalData}
                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                  title="Delete all local (in-memory) data"
                >
                  Del Local
                </button>
                <button
                  onClick={deleteBackendData}
                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                  title="Delete all backend (CouchDB) data"
                >
                  Del Backend
                </button>
                <button
                  onClick={deleteAllData}
                  className="px-2 py-1 text-xs bg-red-800 hover:bg-red-900 rounded"
                  title="Delete ALL data (local + backend)"
                >
                  Del All
                </button>
              </div>
            </div>

            {/* Recently Created Items (Expandable) */}
            {(books.length > 0 || pages.length > 0) && (
              <div className="space-y-1">
                <button
                  onClick={() => setShowRecent(!showRecent)}
                  className="text-neutral-500 hover:text-neutral-300 text-xs flex items-center gap-1"
                >
                  <span>{showRecent ? "▼" : "▶"}</span>
                  <span>Recently Created ({Math.min(10, books.length + pages.length)})</span>
                </button>

                {showRecent && (
                  <div className="space-y-2">
                    {/* Combined recent items sorted by creation time */}
                    {(() => {
                      const allItems = [
                        ...books.map(book => ({
                          ...book,
                          type: 'book' as const,
                          displayName: book.title,
                          icon: book.emoji || '📖',
                          source: 'local' as 'local' | 'backend' // Can be local or backend
                        })),
                        ...pages.map(page => ({
                          ...page,
                          type: 'page' as const,
                          displayName: page.title,
                          icon: '📄',
                          source: 'local' as 'local' | 'backend' // Can be local or backend
                        }))
                      ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

                      const recentItems = allItems.slice(0, 10);

                      return recentItems.length > 0 ? (
                        <div className="text-neutral-300 text-xs bg-neutral-800 p-2 rounded max-h-32 overflow-y-auto">
                          <div className="font-semibold mb-2">🕐 Recently Created Items:</div>
                          {recentItems.map((item, index) => (
                            <div key={`${item.type}-${item.id}`} className="text-xs mb-1 flex items-center gap-1">
                              <span>{item.icon}</span>
                              <span className="truncate flex-1">{item.displayName}</span>
                              <span className={`text-xs px-1 rounded ${
                                item.source === 'backend' ? 'bg-purple-600' :
                                item.source === 'local' ? 'bg-green-600' : 'bg-neutral-600'
                              }`}>
                                {item.source === 'backend' ? 'API' : item.source === 'local' ? 'Local' : item.source}
                              </span>
                              <span className="text-neutral-500 text-xs">
                                {item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-neutral-500 text-xs bg-neutral-800 p-2 rounded">
                          No items created yet
                        </div>
                      );
                    })()}

                    {/* Separate sections for books and pages */}
                    <div className="grid grid-cols-2 gap-2">
                      {books.length > 0 && (
                        <div className="text-neutral-300 text-xs bg-neutral-800 p-2 rounded max-h-20 overflow-y-auto">
                          <div className="font-semibold mb-1">📚 Books ({books.length}):</div>
                          {books.slice(-3).map((book) => (
                            <div key={book.id} className="text-xs truncate">
                              {book.emoji || '📖'} {book.title}
                            </div>
                          ))}
                        </div>
                      )}

                      {pages.length > 0 && (
                        <div className="text-neutral-300 text-xs bg-neutral-800 p-2 rounded max-h-20 overflow-y-auto">
                          <div className="font-semibold mb-1">📄 Pages ({pages.length}):</div>
                          {pages.slice(-3).map((page) => (
                            <div key={page.id} className="text-xs truncate">
                              {page.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

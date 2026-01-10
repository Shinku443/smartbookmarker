import React, { useState } from "react";
import { useBookmarksStore } from "../store/useBookmarksStore";
import { createBook } from "../api/books";
import { createPage } from "../api/pages";

export function SyncDebugPanel() {
  const syncStatus = useBookmarksStore(s => s.syncStatus);
  const lastSyncAt = useBookmarksStore(s => s.lastSyncAt);
  const syncError = useBookmarksStore(s => s.syncError);
  const lastSyncSummary = useBookmarksStore(s => s.lastSyncSummary);
  const syncEvents = useBookmarksStore(s => s.syncEvents);
  const syncWithServer = useBookmarksStore(s => s.syncWithServer);



  const [showTimeline, setShowTimeline] = useState(false);
  const [showServerOps, setShowServerOps] = useState(false);
  const [serverData, setServerData] = useState<any>(null);
  const [serverStats, setServerStats] = useState<any>(null);

  const isSyncing = syncStatus === "syncing";

  const fetchServerStats = async () => {
    try {
      const res = await fetch('http://localhost:4000/sync/stats');
      const data = await res.json();
      setServerStats(data);
    } catch (error) {
      console.error('Failed to fetch server stats:', error);
    }
  };

  const fetchAllServerData = async () => {
    try {
      const res = await fetch('http://localhost:4000/sync/all-data');
      const data = await res.json();
      setServerData(data);
    } catch (error) {
      console.error('Failed to fetch server data:', error);
    }
  };

  const resetSyncMetadata = async () => {
    if (!confirm('This will reset all sync metadata. Continue?')) return;
    try {
      const res = await fetch('http://localhost:4000/sync/reset', { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Sync metadata reset');
    } catch (error) {
      console.error('Failed to reset sync metadata:', error);
    }
  };

  const clearAllData = async () => {
    if (!confirm('This will DELETE ALL DATA from the server database. This cannot be undone. Continue?')) return;
    try {
      const res = await fetch('http://localhost:4000/sync/clear-all-data', { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'All data cleared');
      // Refresh local data
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear all data:', error);
    }
  };

  const deleteEntity = async (entityType: string, entityId: string) => {
    if (!confirm(`Delete ${entityType} ${entityId}?`)) return;
    try {
      const res = await fetch(`http://localhost:4000/sync/entity/${entityType}/${entityId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchAllServerData(); // Refresh data
      } else {
        alert(data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Failed to delete entity:', error);
    }
  };

  const clearLocalSyncState = () => {
    if (!confirm('Clear local sync state (lastSyncAt, lastSyncedData)?')) return;
    localStorage.removeItem('lastSyncAt');
    localStorage.removeItem('lastSyncedData');
    alert('Local sync state cleared. Refresh the page.');
  };

  const clearAllLocalData = () => {
    if (!confirm('This will DELETE ALL LOCAL DATA from localStorage. This cannot be undone. Continue?')) return;
    localStorage.removeItem('emperor_library');
    alert('All local data cleared. Reloading page...');
    window.location.reload();
  };

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

  const addRandomBookLocal = async () => {
    try {
      // Create new book data
      const now = Date.now();
      const newBook = {
        id: `local-book-${now}`,
        name: generateRandomTitle(),
        icon: generateRandomEmoji(),
        order: [] as string[],
        createdAt: now,
        updatedAt: now,
        parentBookId: null
      };

      // Update localStorage directly
      const existingData = JSON.parse(localStorage.getItem('emperor_library') || '{"bookmarks":[],"books":[],"rootOrder":[],"pinnedOrder":[]}');
      existingData.books.push(newBook);
      existingData.rootOrder.push(newBook.id);
      localStorage.setItem('emperor_library', JSON.stringify(existingData));

      // Reload page to pick up changes
      window.location.reload();

      alert('Random book added locally (will sync when server available)');
    } catch (error: unknown) {
      console.error('Failed to add random book locally:', error);
      alert('Failed to add random book locally: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const addRandomPageLocal = async () => {
    try {
      // Update localStorage directly
      const existingData = JSON.parse(localStorage.getItem('emperor_library') || '{"bookmarks":[],"books":[],"rootOrder":[],"pinnedOrder":[]}');

      let targetBookId: string | null = null;

      // Decide where to add the page: 50/50 chance between existing book or root
      if (existingData.books.length === 0) {
        // No books exist, create a new book for the page
        const now = Date.now();
        const newBook = {
          id: `local-book-${now}`,
          name: generateRandomTitle(),
          icon: generateRandomEmoji(),
          order: [] as string[],
          createdAt: now,
          updatedAt: now,
          parentBookId: null
        };
        existingData.books.push(newBook);
        existingData.rootOrder.push(newBook.id);
        targetBookId = newBook.id;
      } else {
        // Books exist - 50/50 chance: add to random existing book OR to root (bookId: null)
        const rand = Math.random();
        if (rand < 0.5) {
          // Add to a random existing book
          const randomBook = existingData.books[Math.floor(Math.random() * existingData.books.length)];
          targetBookId = randomBook.id;
        } else {
          // Add to root level (bookId: null)
          targetBookId = null;
        }
      }

      // Create new page data
      const pageTimestamp = Date.now();
      const newPage = {
        id: `local-page-${pageTimestamp}`,
        bookId: targetBookId,
        title: generateRandomTitle(),
        url: "",
        createdAt: pageTimestamp,
        updatedAt: pageTimestamp,
        faviconUrl: "",
        tags: [],
        source: "manual",
        pinned: false
      };

      // Update the target book's order to include the new page
      existingData.books = existingData.books.map((book: any) =>
        book.id === targetBookId
          ? { ...book, order: [...(book.order ?? []), newPage.id] }
          : book
      );

      // Add the page
      existingData.bookmarks.push(newPage);

      localStorage.setItem('emperor_library', JSON.stringify(existingData));

      // Reload page to pick up changes
      window.location.reload();

      alert('Random page added locally (will sync when server available)');
    } catch (error: unknown) {
      console.error('Failed to add random page locally:', error);
      alert('Failed to add random page locally: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const addRandomDataOfflineOnly = async () => {
    try {
      // Direct localStorage manipulation for pure offline testing
      const existingData = JSON.parse(localStorage.getItem('emperor_library') || '{"bookmarks":[],"books":[],"rootOrder":[],"pinnedOrder":[]}');

      const newBook = {
        id: `local-book-${Date.now()}`,
        title: generateRandomTitle(),
        emoji: generateRandomEmoji(),
        order: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const newPage = {
        id: `local-page-${Date.now() + 1}`,
        bookId: newBook.id,
        title: generateRandomTitle(),
        url: "",
        content: generateRandomContent(),
        description: null,
        faviconUrl: null,
        thumbnailUrl: null,
        extractedText: null,
        screenshotUrl: null,
        metaDescription: null,
        status: null,
        notes: null,
        source: "manual",
        rawMetadata: null,
        order: Date.now() + 1,
        pinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      existingData.books.push(newBook);
      existingData.bookmarks.push(newPage);
      existingData.rootOrder.push(newBook.id);

      localStorage.setItem('emperor_library', JSON.stringify(existingData));

      // Force a page reload to pick up the localStorage changes
      window.location.reload();

      alert('Random data added directly to localStorage (pure offline - no sync)');
    } catch (error: unknown) {
      console.error('Failed to add offline data:', error);
      alert('Failed to add offline data: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const addRandomBookServer = async () => {
    try {
      const response = await fetch('http://localhost:4000/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generateRandomTitle(),
          emoji: generateRandomEmoji()
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${await response.text()}`);
      }

      const newBook = await response.json();
      alert('Random book added to server');
      fetchAllServerData(); // Refresh server data
    } catch (error: unknown) {
      console.error('Failed to add random book to server:', error);
      alert('Failed to add random book to server: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const addRandomPageServer = async () => {
    try {
      // First fetch server books to get a bookId
      const booksRes = await fetch('http://localhost:4000/books');
      if (!booksRes.ok) {
        throw new Error(`Failed to fetch books: ${booksRes.status}`);
      }
      const books = await booksRes.json();
      let bookId = null;

      // Randomly decide: 1/3 chance for each option
      const rand = Math.random();
      if (rand < 0.33) {
        // Option 1: Create new book and add page to it
        const bookResponse = await fetch('http://localhost:4000/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: generateRandomTitle(),
            emoji: generateRandomEmoji()
          })
        });

        if (!bookResponse.ok) {
          throw new Error(`Failed to create book: ${bookResponse.status}`);
        }

        const newBook = await bookResponse.json();
        bookId = newBook.id;
      } else if (rand < 0.66 && books.length > 0) {
        // Option 2: Add to existing book
        bookId = books[Math.floor(Math.random() * books.length)].id;
      } else {
        // Option 3: Add to top level (bookId = null)
        bookId = null;
      }

      const pageResponse = await fetch('http://localhost:4000/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          title: generateRandomTitle(),
          content: generateRandomContent()
        })
      });

      if (!pageResponse.ok) {
        throw new Error(`Failed to create page: ${pageResponse.status}`);
      }

      alert('Random page added to server');
      fetchAllServerData(); // Refresh server data
    } catch (error: unknown) {
      console.error('Failed to add random page to server:', error);
      alert('Failed to add random page to server: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div className="fixed bottom-3 right-3 max-w-xs rounded-md bg-neutral-900/95 text-neutral-100 text-xs shadow-lg border border-neutral-700 p-3 space-y-2 z-50">
      <div className="flex items-center justify-between">
        <span className="font-semibold tracking-wide">Sync</span>
        <button
          type="button"
          onClick={() => syncWithServer()}
          disabled={isSyncing}
          className="px-2 py-0.5 rounded border border-neutral-500 hover:bg-neutral-800 disabled:opacity-50"
        >
          {isSyncing ? "Syncing…" : "Force sync"}
        </button>
      </div>

      <div className="space-y-1">
        <div>
          <span className="text-neutral-400">Status:</span>{" "}
          <span
            className={
              syncStatus === "error"
                ? "text-red-400"
                : syncStatus === "syncing"
                ? "text-amber-300"
                : "text-emerald-300"
            }
          >
            {syncStatus}
          </span>
        </div>

        <div>
          <span className="text-neutral-400">Last sync:</span>{" "}
          <span>{lastSyncAt ?? "never"}</span>
        </div>

        {lastSyncSummary && (
          <div className="text-neutral-300">
            <div>
              Changes: <span>{lastSyncSummary.changes}</span>
            </div>
            <div>
              B:{lastSyncSummary.books} / P:{lastSyncSummary.pages} / T:
              {lastSyncSummary.tags}
            </div>
          </div>
        )}

        {syncError && (
          <div className="text-red-400">
            Error: <span>{syncError}</span>
          </div>
        )}
      </div>

      {/* Sync Timeline */}
      <div className="border-t border-neutral-700 pt-2">
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className="text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1"
        >
          <span>{showTimeline ? "▼" : "▶"}</span>
          <span>Timeline ({syncEvents.length})</span>
        </button>

        {showTimeline && (
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {syncEvents.length === 0 ? (
              <div className="text-neutral-500 text-xs">No sync events yet</div>
            ) : (
              syncEvents.slice().reverse().map((event) => (
                <div
                  key={event.id}
                  className="text-xs border-l-2 pl-2 border-neutral-600"
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={
                        event.type === "error"
                          ? "text-red-400"
                          : event.type === "push"
                          ? "text-blue-400"
                          : "text-green-400"
                      }
                    >
                      {event.type === "pull" ? "↓" : event.type === "push" ? "↑" : "✗"}
                    </span>
                    <span className="text-neutral-300">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-neutral-400 ml-3">{event.description}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Server Operations */}
      <div className="border-t border-neutral-700 pt-2">
        <button
          onClick={() => setShowServerOps(!showServerOps)}
          className="text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1"
        >
          <span>{showServerOps ? "▼" : "▶"}</span>
          <span>Server Ops</span>
        </button>

        {showServerOps && (
          <div className="mt-2 space-y-2">
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={fetchServerStats}
                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
              >
                Get Stats
              </button>
              <button
                onClick={fetchAllServerData}
                className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded"
              >
                Get Data
              </button>
              <button
                onClick={resetSyncMetadata}
                className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 rounded"
              >
                Reset Sync
              </button>
              <button
                onClick={clearLocalSyncState}
                className="px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 rounded"
              >
                Clear Local
              </button>
              <button
                onClick={clearAllLocalData}
                className="px-2 py-1 text-xs bg-rose-600 hover:bg-rose-700 rounded"
              >
                Clear Local Data
              </button>
              <button
                onClick={clearAllData}
                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
              >
                Clear All
              </button>
            </div>

            {/* Add Random Data */}
            <div className="border-t border-neutral-600 pt-2">
              <div className="text-neutral-300 text-xs font-semibold mb-2">Add Random Data:</div>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={addRandomBookLocal}
                  className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded"
                  title="Adds via store (will sync)"
                >
                  + Book Local
                </button>
                <button
                  onClick={addRandomPageLocal}
                  className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 rounded"
                  title="Adds via store (will sync)"
                >
                  + Page Local
                </button>
                <button
                  onClick={addRandomDataOfflineOnly}
                  className="px-2 py-1 text-xs bg-teal-600 hover:bg-teal-700 rounded"
                  title="Direct localStorage (no sync)"
                >
                  + Offline Only
                </button>
                <button
                  onClick={addRandomBookServer}
                  className="px-2 py-1 text-xs bg-pink-600 hover:bg-pink-700 rounded"
                  title="Direct to server"
                >
                  + Book Server
                </button>
                <button
                  onClick={addRandomPageServer}
                  className="px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 rounded"
                  title="Direct to server"
                >
                  + Page Server
                </button>
              </div>
            </div>

            {serverStats && (
              <div className="text-neutral-300 text-xs bg-neutral-800 p-2 rounded">
                <div className="font-semibold mb-1">Server Stats:</div>
                <div>Pages: {serverStats.local.pages}</div>
                <div>Books: {serverStats.local.books}</div>
                <div>Sync Records: {serverStats.sync.totalRecords}</div>
                <div>Deleted: {serverStats.sync.deletedRecords}</div>
                <div>Active: {serverStats.sync.activeRecords}</div>
              </div>
            )}

            {serverData && (
              <div className="text-neutral-300 text-xs bg-neutral-800 p-2 rounded max-h-40 overflow-y-auto">
                <div className="font-semibold mb-1">Server Data:</div>
                <div>Books: {serverData.books?.length || 0}</div>
                <div>Pages: {serverData.pages?.length || 0}</div>
                <div>Tags: {serverData.tags?.length || 0}</div>
                <div>Sync Records: {serverData.syncMetadata?.length || 0}</div>

                {serverData.books?.length > 0 && (
                  <div className="mt-2">
                    <div className="font-semibold">Books:</div>
                    {serverData.books.slice(0, 3).map((book: any) => (
                      <div key={book.id} className="flex items-center gap-2 ml-2">
                        <span>{book.title}</span>
                        <button
                          onClick={() => deleteEntity('book', book.id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {serverData.pages?.length > 0 && (
                  <div className="mt-2">
                    <div className="font-semibold">Pages:</div>
                    {serverData.pages.slice(0, 5).map((page: any) => (
                      <div key={page.id} className="flex items-center gap-2 ml-2">
                        <span className="truncate">{page.title}</span>
                        <button
                          onClick={() => deleteEntity('page', page.id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
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

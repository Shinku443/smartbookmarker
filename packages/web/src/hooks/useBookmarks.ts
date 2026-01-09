import { useEffect, useState } from "react";
import {
  Bookmark,
  BookmarkTag,
  generateTags,
  importBookmarksFromHtml
} from "@smart/core";
import { loadBookmarks, saveBookmarks } from "../storage/webStorage";
import { Book } from "../models/Book";
import { RichBookmark } from "../models/RichBookmark";
import { PersistedData } from "../models/PersistedData";
import { SyncClient } from "../sync/syncClient";
import type { SyncState, SyncPayload } from "../sync/types";
import { syncLog } from "../sync/logger";
import { createPage } from "../api/pages";

/**
 * useBookmarks Hook
 * ------------------
 * Main hook for bookmark management. Provides state and operations for:
 * - Bookmark CRUD operations
 * - Book management
 * - Drag-and-drop reordering
 * - Import/export functionality
 * - Tag management
 *
 * @returns Object with state and handler functions
 */
export function useBookmarks() {
  // Core state
  const [bookmarks, setBookmarks] = useState<RichBookmark[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [rootOrder, setRootOrder] = useState<string[]>([]); // Order for ungrouped bookmarks
  const [pinnedOrder, setPinnedOrder] = useState<string[]>([]); // Order for pinned bookmarks
  const [loading, setLoading] = useState(true);

  // NEW: sync state
  const [syncState, setSyncState] = useState<SyncState>({
    lastSyncAt: localStorage.getItem("lastSyncAt"),
    pending: false,
    error: null,
  });

  // NEW: one SyncClient instance
  const [syncClient] = useState(
    () => new SyncClient(), // use direct API connection
  );

  /**
   * Data Loading Effect
   * -------------------
   * Loads persisted bookmark data on mount.
   * Handles migration from legacy array format to structured format.
   * Initializes ordering arrays if not present.
   */
  useEffect(() => {
    loadBookmarks().then((loaded) => {
      const data = loaded as PersistedData;

      if (Array.isArray(data)) {
        // Legacy format: just an array of bookmarks
        const arr = data;
        setBookmarks(arr);
        setBooks([]);
        setRootOrder(arr.map((b) => b.id));
        setPinnedOrder(arr.filter((b) => b.pinned).map((b) => b.id));
      } else {
        // New structured format
        const nextBookmarks = data.bookmarks ?? [];
        const nextBooks = data.books ?? [];
        setBookmarks(nextBookmarks);
        setBooks(nextBooks);
        setRootOrder(
          data.rootOrder && data.rootOrder.length
            ? data.rootOrder
            : nextBookmarks.map((b) => b.id)
        );
        setPinnedOrder(
          data.pinnedOrder && data.pinnedOrder.length
            ? data.pinnedOrder
            : nextBookmarks.filter((b) => b.pinned).map((b) => b.id)
        );
      }

      setLoading(false);
    });
  }, []);

  // SYNC TRIGGERS
  // Sync once after initial load completes
  useEffect(() => {
    if (!loading) {
      // fire-and-forget; errors are tracked in syncState
      syncWithServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Sync whenever the window regains focus
  useEffect(() => {
    function handleFocus() {
      syncWithServer();
    }

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * persistAll
   * -----------
   * Updates all state and persists to storage.
   * Central function for state synchronization and persistence.
   *
   * @param nextBookmarks - Updated bookmarks array
   * @param nextBooks - Updated books array
   * @param nextRootOrder - Updated root ordering
   * @param nextPinnedOrder - Updated pinned ordering
   */
  function persistAll(
    nextBookmarks: RichBookmark[] = bookmarks,
    nextBooks: Book[] = books,
    nextRootOrder: string[] = rootOrder,
    nextPinnedOrder: string[] = pinnedOrder
  ) {
    setBookmarks(nextBookmarks);
    setBooks(nextBooks);
    setRootOrder(nextRootOrder);
    setPinnedOrder(nextPinnedOrder);

    saveBookmarks({
      bookmarks: nextBookmarks,
      books: nextBooks,
      rootOrder: nextRootOrder,
      pinnedOrder: nextPinnedOrder
    });
  }

  /**
   * computeFavicon
   * --------------
   * Generates a favicon URL using Google's favicon service.
   * Falls back to treating the input as a domain if URL parsing fails.
   *
   * @param url - The URL to get favicon for
   * @returns Favicon URL string
   */
  function computeFavicon(url: string) {
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}`;
    } catch {
      return `https://www.google.com/s2/favicons?domain=${url}`;
    }
  }

  // BOOKS MANAGEMENT

  /**
   * addBook
   * ---------
   * Creates a new book with the given name.
   * Generates a unique ID and initializes with empty order array.
   *
   * @param name - Name for the new book
   * @param parentBookId - Parent book ID, or null for root level
   * @returns The newly created book
   */
  function addBook(name: string, parentBookId: string | null = null): Book {
    console.log(`[BOOK CREATE] Creating book "${name}" ${parentBookId ? `under parent ${parentBookId}` : 'at root level'}`);

    const now = Date.now();
    const newBook: Book = {
      id: crypto.randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
      order: [],
      parentBookId
    };

    const nextBooks = [...books, newBook];
    persistAll(bookmarks, nextBooks);

    console.log(`[BOOK CREATE] Book created with ID: ${newBook.id}`);
    return newBook;
  }

  /**
   * renameBook
   * -----------
   * Updates the name of an existing book.
   *
   * @param id - Book ID to rename
   * @param name - New name for the book
   */
  function renameBook(id: string, name: string) {
    console.log(`[BOOK UPDATE] Renaming book ${id} to "${name}"`);
    const now = Date.now();
    const nextBooks = books.map((b) =>
      b.id === id ? { ...b, name, updatedAt: now } : b
    );
    persistAll(bookmarks, nextBooks);
    console.log(`[BOOK UPDATE] Book ${id} renamed successfully`);
  }

  /**
 * updateBook
 * ----------
 * Updates an existing book with new data.
 * Useful for partial updates (e.g., icon, name, parentBookId).
 *
 * @param updated - Updated book data
 */
  function updateBook(updated: Book) {
    const now = Date.now();
    const nextBooks = books.map((b) =>
      b.id === updated.id ? { ...b, ...updated, updatedAt: now } : b
    );
    persistAll(bookmarks, nextBooks);
  }

  /**
   * updateBookIcon
   * ---------------
   * Updates the icon of an existing book.
   * Supports emoji, custom uploads (data URLs), or null to remove.
   *
   * @param id - Book ID to update
   * @param icon - New icon (emoji, data URL, or null)
   */
  function updateBookIcon(id: string, icon: string | null) {
    console.log("Updating book icon:", id, icon);
    const now = Date.now();
    const nextBooks = books.map((b) =>
      b.id === id ? { ...b, icon, updatedAt: now } : b
    );
    persistAll(bookmarks, nextBooks);
  }

  /**
   * deleteBook
   * -----------
   * Removes a book and moves all its bookmarks to the root level.
   * Updates root ordering to include moved bookmarks.
   *
   * @param id - Book ID to delete
   */
  function deleteBook(id: string) {
    const nextBooks = books.filter((b) => b.id !== id);
    const nextBookmarks = bookmarks.map((bm) =>
      bm.bookId === id ? { ...bm, bookId: null } : bm
    );

    const deletedBook = books.find((b) => b.id === id);
    const removedIds = new Set(Array.isArray(deletedBook?.order) ? deletedBook.order : []);

    const nextRootOrder = [
      ...rootOrder,
      ...Array.from(removedIds).filter((id) => !rootOrder.includes(id))
    ];

    persistAll(nextBookmarks, nextBooks, nextRootOrder);
  }

  /**
   * reorderBooks
   * -------------
   * Updates the display order of books based on drag-and-drop.
   * Reorders the books array to match the new order.
   *
   * @param newBookIds - Array of book IDs in new order
   */
  function reorderBooks(newBookIds: string[]) {
    const idToBook = new Map(books.map((b) => [b.id, b]));
    const nextBooks: Book[] = [];

    for (const id of newBookIds) {
      const b = idToBook.get(id);
      if (b) nextBooks.push(b);
    }
    for (const b of books) {
      if (!newBookIds.includes(b.id)) nextBooks.push(b);
    }

    persistAll(bookmarks, nextBooks);
  }

  /**
   * moveBook
   * ---------
   * Moves a book to a different parent or to root level.
   * Prevents circular references by checking ancestry.
   *
   * @param bookId - ID of book to move
   * @param newParentId - New parent book ID, or null for root level
   */

  function moveBook(bookId: string, newParentId: string | null) {
    if (!newParentId) {
      // Move to root: always allowed
      const nextBooks = books.map((b) =>
        b.id === bookId
          ? { ...b, parentBookId: null, updatedAt: Date.now() }
          : b
      );
      persistAll(bookmarks, nextBooks);
      return;
    }

    // Prevent moving a book into itself or its descendants
    const same = bookId === newParentId;
    const parentIsDescendantOfBook = isDescendant(newParentId, bookId);
    if (same || parentIsDescendantOfBook) {
      return;
    }
    const nextBooks = books.map((b) =>
      b.id === bookId
        ? { ...b, parentBookId: newParentId, updatedAt: Date.now() }
        : b
    );
    persistAll(bookmarks, nextBooks);
  }

  /**
   * isDescendant
   * -------------
   * Checks if a book is a descendant of another book.
   * Used to prevent circular references when moving books.
   *
   * @param potentialDescendantId - Book ID to check
   * @param potentialAncestorId - Potential ancestor book ID
   * @returns True if the first book is a descendant of the second
   */
  function isDescendant(potentialDescendantId: string, potentialAncestorId: string): boolean {
    const book = books.find((b) => b.id === potentialDescendantId);
    if (!book || !book.parentBookId) return false;
    if (book.parentBookId === potentialAncestorId) return true;
    return isDescendant(book.parentBookId, potentialAncestorId);
  }

  /**
   * assignBookmarkToBook
   * ---------------------
   * Moves a bookmark to a different book or to root (no book).
   * Updates book orders and root order accordingly.
   *
   * @param bookmarkId - ID of bookmark to move
   * @param bookId - Target book ID, or null for root
   */
  function assignBookmarkToBook(bookmarkId: string, bookId: string | null) {
    const bm = bookmarks.find((b) => b.id === bookmarkId);
    if (!bm) return;

    let prevBookId = bm.bookId;

    const nextBookmarks = bookmarks.map((b) =>
      b.id === bookmarkId ? { ...b, bookId, updatedAt: Date.now() } : b
    );

    let nextBooks = books.map((book) => {
      if (book.id === prevBookId) {
        return {
          ...book,
          order: (Array.isArray(book.order) ? book.order : []).filter((id) => id !== bookmarkId)
        };
      }
      if (book.id === bookId) {
        const existing = new Set(Array.isArray(book.order) ? book.order : []);
        return {
          ...book,
          order: [...(Array.isArray(book.order) ? book.order : []), ...(existing.has(bookmarkId) ? [] : [bookmarkId])]
        };
      }
      return book;
    });

    let nextRootOrder = rootOrder.filter((id) => id !== bookmarkId);
    if (bookId === null) {
      if (!nextRootOrder.includes(bookmarkId)) {
        nextRootOrder = [...nextRootOrder, bookmarkId];
      }
    }

    persistAll(nextBookmarks, nextBooks, nextRootOrder);
  }

  /**
   * reorderBookPages
   * -----------------
   * Updates the ordering of bookmarks within a specific book or root.
   * Handles both book-specific ordering and root-level ordering.
   *
   * @param bookId - Book ID for ordering, or null for root
   * @param newIds - Array of bookmark IDs in new order
   */
  function reorderBookPages(bookId: string | null, newIds: string[]) {
    if (bookId === null) {
      const idSet = new Set(newIds);
      const cleaned = rootOrder.filter((id) => idSet.has(id));
      const finalOrder = [
        ...newIds,
        ...cleaned.filter((id) => !newIds.includes(id))
      ];
      persistAll(bookmarks, books, finalOrder);
      return;
    }

    const nextBooks = books.map((b) =>
      b.id === bookId
        ? {
          ...b,
          order: [...newIds, ...(Array.isArray(b.order) ? b.order : []).filter((id) => !newIds.includes(id))]
        }
        : b
    );
    persistAll(bookmarks, nextBooks);
  }

  /**
   * reorderPinned
   * -------------
   * Updates the ordering of pinned bookmarks.
   * Maintains pinned order array for consistent display.
   *
   * @param newIds - Array of pinned bookmark IDs in new order
   */
  function reorderPinned(newIds: string[]) {
    const idSet = new Set(newIds);
    const cleaned = pinnedOrder.filter((id) => idSet.has(id));
    const finalOrder = [
      ...newIds,
      ...cleaned.filter((id) => !newIds.includes(id))
    ];
    persistAll(bookmarks, books, rootOrder, finalOrder);
  }

  // BOOKMARK MANAGEMENT

  /**
   * addBookmark
   * ------------
   * Creates a new bookmark with auto-generated and user-provided tags.
   * Adds to appropriate book or root ordering.
   *
   * @param title - Bookmark title
   * @param url - Bookmark URL
   * @param bookId - Target book ID, or null for root
   * @param userTagLabels - Array of user-provided tag labels
   */
  async function addBookmark(
    title: string,
    url: string,
    bookId: string | null,
    userTagLabels: string[] = []
  ) {
    try {
      // Try to create via API first (for scraping)
      const apiBookmark = await createPage({
        bookId: bookId ?? undefined,
        title,
        url,
        content: "" // Will be filled by scraping
      });

      // Convert API response to RichBookmark format
      const newBookmark: RichBookmark = {
        id: apiBookmark.id,
        bookId: apiBookmark.bookId,
        title: apiBookmark.title,
        url: url, // Use the original URL since API might not return it
        createdAt: new Date(apiBookmark.createdAt).getTime(),
        updatedAt: new Date(apiBookmark.updatedAt).getTime(),
        faviconUrl: apiBookmark.faviconUrl || computeFavicon(url),
        tags: [], // API doesn't return tags in this format yet
        source: "manual" as const,
        pinned: apiBookmark.pinned,
        extractedText: apiBookmark.extractedText || undefined,
        screenshotUrl: apiBookmark.screenshotUrl || undefined,
        metaDescription: apiBookmark.metaDescription || undefined
      };

      const nextBookmarks = [...bookmarks, newBookmark];
      let nextBooks = books;
      let nextRootOrder = rootOrder;
      if (bookId === null) {
        nextRootOrder = [...rootOrder, newBookmark.id];
      } else {
        nextBooks = books.map((b) =>
          b.id === bookId
            ? { ...b, order: [...(b.order ?? []), newBookmark.id] }
            : b
        );
      }

      persistAll(nextBookmarks, nextBooks, nextRootOrder);
    } catch (error) {
      console.error("Failed to create bookmark via API, falling back to local:", error);

      // Fallback to local creation
      const autoLabels = await generateTags(title, url);
      const now = Date.now();

      const autoTags: BookmarkTag[] = autoLabels.map((label) => ({
        label,
        type: "auto" as BookmarkTag["type"]
      }));

      const userTags: BookmarkTag[] = userTagLabels.map((label) => ({
        label,
        type: "user" as BookmarkTag["type"]
      }));

      const id = crypto.randomUUID();

      const newBookmark: RichBookmark = {
        id,
        bookId,
        title,
        url,
        createdAt: now,
        updatedAt: now,
        faviconUrl: computeFavicon(url),
        tags: [...autoTags, ...userTags],
        source: "manual",
        pinned: false
      };

      const nextBookmarks = [...bookmarks, newBookmark];

      let nextBooks = books;
      let nextRootOrder = rootOrder;
      if (bookId === null) {
        nextRootOrder = [...rootOrder, id];
      } else {
        nextBooks = books.map((b) =>
          b.id === bookId
            ? { ...b, order: [...(b.order ?? []), id] }
            : b
        );
      }

      persistAll(nextBookmarks, nextBooks, nextRootOrder);
    }
  }

  /**
   * importHtml
   * -----------
   * Imports bookmarks from Netscape HTML format.
   * Adds imported bookmarks to the collection and updates ordering.
   *
   * @param text - HTML content containing bookmarks
   */
  async function importHtml(text: string) {
    const imported = (await importBookmarksFromHtml(text)) as Bookmark[];

    const withRich: RichBookmark[] = imported.map((b) => ({
      ...b,
      faviconUrl: b.faviconUrl ?? computeFavicon(b.url),
      pinned: (b as RichBookmark).pinned ?? false,
      bookId: b.bookId ?? null
    }));

    const nextBookmarks = [...bookmarks, ...withRich];

    const newIds = withRich.map((b) => b.id);
    const nextRootOrder = [
      ...rootOrder,
      ...newIds.filter((id) => !rootOrder.includes(id))
    ];

    const nextPinnedOrder = [
      ...pinnedOrder,
      ...withRich.filter((b) => b.pinned).map((b) => b.id)
    ];

    persistAll(nextBookmarks, books, nextRootOrder, nextPinnedOrder);
  }

  /**
   * deleteBookmark
   * ---------------
   * Removes a bookmark from all collections and ordering arrays.
   *
   * @param id - Bookmark ID to delete
   */
  function deleteBookmark(id: string) {
    console.log(`[BOOKMARK DELETE] Deleting bookmark ${id}`);
    const bookmark = bookmarks.find(b => b.id === id);
    console.log(`[BOOKMARK DELETE] Bookmark details: "${bookmark?.title}" (${bookmark?.url})`);

    const nextBookmarks = bookmarks.filter((b) => b.id !== id);

    const nextRootOrder = rootOrder.filter((x) => x !== id);
    const nextPinnedOrder = pinnedOrder.filter((x) => x !== id);
    const nextBooks = books.map((b) => ({
      ...b,
      order: (b.order ?? []).filter((x) => x !== id)
    }));

    persistAll(nextBookmarks, nextBooks, nextRootOrder, nextPinnedOrder);
    console.log(`[BOOKMARK DELETE] Bookmark ${id} deleted successfully`);
  }

  /**
   * togglePin
   * ----------
   * Toggles the pinned status of a bookmark.
   * Updates pinned ordering accordingly.
   *
   * @param id - Bookmark ID to toggle
   */
  function togglePin(id: string) {
    const nextBookmarks = bookmarks.map((b) =>
      b.id === id ? { ...b, pinned: !b.pinned } : b
    );

    let nextPinnedOrder = pinnedOrder;
    const isPinned = bookmarks.find((b) => b.id === id)?.pinned;

    if (!isPinned) {
      if (!nextPinnedOrder.includes(id)) {
        nextPinnedOrder = [...nextPinnedOrder, id];
      }
    } else {
      nextPinnedOrder = nextPinnedOrder.filter((x) => x !== id);
    }

    persistAll(nextBookmarks, books, rootOrder, nextPinnedOrder);
  }

  /**
   * toggleReadLater
   * ---------------
   * Toggles the read later status of a bookmark.
   * Separate from pinned for "read later" functionality.
   *
   * @param id - Bookmark ID to toggle
   */
  function toggleReadLater(id: string) {
    const nextBookmarks = bookmarks.map((b) =>
      b.id === id ? { ...b, readLater: !b.readLater, updatedAt: Date.now() } : b
    );

    persistAll(nextBookmarks);
  }

  /**
   * retag
   * -----
   * Regenerates auto-tags for a bookmark and replaces existing auto-tags.
   * Preserves user-provided tags while updating AI-generated ones.
   *
   * @param updated - Updated bookmark data
   */
  async function retag(updated: RichBookmark) {
    const autoLabels = await generateTags(updated.title, updated.url);

    const autoTags: BookmarkTag[] = autoLabels.map((label) => ({
      label,
      type: "auto" as BookmarkTag["type"]
    }));

    const next: RichBookmark[] = bookmarks.map((b) =>
      b.id === updated.id
        ? {
          ...b,
          ...updated,
          tags: autoTags,
          updatedAt: Date.now()
        }
        : b
    );

    persistAll(next);
  }

  /**
   * updateBookmark
   * ---------------
   * Updates an existing bookmark with new data.
   * Recalculates favicon if URL changed.
   *
   * @param updated - Updated bookmark data
   */
  function updateBookmark(updated: RichBookmark) {
    const next: RichBookmark[] = bookmarks.map((b) =>
      b.id === updated.id
        ? {
          ...b,
          ...updated,
          updatedAt: Date.now(),
          faviconUrl: computeFavicon(updated.url)
        }
        : b
    );

    persistAll(next);
  }
  async function syncWithServer() {
    syncLog("syncWithServer() called");

    setSyncState((prev) => ({ ...prev, pending: true, error: null }));

    try {
      // First, push any local changes to the server
      await pushLocalChanges();

      // Then pull latest changes from server
      // Force full sync if client has no local data
      const hasLocalData = bookmarks.length > 0 || books.length > 0;
      const forceFull = !hasLocalData;
      const payload = await syncClient.sync(forceFull);

      if (!payload) {
        syncLog("syncWithServer(): no payload returned");
        throw new Error("Sync failed");
      }

      syncLog("Applying sync payload…");
      applySyncPayload(payload);

      const lastSyncAt = localStorage.getItem("lastSyncAt");
      syncLog("Sync applied. lastSyncAt =", lastSyncAt);

      setSyncState((prev) => ({
        ...prev,
        pending: false,
        lastSyncAt,
      }));
    } catch (err: any) {
      syncLog("syncWithServer() error:", err);

      setSyncState((prev) => ({
        ...prev,
        pending: false,
        error: err?.message ?? "Unknown sync error",
      }));
    }
  }

  async function pushLocalChanges() {
    const lastSyncAt = localStorage.getItem("lastSyncAt");
    const lastSyncTime = lastSyncAt ? new Date(lastSyncAt).getTime() : 0;
    const now = Date.now();

    // If lastSyncAt is in the future (server timestamp issue), push all local items
    const isLastSyncInFuture = lastSyncTime > now + 1000; // 1 second grace period
    const effectiveLastSyncTime = isLastSyncInFuture ? 0 : lastSyncTime;

    // Find bookmarks that were created or updated since last sync
    const changedBookmarks = bookmarks.filter(b =>
      b.createdAt > effectiveLastSyncTime || b.updatedAt > effectiveLastSyncTime
    );

    // Find books that were created or updated since last sync
    const changedBooks = books.filter(b =>
      b.createdAt > lastSyncTime || b.updatedAt > lastSyncTime
    );

    // Get previously synced items to detect deletions
    const lastSyncedData = localStorage.getItem("lastSyncedData");
    let lastSyncedBookmarks: string[] = [];
    let lastSyncedBooks: string[] = [];

    if (lastSyncedData) {
      try {
        const parsed = JSON.parse(lastSyncedData);
        lastSyncedBookmarks = parsed.bookmarks || [];
        lastSyncedBooks = parsed.books || [];
      } catch (e) {
        // Ignore parsing errors
      }
    }

    // Detect deletions: items that existed before but don't exist now
    const currentBookmarkIds = new Set(bookmarks.map(b => b.id));
    const deletedBookmarkIds = lastSyncedBookmarks.filter(id => !currentBookmarkIds.has(id));

    const currentBookIds = new Set(books.map(b => b.id));
    const deletedBookIds = lastSyncedBooks.filter(id => !currentBookIds.has(id));

    // Push deletions to server
    for (const bookmarkId of deletedBookmarkIds) {
      try {
        await syncClient.pushDeletion("page", bookmarkId);
        syncLog(`Pushed deletion for bookmark: ${bookmarkId}`);
      } catch (error) {
        syncLog(`Failed to push deletion for bookmark ${bookmarkId}:`, error);
      }
    }

    for (const bookId of deletedBookIds) {
      try {
        await syncClient.pushDeletion("book", bookId);
        syncLog(`Pushed deletion for book: ${bookId}`);
      } catch (error) {
        syncLog(`Failed to push deletion for book ${bookId}:`, error);
      }
    }

    if (changedBookmarks.length === 0 && changedBooks.length === 0 && deletedBookmarkIds.length === 0 && deletedBookIds.length === 0) {
      syncLog("No local changes to push");
      return;
    }

    syncLog("Pushing local changes:", {
      bookmarks: changedBookmarks.length,
      books: changedBooks.length,
      deletedBookmarks: deletedBookmarkIds.length,
      deletedBooks: deletedBookIds.length
    });

    // Convert to push payload format
    const pushPayload = {
      books: changedBooks.map(book => ({
        id: book.id,
        title: book.name,
        emoji: book.icon || null,
        order: 0, // TODO: implement proper ordering
        parentBookId: book.parentBookId,
        createdAt: new Date(book.createdAt).toISOString(),
        updatedAt: new Date(book.updatedAt).toISOString(),
      })),
      pages: changedBookmarks.map(bookmark => ({
        id: bookmark.id,
        bookId: bookmark.bookId || null,
        title: bookmark.title,
        content: bookmark.url || "",
        order: 0, // TODO: implement proper ordering
        pinned: bookmark.pinned ?? false,
        createdAt: new Date(bookmark.createdAt).toISOString(),
        updatedAt: new Date(bookmark.updatedAt).toISOString(),
        tagIds: bookmark.tags?.map(t => t.label) || [],
      })),
      tags: [], // TODO: implement tag sync
    };

    const success = await syncClient.push(pushPayload);
    if (!success) {
      throw new Error("Failed to push local changes");
    }

    // Update last synced data
    localStorage.setItem("lastSyncedData", JSON.stringify({
      bookmarks: bookmarks.map(b => b.id),
      books: books.map(b => b.id),
      syncedAt: new Date().toISOString()
    }));

    syncLog("Local changes pushed successfully");
  }

  function applySyncPayload(payload: SyncPayload) {
    syncLog("applySyncPayload()", payload);

    const { books: serverBooks, pages: serverPages, tags: serverTags } = payload;

    // Validate and fix server books
    const validatedServerBooks = serverBooks.map((book: any) => ({
      ...book,
      order: Array.isArray(book.order) ? book.order : []
    }));

    // Map backend pages -> RichBookmarks
    const incomingBookmarks: RichBookmark[] = serverPages.map(mapPageToRichBookmark);

    syncLog("Merging books:", validatedServerBooks.length);
    syncLog("Merging bookmarks:", incomingBookmarks.length);

    // Offline-first merge: only add new items from server, never overwrite local
    const nextBooks = mergeOfflineFirst(books, validatedServerBooks);
    const nextBookmarks = mergeOfflineFirst(bookmarks, incomingBookmarks);

    syncLog("Merged state:", {
      books: nextBooks.length,
      bookmarks: nextBookmarks.length,
    });

    // Update ordering to include any new bookmarks from server
    const existingBookmarkIds = new Set(bookmarks.map(b => b.id));
    const newBookmarkIds = incomingBookmarks
      .filter(b => !existingBookmarkIds.has(b.id))
      .map(b => b.id);

    const nextRootOrder = [...rootOrder, ...newBookmarkIds.filter(id => !rootOrder.includes(id))];

    // Update pinned order for newly synced pinned bookmarks
    const newPinnedBookmarkIds = incomingBookmarks
      .filter(b => b.pinned && !pinnedOrder.includes(b.id))
      .map(b => b.id);

    const nextPinnedOrder = [...pinnedOrder, ...newPinnedBookmarkIds];

    persistAll(nextBookmarks, nextBooks, nextRootOrder, nextPinnedOrder);
    syncLog("State persisted after sync");
  }

  // Return all state and handlers
  return {
    bookmarks,
    books,
    rootOrder,
    pinnedOrder,
    loading,
    syncState,
    syncWithServer,

    addBookmark,
    deleteBookmark,
    togglePin,
    toggleReadLater,
    retag,
    updateBookmark,
    importHtml,

    addBook,
    renameBook,
    deleteBook,
    moveBook,
    updateBook,
    updateBookIcon,
    assignBookmarkToBook,
    reorderBookPages,
    reorderBooks,
    reorderPinned
  };
}


function mergeOfflineFirst<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map((e) => [e.id, e]));

  for (const item of incoming) {
    // Only add items that don't exist locally - never overwrite local data
    if (!map.has(item.id)) {
      // For new items, map fields if needed
      if ('title' in item && !('name' in item)) {
        // Server book -> client book
        const clientItem = {
          ...item,
          name: (item as any).title,
          icon: (item as any).emoji,
        } as any;
        delete clientItem.title;
        delete clientItem.emoji;
        map.set(item.id, clientItem as T);
      } else {
        map.set(item.id, item);
      }
    }
    // If item exists locally, we keep the local version (offline-first)
  }

  return Array.from(map.values());
}

// Map backend Page to your RichBookmark model
function mapPageToRichBookmark(page: any): RichBookmark {
  let tags: BookmarkTag[] = [];
  try {
    if (page.tags && Array.isArray(page.tags)) {
      tags = page.tags
        .filter((pt: any) => pt && pt.tag && pt.tag.name)
        .map((pt: any) => ({
          label: pt.tag.name,
          type: "auto" as BookmarkTag["type"],
        }));
    }
  } catch (error) {
    console.warn(`Failed to parse tags for page ${page.id}:`, error);
  }

  return {
    id: page.id,
    bookId: page.bookId ?? null,
    title: page.title,
    url: page.content ?? "",
    createdAt: new Date(page.createdAt).getTime(),
    updatedAt: new Date(page.updatedAt).getTime(),
    faviconUrl: "", // Server doesn't store this, will be preserved from local
    tags,
    source: "imported", // Will be preserved from local if exists
    pinned: page.pinned ?? false,
  };
}

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
   * --------
   * Creates a new book with the given name.
   * Generates a unique ID and initializes with empty order array.
   *
   * @param name - Name for the new book
   * @param parentBookId - Parent book ID, or null for root level
   * @returns The newly created book
   */
  function addBook(name: string, parentBookId: string | null = null): Book {
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
    const now = Date.now();
    const nextBooks = books.map((b) =>
      b.id === id ? { ...b, name, updatedAt: now } : b
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
    const removedIds = new Set(deletedBook?.order ?? []);

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
          order: (book.order ?? []).filter((id) => id !== bookmarkId)
        };
      }
      if (book.id === bookId) {
        const existing = new Set(book.order ?? []);
        return {
          ...book,
          order: [...(book.order ?? []), ...(existing.has(bookmarkId) ? [] : [bookmarkId])]
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
          order: [...newIds, ...((b.order ?? []).filter((id) => !newIds.includes(id)))]
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
    const nextBookmarks = bookmarks.filter((b) => b.id !== id);

    const nextRootOrder = rootOrder.filter((x) => x !== id);
    const nextPinnedOrder = pinnedOrder.filter((x) => x !== id);
    const nextBooks = books.map((b) => ({
      ...b,
      order: (b.order ?? []).filter((x) => x !== id)
    }));

    persistAll(nextBookmarks, nextBooks, nextRootOrder, nextPinnedOrder);
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

  // Return all state and handlers
  return {
    bookmarks,
    books,
    rootOrder,
    pinnedOrder,
    loading,

    addBookmark,
    deleteBookmark,
    togglePin,
    retag,
    updateBookmark,
    importHtml,

    addBook,
    renameBook,
    deleteBook,
    moveBook,
    assignBookmarkToBook,
    reorderBookPages,
    reorderBooks,
    reorderPinned
  };
}

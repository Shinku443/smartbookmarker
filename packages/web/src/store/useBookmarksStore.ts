// apps/web/src/store/useBookmarksStore.ts
// Central state + sync engine for Books and Pages.
// Handles:
// - local state
// - optimistic CRUD
// - ordering
// - pinned state
// - sync with backend
// - conflict resolution (local unsynced changes win)

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { BookDto } from "../api/books";
import type { PageDto } from "../api/pages";
import {
  createBook,
  deleteBook,
  updateBook,
  fetchBooks,
} from "../api/books";
import {
  createPage,
  deletePage,
  updatePage,
  fetchPages,
} from "../api/pages";

type SyncStatus = "idle" | "syncing" | "error";

export type Book = BookDto & {
  isLocalOnly?: boolean;
  hasLocalChanges?: boolean;
};

export type Page = PageDto & {
  isLocalOnly?: boolean;
  hasLocalChanges?: boolean;
};

type SyncChange = {
  entityType: "book" | "page" | "tag";
  entityId: string;
  version: number;
  updatedAt: string;
};

type SyncPayload = {
  changes: SyncChange[];
  books: BookDto[];
  pages: PageDto[];
  tags: any[];
};

type SyncSummary = {
  changes: number;
  books: number;
  pages: number;
  tags: number;
};

type State = {
  books: Book[];
  pages: Page[];

  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncAt: string | null;
  lastSyncSummary: SyncSummary | null;

  initializeFromServer: () => Promise<void>;
  syncWithServer: () => Promise<void>;

  createBook: (input: { title: string; emoji?: string | null }) => Promise<void>;
  renameBook: (id: string, title: string) => Promise<void>;
  updateBookEmoji: (id: string, emoji: string | null) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  reorderBook: (id: string, targetIndex: number) => Promise<void>;

  createBookmark: (input: {
    bookId: string;
    title: string;
    content?: string | null;
  }) => Promise<void>;
  updateBookmark: (
    id: string,
    input: Partial<{ title: string; content: string | null }>
  ) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  reorderBookmark: (
    id: string,
    targetIndex: number,
    bookId: string
  ) => Promise<void>;
  toggleBookmarkPinned: (id: string) => Promise<void>;
};

function computeBetween(
  a: number | null | undefined,
  b: number | null | undefined
): number {
  if (a == null && b == null) return Date.now();
  if (a == null) return b! - 1;
  if (b == null) return a + 1;
  if (b - a <= 1) return Date.now();
  return Math.floor((a + b) / 2);
}

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const useBookmarksStore = create<State>((set, get) => ({
  books: [],
  pages: [],
  syncStatus: "idle",
  syncError: null,
  lastSyncAt: null,
  lastSyncSummary: null,

  // Initial load: full sync
  async initializeFromServer() {
    if (get().lastSyncAt) return;
    await get().syncWithServer();
  },

  // SYNC ENGINE
  async syncWithServer() {
    const state = get();
    if (state.syncStatus === "syncing") return;

    set({ syncStatus: "syncing", syncError: null });

    try {
      const since = state.lastSyncAt;
      const url = since ? `/api/sync?since=${encodeURIComponent(since)}` : "/api/sync";
      const res = await fetch(url, { method: "GET" });
      const payload = await handleJson<SyncPayload>(res);

      const { books: localBooks, pages: localPages } = get();

      const localBooksById = new Map(localBooks.map((b) => [b.id, b]));
      const localPagesById = new Map(localPages.map((p) => [p.id, p]));

      // MERGE BOOKS
      const mergedBooks: Book[] = [...localBooks];
      for (const remote of payload.books) {
        const existing = localBooksById.get(remote.id);
        if (!existing) {
          mergedBooks.push({ ...remote });
          continue;
        }

        if (existing.hasLocalChanges) {
          mergedBooks.push({
            ...remote,
            title: existing.title,
            emoji: existing.emoji,
            order: existing.order,
            hasLocalChanges: true,
            isLocalOnly: false,
          });
        } else {
          mergedBooks.push({ ...remote });
        }
      }

      const dedupedBooks = Array.from(
        new Map(mergedBooks.map((b) => [b.id, b])).values()
      ).sort((a, b) => a.order - b.order);

      // MERGE PAGES
      const mergedPages: Page[] = [...localPages];
      for (const remote of payload.pages) {
        const existing = localPagesById.get(remote.id);
        if (!existing) {
          mergedPages.push({ ...remote });
          continue;
        }

        if (existing.hasLocalChanges) {
          mergedPages.push({
            ...remote,
            title: existing.title,
            content: existing.content,
            order: existing.order,
            pinned: existing.pinned,
            hasLocalChanges: true,
            isLocalOnly: false,
          });
        } else {
          mergedPages.push({ ...remote });
        }
      }

      const dedupedPages = Array.from(
        new Map(mergedPages.map((p) => [p.id, p])).values()
      ).sort((a, b) => a.order - b.order);

      const nowIso = new Date().toISOString();

      set({
        books: dedupedBooks,
        pages: dedupedPages,
        lastSyncAt: nowIso,
        syncStatus: "idle",
        syncError: null,
        lastSyncSummary: {
          changes: payload.changes.length,
          books: payload.books.length,
          pages: payload.pages.length,
          tags: payload.tags.length,
        },
      });
    } catch (err: any) {
      set({
        syncStatus: "error",
        syncError: err?.message ?? "Unknown sync error",
      });
    }
  },

  // BOOKS

  async createBook(input) {
    const tempId = `local-book-${nanoid()}`;
    const now = Date.now();

    set((state) => ({
      books: [
        ...state.books,
        {
          id: tempId,
          title: input.title,
          emoji: input.emoji ?? null,
          order: now,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isLocalOnly: true,
          hasLocalChanges: true,
        },
      ].sort((a, b) => a.order - b.order),
    }));

    try {
      const saved = await createBook(input);
      set((state) => ({
        books: state.books
          .map((b) =>
            b.id === tempId
              ? {
                  ...b,
                  id: saved.id,
                  order: saved.order,
                  createdAt: saved.createdAt,
                  updatedAt: saved.updatedAt,
                  emoji: saved.emoji,
                  isLocalOnly: false,
                  hasLocalChanges: false,
                }
              : b
          )
          .sort((a, b) => a.order - b.order),
      }));
    } catch (err) {
      set((state) => ({
        books: state.books.filter((b) => b.id !== tempId),
      }));
      throw err;
    }
  },

  async renameBook(id, title) {
    const prev = get().books;
    set({
      books: prev.map((b) =>
        b.id === id ? { ...b, title, hasLocalChanges: true } : b
      ),
    });

    try {
      await updateBook(id, { title });
      set({
        books: get().books.map((b) =>
          b.id === id ? { ...b, hasLocalChanges: false } : b
        ),
      });
    } catch (err) {
      set({ books: prev });
      throw err;
    }
  },

  async updateBookEmoji(id, emoji) {
    const prev = get().books;
    set({
      books: prev.map((b) =>
        b.id === id ? { ...b, emoji, hasLocalChanges: true } : b
      ),
    });

    try {
      await updateBook(id, { emoji });
      set({
        books: get().books.map((b) =>
          b.id === id ? { ...b, hasLocalChanges: false } : b
        ),
      });
    } catch (err) {
      set({ books: prev });
      throw err;
    }
  },

  async deleteBook(id) {
    const prev = get().books;
    set({
      books: prev.filter((b) => b.id !== id),
    });

    try {
      await deleteBook(id);
    } catch (err) {
      set({ books: prev });
      throw err;
    }
  },

  async reorderBook(id, targetIndex) {
    const state = get();
    const ordered = [...state.books].sort((a, b) => a.order - b.order);
    const currentIndex = ordered.findIndex((b) => b.id === id);
    if (currentIndex === -1) return;

    const [book] = ordered.splice(currentIndex, 1);
    ordered.splice(targetIndex, 0, book);

    const prev = ordered[targetIndex - 1];
    const next = ordered[targetIndex + 1];
    const newOrder = computeBetween(prev?.order, next?.order);

    const prevBooks = state.books;
    set({
      books: state.books.map((b) =>
        b.id === id ? { ...b, order: newOrder, hasLocalChanges: true } : b
      ),
    });

    try {
      await updateBook(id, { order: newOrder });
      set({
        books: get().books.map((b) =>
          b.id === id ? { ...b, hasLocalChanges: false } : b
        ),
      });
    } catch (err) {
      set({ books: prevBooks });
      throw err;
    }
  },

  // PAGES

  async createBookmark(input) {
    const tempId = `local-page-${nanoid()}`;
    const now = Date.now();

    set((state) => ({
      pages: [
        ...state.pages,
        {
          id: tempId,
          bookId: input.bookId,
          title: input.title,
          content: input.content ?? null,
          order: now,
          pinned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isLocalOnly: true,
          hasLocalChanges: true,
        },
      ].sort((a, b) => a.order - b.order),
    }));

    try {
      const saved = await createPage(input);
      set((state) => ({
        pages: state.pages
          .map((p) =>
            p.id === tempId
              ? {
                  ...p,
                  id: saved.id,
                  order: saved.order,
                  pinned: saved.pinned,
                  content: saved.content,
                  createdAt: saved.createdAt,
                  updatedAt: saved.updatedAt,
                  isLocalOnly: false,
                  hasLocalChanges: false,
                }
              : p
          )
          .sort((a, b) => a.order - b.order),
      }));
    } catch (err) {
      set((state) => ({
        pages: state.pages.filter((p) => p.id !== tempId),
      }));
      throw err;
    }
  },

  async updateBookmark(id, input) {
    const prev = get().pages;
    set({
      pages: prev.map((p) =>
        p.id === id ? { ...p, ...input, hasLocalChanges: true } : p
      ),
    });

    try {
      await updatePage(id, input);
      set({
        pages: get().pages.map((p) =>
          p.id === id ? { ...p, hasLocalChanges: false } : p
        ),
      });
    } catch (err) {
      set({ pages: prev });
      throw err;
    }
  },

  async deleteBookmark(id) {
    const prev = get().pages;
    set({
      pages: prev.filter((p) => p.id !== id),
    });

    try {
      await deletePage(id);
    } catch (err) {
      set({ pages: prev });
      throw err;
    }
  },

  async reorderBookmark(id, targetIndex, bookId) {
    const state = get();
    const pagesInBook = state.pages
      .filter((p) => p.bookId === bookId)
      .sort((a, b) => a.order - b.order);

    const currentIndex = pagesInBook.findIndex((p) => p.id === id);
    if (currentIndex === -1) return;

    const [page] = pagesInBook.splice(currentIndex, 1);
    pagesInBook.splice(targetIndex, 0, page);

    const prev = pagesInBook[targetIndex - 1];
    const next = pagesInBook[targetIndex + 1];
    const newOrder = computeBetween(prev?.order, next?.order);

    const prevPages = state.pages;
    set({
      pages: state.pages.map((p) =>
        p.id === id ? { ...p, order: newOrder, hasLocalChanges: true } : p
      ),
    });

    try {
      await updatePage(id, { order: newOrder });
      set({
        pages: get().pages.map((p) =>
          p.id === id ? { ...p, hasLocalChanges: false } : p
        ),
      });
    } catch (err) {
      set({ pages: prevPages });
      throw err;
    }
  },

  async toggleBookmarkPinned(id) {
    const state = get();
    const target = state.pages.find((p) => p.id === id);
    if (!target) return;

    const nextPinned = !target.pinned;
    const prev = state.pages;

    set({
      pages: prev.map((p) =>
        p.id === id ? { ...p, pinned: nextPinned, hasLocalChanges: true } : p
      ),
    });

    try {
      await updatePage(id, { pinned: nextPinned });
      set({
        pages: get().pages.map((p) =>
          p.id === id ? { ...p, hasLocalChanges: false } : p
        ),
      });
    } catch (err) {
      set({ pages: prev });
      throw err;
    }
  },
}));
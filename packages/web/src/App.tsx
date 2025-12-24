import { useState, useMemo } from "react";
import Layout from "./components/Layout";
import Sidebar from "./components/Sidebar";
import BookmarkList from "./components/BookmarkList";
import PinnedBookmarks from "./components/PinnedBookmarks";
import EditBookmarkModal from "./components/EditBookmarkModal";
import AddBookmarkModal from "./components/AddBookmarkModal";
import SettingsScreen from "./components/SettingsScreen";
import BookManagerModal from "./components/BookManagerModal";

import {
  useBookmarks,
  RichBookmark,
  Book
} from "./hooks/useBookmarks";

import { useTheme } from "./hooks/useTheme";

/**
 * App.tsx
 * --------
 * This is the top‑level orchestrator for the entire Emperor Library UI.
 * It wires together:
 *   - Books (groups)
 *   - Pages (bookmarks)
 *   - Drag‑and‑drop ordering
 *   - Pinned pages
 *   - Multi‑select actions
 *   - Add/Edit modals
 *   - Book Manager modal
 *   - Sidebar navigation
 *
 * The goal is to keep this file declarative and readable:
 *   - All business logic lives in useBookmarks()
 *   - All UI logic lives in components
 *   - App.tsx only coordinates state + handlers
 */

export default function App() {
  /**
   * useBookmarks()
   * --------------
   * This hook is the "database" of the app.
   * It provides:
   *   - bookmarks (pages)
   *   - books (groups)
   *   - rootOrder (ordering for ungrouped pages)
   *   - pinnedOrder (ordering for pinned pages)
   *   - CRUD for pages
   *   - CRUD for books
   *   - ordering functions for drag‑and‑drop
   */
  const {
    bookmarks,
    books,
    rootOrder,
    pinnedOrder,

    addBookmark,
    deleteBookmark,
    togglePin,
    retag,
    updateBookmark,
    importHtml,

    addBook,
    renameBook,     // ⭐ FIXED: now imported
    deleteBook,     // ⭐ FIXED: now imported

    assignBookmarkToBook,
    reorderBookPages,
    reorderBooks,
    reorderPinned
  } = useBookmarks();

  /**
   * Theme system (dark/light/system)
   */
  const { theme, setTheme } = useTheme();

  /**
   * UI State
   * --------
   * search          → text filter
   * activeTag       → tag filter
   * activeBookId    → book filter
   * selectedIds     → multi‑select
   * showSettings    → settings screen
   * editMode        → inline vs modal editing
   * editingBookmark → currently edited page
   * showAddModal    → add page modal
   * showBookManager → book manager modal
   */
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [editMode, setEditMode] = useState<"modal" | "inline">("modal");
  const [editingBookmark, setEditingBookmark] =
    useState<RichBookmark | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBookManager, setShowBookManager] = useState(false);

  /**
   * tags
   * ----
   * Extracts all unique tag labels from all pages.
   * Used by Sidebar for tag filtering.
   */
  const tags = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookmarks) {
      for (const t of b.tags ?? []) {
        map.set(t.label, (map.get(t.label) ?? 0) + 1);
      }
    }
    return [...map.keys()];
  }, [bookmarks]);

  /**
   * sortedByOrder
   * --------------
   * Produces a list of pages sorted according to:
   *   - activeBookId → use that book's order array
   *   - no book selected → use rootOrder
   *
   * This ensures drag‑and‑drop reordering is reflected in the UI.
   */
  const sortedByOrder = useMemo(() => {
    const idToBookmark = new Map(bookmarks.map((b) => [b.id, b]));
    const result: RichBookmark[] = [];

    if (activeBookId) {
      // Sorting inside a specific book
      const book = books.find((b) => b.id === activeBookId);
      const order = book?.order ?? [];

      // Add pages in the book's order
      for (const id of order) {
        const b = idToBookmark.get(id);
        if (b) result.push(b);
      }

      // Add any pages in this book that aren't in the order array yet
      for (const b of bookmarks) {
        if (b.bookId === activeBookId && !order.includes(b.id)) {
          result.push(b);
        }
      }
    } else {
      // Sorting ungrouped pages (root)
      for (const id of rootOrder) {
        const b = idToBookmark.get(id);
        if (b && !b.bookId) result.push(b);
      }

      // Add any ungrouped pages not in rootOrder yet
      for (const b of bookmarks) {
        if (!b.bookId && !rootOrder.includes(b.id)) {
          result.push(b);
        }
      }

      // Add grouped pages (not sorted here)
      for (const b of bookmarks) {
        if (b.bookId) result.push(b);
      }
    }

    return result;
  }, [bookmarks, books, rootOrder, activeBookId]);

  /**
   * filtered
   * --------
   * Applies:
   *   - search filter
   *   - tag filter
   *   - book filter
   */
  const filtered = useMemo(() => {
    let list = sortedByOrder;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          b.tags?.some((t) => t.label.toLowerCase().includes(q))
      );
    }

    if (activeTag) {
      list = list.filter((b) =>
        b.tags?.some((t) => t.label === activeTag)
      );
    }

    if (activeBookId) {
      list = list.filter((b) => b.bookId === activeBookId);
    }

    return list;
  }, [sortedByOrder, search, activeTag, activeBookId]);

  /**
   * sortedPinned
   * -------------
   * Pinned pages have their own ordering array (pinnedOrder).
   * This produces a sorted list for the Pinned section.
   */
  const sortedPinned = useMemo(() => {
    const pinned = bookmarks.filter((b) => b.pinned);
    const idToBookmark = new Map(pinned.map((b) => [b.id, b]));
    const result: RichBookmark[] = [];

    // Add in pinnedOrder
    for (const id of pinnedOrder) {
      const b = idToBookmark.get(id);
      if (b) result.push(b);
    }

    // Add any pinned pages not in pinnedOrder yet
    for (const b of pinned) {
      if (!pinnedOrder.includes(b.id)) result.push(b);
    }

    return result;
  }, [bookmarks, pinnedOrder]);

  /**
   * handleImport
   * ------------
   * Imports HTML bookmarks (Netscape format).
   */
  function handleImport(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(importHtml);
  }

  /**
   * handleExport
   * ------------
   * Exports the entire library (pages + books + ordering) as JSON.
   */
  function handleExport() {
    const data = JSON.stringify(
      { bookmarks, books, rootOrder, pinnedOrder },
      null,
      2
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "library.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * handleInlineSave
   * ----------------
   * Saves inline edits (title + URL).
   */
  function handleInlineSave(updated: RichBookmark) {
    updateBookmark(updated);
  }

  /**
   * handleRetag
   * -----------
   * Adds a user tag to a page.
   */
  function handleRetag(b: RichBookmark, tag?: string) {
    const newTag = tag ?? prompt("Tag to apply?");
    if (!newTag) return;

    const updated: RichBookmark = {
      ...b,
      tags: [
        ...(b.tags ?? []),
        { label: newTag, type: "user" as const }
      ],
      updatedAt: Date.now()
    };

    retag(updated);
  }

  /**
   * handleTagClick
   * --------------
   * Clicking a tag chip filters by that tag.
   */
  function handleTagClick(tag: string) {
    setActiveTag(tag);
  }

  /**
   * handleReorderMain
   * ------------------
   * Called when drag‑and‑drop reorders pages inside:
   *   - a book (activeBookId != null)
   *   - root (activeBookId == null)
   */
  function handleReorderMain(ids: string[]) {
    reorderBookPages(activeBookId, ids);
  }

  /**
   * handleReorderPinned
   * --------------------
   * Called when pinned pages are reordered.
   */
  function handleReorderPinned(ids: string[]) {
    reorderPinned(ids);
  }

  /**
   * handleMoveToBook
   * -----------------
   * Moves a page to a different book (or to root).
   */
  function handleMoveToBook(id: string, bookId: string | null) {
    assignBookmarkToBook(id, bookId);
  }

  /**
   * booksWithCounts
   * ----------------
   * Used by BookManagerModal to show how many pages each book contains.
   */
  const booksWithCounts: (Book & { pageCount: number })[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bookmarks) {
      if (b.bookId) {
        counts.set(b.bookId, (counts.get(b.bookId) ?? 0) + 1);
      }
    }
    return books.map((book) => ({
      ...book,
      pageCount: counts.get(book.id) ?? 0
    }));
  }, [books, bookmarks]);

  return (
    <>
      <Layout
        sidebar={
          <Sidebar
            onAdd={() => setShowAddModal(true)}
            search={search}
            setSearch={setSearch}
            tags={tags}
            activeTag={activeTag}
            setActiveTag={setActiveTag}
            books={books}
            activeBookId={activeBookId}
            setActiveBookId={setActiveBookId}
            onCreateBook={addBook}
            onImport={handleImport}
            onExport={handleExport}
            onOpenSettings={() => setShowSettings(true)}
            onOpenBookManager={() => setShowBookManager(true)}
          />
        }
      >
        {showSettings ? (
          <SettingsScreen
            theme={theme}
            setTheme={setTheme}
            editMode={editMode}
            setEditMode={setEditMode}
          />
        ) : (
          <>
            {/* Pinned section (sortable) */}
            <PinnedBookmarks
              bookmarks={sortedPinned}
              books={books}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              editMode={editMode}
              onDelete={deleteBookmark}
              onPin={togglePin}
              onRetag={handleRetag}
              onEditRequest={setEditingBookmark}
              onSaveInline={handleInlineSave}
              onTagClick={handleTagClick}
              onReorderPinned={handleReorderPinned}
            />

            {/* Main list (sortable) */}
            <BookmarkList
              bookmarks={filtered}
              books={books}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              editMode={editMode}
              onDelete={deleteBookmark}
              onPin={togglePin}
              onRetag={handleRetag}
              onEditRequest={setEditingBookmark}
              onSaveInline={handleInlineSave}
              onTagClick={handleTagClick}
              onReorder={handleReorderMain}
              onMoveToBook={handleMoveToBook}
            />
          </>
        )}
      </Layout>

      {/* Edit Page Modal */}
      {editingBookmark && editMode === "modal" && (
        <EditBookmarkModal
          bookmark={editingBookmark}
          books={books}
          onCreateBook={addBook}
          onSave={updateBookmark}
          onClose={() => setEditingBookmark(null)}
        />
      )}

      {/* Add Page Modal */}
      {showAddModal && (
        <AddBookmarkModal
          books={books}
          onAddPage={addBookmark}
          onCreateBook={addBook}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Book Manager Modal */}
      {showBookManager && (
        <BookManagerModal
          books={booksWithCounts}
          onReorderBooks={reorderBooks}
          onRenameBook={renameBook}
          onDeleteBook={deleteBook}
          onClose={() => setShowBookManager(false)}
        />
      )}
    </>
  );
}

import { useState, useMemo } from "react";
import Layout from "./components/Layout";
import Sidebar from "./components/Sidebar";
import BookmarkList from "./components/BookmarkList";
import PinnedBookmarks from "./components/PinnedBookmarks";
import EditBookmarkModal from "./components/EditBookmarkModal";
import AddBookmarkModal from "./components/AddBookmarkModal";
import SettingsScreen from "./components/SettingsScreen";
import BookManagerModal from "./components/BookManagerModal";

import { useBookmarks } from "./hooks/useBookmarks";
import type { RichBookmark } from "./models/RichBookmark";
import type { Book } from "./models/Book";

import { useTheme } from "./hooks/useTheme";

/**
 * App.tsx
 * --------
 * Top‑level orchestrator for the Emperor Library UI.
 * Wires together:
 *   - Books (groups)
 *   - Pages (bookmarks)
 *   - Drag‑and‑drop ordering
 *   - Pinned pages
 *   - Multi‑select actions
 *   - Add/Edit modals
 *   - Book Manager modal
 *   - Sidebar navigation
 */

export default function App() {
  /**
   * useBookmarks()
   * --------------
   * Central data source for the app:
   *   - bookmarks (pages)
   *   - books (groups)
   *   - rootOrder (ungrouped ordering)
   *   - pinnedOrder (pinned ordering)
   *   - CRUD + ordering helpers
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
    renameBook,
    deleteBook,

    assignBookmarkToBook,
    reorderBookPages,
    reorderBooks,
    reorderPinned
  } = useBookmarks();

  const { theme, setTheme } = useTheme();

  /**
   * UI state
   * --------
   * search        → text query
   * activeTags    → tag filters (multi‑select, OR logic)
   * activeBookId  → current book context
   * selectedIds   → multi‑select for bulk actions
   * showSettings  → settings screen
   * editMode      → inline vs modal editing
   * editingBookmark → currently edited page (modal)
   * showAddModal  → add page modal
   * showBookManager → book manager modal
   */
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
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
   * Collect all unique tag labels across pages.
   * Used by Sidebar for tag filtering controls.
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
   *   - no book selected → use rootOrder (ungrouped first)
   *
   * This list is the ordered, unfiltered source of truth for the main list.
   * Filtering (search/tags/book) happens inside BookmarkList.
   */
  const sortedByOrder = useMemo(() => {
    const idToBookmark = new Map(bookmarks.map((b) => [b.id, b]));
    const result: RichBookmark[] = [];

    if (activeBookId) {
      // Sorting inside a specific book
      const book = books.find((b) => b.id === activeBookId);
      const order = book?.order ?? [];

      // Ordered pages in this book
      for (const id of order) {
        const b = idToBookmark.get(id);
        if (b) result.push(b);
      }

      // Any pages in this book not yet in order
      for (const b of bookmarks) {
        if (b.bookId === activeBookId && !order.includes(b.id)) {
          result.push(b);
        }
      }
    } else {
      // Root (ungrouped) ordering
      for (const id of rootOrder) {
        const b = idToBookmark.get(id);
        if (b && !b.bookId) result.push(b);
      }

      // Any ungrouped pages not yet in rootOrder
      for (const b of bookmarks) {
        if (!b.bookId && !rootOrder.includes(b.id)) {
          result.push(b);
        }
      }

      // Grouped pages (not sorted here; they can appear in their own views)
      for (const b of bookmarks) {
        if (b.bookId) result.push(b);
      }
    }

    return result;
  }, [bookmarks, books, rootOrder, activeBookId]);

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

    for (const id of pinnedOrder) {
      const b = idToBookmark.get(id);
      if (b) result.push(b);
    }

    // Any pinned pages not yet in pinnedOrder
    for (const b of pinned) {
      if (!pinnedOrder.includes(b.id)) result.push(b);
    }

    return result;
  }, [bookmarks, pinnedOrder]);

  function handleImport(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(importHtml);
  }

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

  function handleInlineSave(updated: RichBookmark) {
    updateBookmark(updated);
  }

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
   * Toggle a tag in the activeTags array (multi‑select, OR logic).
   * Used by both Sidebar tag chips and BookmarkCard tag chips.
   */
  function handleTagClick(tag: string) {
    setActiveTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  }

  /**
   * handleReorderMain
   * ------------------
   * Reorders pages either inside a book or in the root context.
   * The IDs array always comes from the ordered, unfiltered list.
   */
  function handleReorderMain(ids: string[]) {
    reorderBookPages(activeBookId, ids);
  }

  function handleReorderPinned(ids: string[]) {
    reorderPinned(ids);
  }

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
            activeTags={activeTags}
            setActiveTags={setActiveTags}
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
              activeTags={activeTags}
              onDelete={deleteBookmark}
              onPin={togglePin}
              onRetag={handleRetag}
              onEditRequest={setEditingBookmark}
              onSaveInline={handleInlineSave}
              onTagClick={handleTagClick}
              onReorderPinned={handleReorderPinned}
            />

            {/* Main list (sortable, filtering handled inside) */}
            <BookmarkList
              bookmarks={sortedByOrder}
              books={books}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              editMode={editMode}
              search={search}
              activeTags={activeTags}
              activeBookId={activeBookId}
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

      {/* Edit Page Modal (modal mode only) */}
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
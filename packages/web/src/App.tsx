import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragCancelEvent,
  DragOverlay
} from "@dnd-kit/core";
import {
  arrayMove
} from "@dnd-kit/sortable";
import Layout from "./components/Layout";
import Sidebar from "./components/Sidebar";
import BookmarkList from "./components/BookmarkList";
import PinnedBookmarks from "./components/PinnedBookmarks";
import EditBookmarkModal from "./components/EditBookmarkModal";
import AddBookmarkModal from "./components/AddBookmarkModal";
import SettingsScreen from "./components/SettingsScreen";
import BookManagerModal from "./components/BookManagerModal";
import Breadcrumb from "./components/Breadcrumb";

import { useBookmarks } from "./hooks/useBookmarks";
import type { RichBookmark } from "./models/RichBookmark";
import type { Book } from "./models/Book";

import { useTheme } from "./hooks/useTheme";

/**
 * App.tsx
 * --------
 * Top‑level orchestrator for the Emperor Library UI.
 *
 * Responsibilities:
 *   - Owns all application‑level state
 *   - Connects useBookmarks() domain logic to UI components
 *   - Wires up:
 *       • Books (groups)
 *       • Pages (bookmarks)
 *       • Drag‑and‑drop ordering
 *       • Pinned pages
 *       • Multi‑select actions
 *       • Add/Edit modals
 *       • Book Manager modal
 *       • Sidebar navigation
 *
 * ARCHITECTURE NOTE
 * -----------------
 * App.tsx provides:
 *   - Ordered, unfiltered lists (sortedByOrder, sortedPinned)
 *   - Global state (search, activeTags, activeBookId)
 *   - CRUD + ordering handlers
 *
 * BookmarkList handles:
 *   - Filtering (search, tags, book)
 *   - Drag‑and‑drop reordering
 *
 * PinnedBookmarks handles:
 *   - Independent pinned ordering
 *
 * This separation keeps App.tsx declarative and predictable.
 */

export default function App() {
  /**
   * useBookmarks()
   * --------------
   * Central domain data source:
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
    moveBook,

    assignBookmarkToBook,
    reorderBookPages,
    reorderBooks,
    reorderPinned
  } = useBookmarks();

  /**
   * Theme system
   * ------------
   * Controls dark/light/system mode and edit mode preference.
   */
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
  const [isDraggingBookmark, setIsDraggingBookmark] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  /**
   * activeBookmark
   * ---------------

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
   *
   *   - activeBookId → use that book's order array
   *   - no book selected → use rootOrder (ungrouped first)
   *
   * This list is the ordered, unfiltered source of truth for the main list.
   *
   * IMPORTANT:
   * Filtering (search/tags/book) happens inside BookmarkList.
   * This ensures drag‑and‑drop always uses the full ordered list.
   */
  const sortedByOrder = useMemo(() => {
    const idToBookmark = new Map(bookmarks.map((b) => [b.id, b]));
    const result: RichBookmark[] = [];

    if (activeBookId) {
      const book = books.find((b) => b.id === activeBookId);
      const order = book?.order ?? [];

      for (const id of order) {
        const b = idToBookmark.get(id);
        if (b) result.push(b);
      }

      for (const b of bookmarks) {
        if (b.bookId === activeBookId && !order.includes(b.id)) {
          result.push(b);
        }
      }
    } else {
      for (const id of rootOrder) {
        const b = idToBookmark.get(id);
        if (b && !b.bookId) result.push(b);
      }

      for (const b of bookmarks) {
        if (!b.bookId && !rootOrder.includes(b.id)) {
          result.push(b);
        }
      }

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
   *
   * PinnedBookmarks handles its own drag‑and‑drop reordering.
   */
  const sortedPinned = useMemo(() => {
    const pinned = bookmarks.filter((b) => b.pinned);
    const idToBookmark = new Map(pinned.map((b) => [b.id, b]));
    const result: RichBookmark[] = [];

    for (const id of pinnedOrder) {
      const b = idToBookmark.get(id);
      if (b) result.push(b);
    }

    for (const b of pinned) {
      if (!pinnedOrder.includes(b.id)) result.push(b);
    }

    return result;
  }, [bookmarks, pinnedOrder]);

  /**
   * Import / Export helpers
   * -----------------------
   * handleImport → imports Netscape HTML bookmarks.
   * handleExport → exports all data as JSON.
   */
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

  /**
   * handleInlineSave
   * ----------------
   * Saves inline bookmark edits.
   */
  function handleInlineSave(updated: RichBookmark) {
    updateBookmark(updated);
  }

  /**
   * handleRetag
   * -----------
   * Applies a new user tag to a given bookmark.
   * Uses prompt() for now; could be replaced with a richer UI later.
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
   * Drag event handlers
   * -------------------
   * Handle drag events for both bookmark reordering and bookmark-to-book drops.
   */
  function handleDragStart(event: DragStartEvent) {
    const draggedId = event.active.id as string;
    setActiveId(draggedId);
    
    // Check if the dragged item is a bookmark (not a book)
    const isDraggedItemABook = books.some(b => b.id === draggedId);
    setIsDraggingBookmark(!isDraggedItemABook);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    setActiveId(null);
    setIsDraggingBookmark(false);

    if (!over) return;

    const draggedId = active.id as string;
    const targetId = over.id as string;

    // Check if the dragged item is a book or a bookmark
    const isDraggedItemABook = books.some(b => b.id === draggedId);

    if (isDraggedItemABook) {
      // Handle book-to-book drag
      if (active.id === over.id) return;

      const draggedBookId = draggedId;

      // If dropping on "All Pages", move to root
      if (targetId === "all-pages") {
        moveBook(draggedBookId, null);
        return;
      }

      // Find the target book
      const targetBook = books.find(b => b.id === targetId);
      if (targetBook) {
        moveBook(draggedBookId, targetId);
      }
    } else {
      // Handle bookmark-to-book drop
      // Check if dropping on a book (any ID that's not a bookmark ID)
      const isTargetABook = books.some(b => b.id === targetId) || targetId === "all-pages";
      
      if (isTargetABook) {
        const bookmarkId = draggedId;
        const bookId = targetId === "all-pages" ? null : targetId;
        assignBookmarkToBook(bookmarkId, bookId);
        return;
      }

      // Handle bookmark reordering
      if (active.id === over.id) return;

      // Reordering MUST use the full ordered list, not the filtered subset.
      const ids = sortedByOrder.map((b) => b.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(ids, oldIndex, newIndex);
      handleReorderMain(newOrder);
    }
  }

  function handleDragCancel(_event: DragCancelEvent) {
    setActiveId(null);
    setIsDraggingBookmark(false);
  }

  /**
   * activeBookmark
   * ---------------
   * Used by DragOverlay to render a visual clone while dragging.
   */
  const activeBookmark =
    activeId != null ? bookmarks.find((b) => b.id === activeId) : null;

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
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
            onMoveBook={moveBook}
            onBookmarkDrop={assignBookmarkToBook}
            onImport={handleImport}
            onExport={handleExport}
            onOpenSettings={() => setShowSettings(true)}
            onOpenBookManager={() => setShowBookManager(true)}
            isDraggingBookmark={isDraggingBookmark}
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
            {/* Pinned section (sortable, independent ordering) */}
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

            {/* Breadcrumb navigation */}
            <Breadcrumb
              books={books}
              activeBookId={activeBookId}
              onBookClick={setActiveBookId}
            />

            {/* Main list (sortable, filtering handled inside BookmarkList) */}
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

      {/* DragOverlay for bookmark dragging */}
      <DragOverlay>
        {activeBookmark ? (
          <div className="rotate-3 opacity-90">
            {/* Simple overlay - could be enhanced with BookmarkCard if needed */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border max-w-md">
              <h3 className="font-medium text-sm truncate">{activeBookmark.title}</h3>
              <p className="text-xs text-gray-500 truncate">{activeBookmark.url}</p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragCancelEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

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
 *   - Filtering (search/tags/book)
 *
 * PinnedBookmarks handles:
 *   - Independent pinned ordering
 *
 * BookTree handles:
 *   - Inline creation of books/sub‑books
 *   - Nested drag‑and‑drop
 *   - Expand/collapse
 *
 * Sidebar handles:
 *   - Navigation
 *   - Tag filters
 *   - Import/Export
 *   - Opening Book Manager modal
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
   * Controls dark/light/system mode and accent color.
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
  const [editMode, setEditMode] = useState<"modal" | "inline">("inline");
  const [editingBookmark, setEditingBookmark] = useState<RichBookmark | null>(
    null
  );
  const [showAddModal, setShowAddModal] = useState(false);

  // ⭐ Book Manager modal (the only modal for book creation)
  const [showBookManager, setShowBookManager] = useState(false);

  const [isDraggingBookmark, setIsDraggingBookmark] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  /**
   * DnD Sensors
   * -----------
   * Pointer sensor with activation constraint so drags start only
   * after small movement. Prevents accidental drags on click.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    })
  );

  /**
   * Inline book creation (BookTree only)
   * ------------------------------------
   * BookTree handles inline creation of books/sub‑books.
   */
  function handleInlineCreateBook(parentId: string | null, name: string) {
    addBook(name, parentId);
  }

  /**
   * Modal book creation (Sidebar only)
   * ----------------------------------
   */
  function handleModalCreateBook() {
    setShowBookManager(true);
  }

  /**
   * tags
   * ----
   * Collect all unique tag labels across pages.
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
   * Ordered, unfiltered source of truth for the main list.
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
   */
  function handleInlineSave(updated: RichBookmark) {
    updateBookmark(updated);
  }

  /**
   * handleRetag
   * -----------
   */
  function handleRetag(b: RichBookmark, tag?: string) {
    const newTag = tag ?? prompt("Tag to apply?");
    if (!newTag) return;

    const updated: RichBookmark = {
      ...b,
      tags: [...(b.tags ?? []), { label: newTag, type: "user" }],
      updatedAt: Date.now()
    };

    retag(updated);
  }

  /**
   * handleTagClick
   * --------------
   */
  function handleTagClick(tag: string) {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  /**
   * handleReorderMain
   * ------------------
   * NOTE:
   *   When activeBookId is null (All Pages view), we do not attempt
   *   to reorder across different books.
   */
  function handleReorderMain(ids: string[]) {
    if (!activeBookId) return;
    reorderBookPages(activeBookId, ids);
  }

  function handleReorderPinned(ids: string[]) {
    reorderPinned(ids);
  }

  function handleMoveToBook(id: string, bookId: string | null) {
    assignBookmarkToBook(id, bookId);
  }

  /**
   * Book actions for BookTree menu
   * ------------------------------
   */
  function handleRenameBook(bookId: string, newName: string) {
    renameBook(bookId, newName);
  }

  function handleChangeBookIcon(bookId: string, icon: string) {
    console.log("Change icon for book", bookId, "to", icon);
  }

  function handleDeleteBook(bookId: string) {
    deleteBook(bookId);
    if (activeBookId === bookId) {
      setActiveBookId(null);
    }
  }

  function openAllBookmarksInBook(bookId: string) {
    const pages = bookmarks.filter((b) => b.bookId === bookId);
    for (const page of pages) {
      if (!page.url) continue;
      window.open(page.url, "_blank", "noopener,noreferrer");
    }
  }

  function shareBook(bookId: string) {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;
    const shareData = {
      title: book.name,
      text: `Book: ${book.name}`,
      url: window.location.href
    };
    if ((navigator as any).share) {
      (navigator as any).share(shareData).catch(() => {});
    } else {
      alert(`Share "${book.name}"`);
    }
  }

  /**
   * Drag event handlers
   * -------------------
   */
  function handleDragStart(event: DragStartEvent) {
    const draggedId = event.active.id as string;
    setActiveId(draggedId);

    const isDraggedItemABook = books.some((b) => b.id === draggedId);
    setIsDraggingBookmark(!isDraggedItemABook);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveId(null);
    setIsDraggingBookmark(false);

    if (!over) return;

    const draggedId = active.id as string;
    const targetId = over.id as string;

    const isDraggedBook = books.some((b) => b.id === draggedId);

    // Book drag handling
    if (isDraggedBook) {
      if (draggedId === targetId) return;

      if (targetId === "library-root" || targetId === "library-root-zone") {
        moveBook(draggedId, null);
        return;
      }

      const targetBook = books.find((b) => b.id === targetId);
      if (!targetBook) return;

      moveBook(draggedId, targetBook.id);
      return;
    }

    // Bookmark drag handling
    if (targetId === "library-root") {
      assignBookmarkToBook(draggedId, null);
      return;
    }

    const isTargetABook = books.some((b) => b.id === targetId);
    if (isTargetABook) {
      assignBookmarkToBook(draggedId, targetId);
      return;
    }

    // Main list reordering (only when scoped to a book)
    if (!activeBookId) {
      return;
    }

    const ids = sortedByOrder.map((b) => b.id);
    const oldIndex = ids.indexOf(draggedId);
    const newIndex = ids.indexOf(targetId);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(ids, oldIndex, newIndex);
    handleReorderMain(newOrder);
  }

  function handleDragCancel() {
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

  const canReorderMain = activeBookId !== null;

  return (
    <DndContext
      sensors={sensors}
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
            bookmarks={bookmarks}
            activeBookId={activeBookId}
            setActiveBookId={setActiveBookId}
            onCreateBook={handleInlineCreateBook}
            onMoveBook={moveBook}
            onBookmarkDrop={assignBookmarkToBook}
            onImport={handleImport}
            onExport={handleExport}
            onOpenSettings={() => setShowSettings(true)}
            onOpenBookManager={handleModalCreateBook}
            isDraggingBookmark={isDraggingBookmark}
            onRenameBook={handleRenameBook}
            onChangeBookIcon={handleChangeBookIcon}
            onDeleteBook={handleDeleteBook}
            onOpenAllBookmarks={openAllBookmarksInBook}
            onShareBook={shareBook}
          />
        }
      >
        {showSettings ? (
          <SettingsScreen
            theme={theme}
            setTheme={setTheme}
            editMode={editMode}
            setEditMode={setEditMode}
            onClose={() => setShowSettings(false)}
          />
        ) : (
          <>
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
              onMoveToBook={handleMoveToBook}
            />

            <Breadcrumb
              books={books}
              activeBookId={activeBookId}
              onBookClick={setActiveBookId}
            />

            <BookmarkList
              bookmarks={sortedByOrder}
              books={books}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              editMode={editMode}
              search={search}
              activeTags={activeTags}
              activeBookId={activeBookId}
              canReorder={canReorderMain}
              activeDragId={activeId}
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

      {editingBookmark && editMode === "modal" && (
        <EditBookmarkModal
          bookmark={editingBookmark}
          books={books}
          onCreateBook={addBook}
          onSave={updateBookmark}
          onClose={() => setEditingBookmark(null)}
        />
      )}

      {showAddModal && (
        <AddBookmarkModal
          books={books}
          onAddPage={addBookmark}
          onCreateBook={addBook}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showBookManager && (
        <BookManagerModal
          books={booksWithCounts}
          onReorderBooks={reorderBooks}
          onRenameBook={renameBook}
          onDeleteBook={deleteBook}
          onCreateBook={addBook}
          onClose={() => setShowBookManager(false)}
        />
      )}

      <DragOverlay
        adjustScale={false}
        dropAnimation={null}
        style={{
          transform: "translate(-4px, -10px)"
        }}
      >
        {activeBookmark ? (
          <div className="rotate-3 opacity-90">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border max-w-md">
              <h3 className="font-medium text-sm truncate">
                {activeBookmark.title}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {activeBookmark.url}
              </p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
import EditBookmarkModal from "./components/modals/EditBookmarkModal";
import AddBookmarkModal from "./components/modals/AddBookmarkModal";
import SettingsScreen from "./components/SettingsScreen";
import BookManagerModal from "./components/modals/BookManagerModal";
import Breadcrumb from "./components/Breadcrumb";
import BookmarkCard from "./components/BookmarkCard";

import { useBookmarks } from "./hooks/useBookmarks";
import type { RichBookmark } from "./models/RichBookmark";
import type { Book } from "./models/Book";
import { SyncDebugPanel } from "./components/SyncDebugPanel";

import { useTheme } from "./hooks/useTheme";
import { useAISettings } from "./hooks/useAISettings";
import { useAppSettings } from "./hooks/useAppSettings";
import { sortBookmarks } from "./utils/bookmarkSorter";

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
 * DESIGN NOTE
 * -----------
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
   *
   * NOTE:
   *   The raw addBook signature comes from the hook. We adapt it to the
   *   UI‑facing signature (parentId, name) via a small wrapper below.
   */
  const {
    bookmarks,
    books,
    rootOrder,
    pinnedOrder,

    addBookmark,
    deleteBookmark,
    togglePin,
    toggleReadLater,
    retag,
    updateBookmark,
    importHtml,

    addBook: rawAddBook,
    renameBook,
    deleteBook,
    moveBook,
    updateBook,
    updateBookIcon,

    assignBookmarkToBook,
    reorderBookPages,
    reorderBooks,
    reorderPinned
  } = useBookmarks();

  /**
   * addBook
   * -------
   * UI‑facing signature:
   *   (parentId: string | null, name: string) => void
   *
   * This matches:
   *   - BookTree onCreateBook
   *   - Sidebar onCreateBook
   */
  function addBook(parentId: string | null, name: string): void {
    (rawAddBook as any)(name, parentId);
  }

  /**
   * addBookmarkWithDescription
   * --------------------------
   * UI‑facing signature for modals:
   *   (title: string, url: string, description: string | null, bookId: string | null) => void
   *
   * This matches the modal interfaces.
   */
  async function addBookmarkWithDescription(
    title: string,
    url: string,
    description: string | null,
    bookId: string | null
  ): Promise<void> {
    await addBookmark(title, url, bookId);
  }

  /**
   * Theme system
   * ------------
   * Controls dark/light/system mode and accent color.
   */
  const { theme, setTheme } = useTheme();

  /**
   * AI settings system
   * ------------------
   * Controls AI provider selection and API keys.
   */
  const { settings: aiSettings, setSettings: setAISettings } = useAISettings();

  /**
   * App settings system
   * -------------------
   * Comprehensive application preferences.
   */
  const { settings: appSettings, updateSetting: updateAppSetting } = useAppSettings();

  /**
   * UI state
   * --------
   */
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeStatuses, setActiveStatuses] = useState<string[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"default" | "recent">("default");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [editMode, setEditMode] = useState<"modal" | "inline">("inline");
  const [editingBookmark, setEditingBookmark] = useState<RichBookmark | null>(
    null
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBookManager, setShowBookManager] = useState(false);

  const [isDraggingBookmark, setIsDraggingBookmark] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [keyboardNavigationIndex, setKeyboardNavigationIndex] = useState<number>(-1);

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
   * statuses
   * --------
   * Collect all unique status values across pages.
   */
  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookmarks) {
      if (b.status) {
        set.add(b.status);
      }
    }
    return [...set];
  }, [bookmarks]);

  /**
   * handleActivateBook
   * ------------------
   * Clicking a book label in BookmarkCard should:
   *   - Set activeBookId
   *   - Clear multi‑select selection
   */
  function handleActivateBook(bookId: string) {
    setActiveBookId(bookId);
    setSelectedIds([]);
  }

  /**
   * sortedByOrder
   * --------------
   * Ordered, unfiltered source of truth for the main list.
   * Book scoping happens later in BookmarkList.
   * Uses configurable sorting from app settings.
   */
  const sortedByOrder = useMemo(() => {
    const idToBookmark = new Map(bookmarks.map((b) => [b.id, b]));
    let result: RichBookmark[] = [];

    if (activeBookId) {
      const book = books.find((b) => b.id === activeBookId);
      const order = Array.isArray(book?.order) ? book.order : [];

      // Get all bookmarks for this book
      for (const id of order) {
        const b = idToBookmark.get(id);
        if (b) result.push(b);
      }
      for (const b of bookmarks) {
        if (b.bookId === activeBookId && !order.includes(b.id)) {
          result.push(b);
        }
      }

      // Apply configurable sorting if not manual
      if (appSettings.defaultSortMethod !== 'manual') {
        result = sortBookmarks(result, appSettings.defaultSortMethod, appSettings.defaultSortDirection);
      }
    } else {
      // For "All Pages", collect all bookmarks
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

      // Apply configurable sorting
      if (appSettings.defaultSortMethod !== 'manual') {
        result = sortBookmarks(result, appSettings.defaultSortMethod, appSettings.defaultSortDirection);
      }
    }

    return result;
  }, [bookmarks, books, rootOrder, activeBookId, appSettings.defaultSortMethod, appSettings.defaultSortDirection]);

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
   * handleImport / handleExport
   * ---------------------------
   * Low‑friction data in/out.
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
   * Used by BookmarkCard inline editing.
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
   * Main list reordering is only valid when scoped to a specific book.
   * On "All Pages", this is disabled (no-op).
   */
  function handleReorderMain(ids: string[]) {
    if (!activeBookId) return;
    reorderBookPages(activeBookId, ids);
  }

  /**
   * handleReorderPinned
   * --------------------
   */
  function handleReorderPinned(ids: string[]) {
    reorderPinned(ids);
  }

  /**
   * handleMoveToBook
   * -----------------
   */
  function handleMoveToBook(id: string, bookId: string | null) {
    assignBookmarkToBook(id, bookId);
  }

  /**
   * Book actions
   * ------------
   */
  function handleRenameBook(bookId: string, newName: string) {
    renameBook(bookId, newName);
  }

  function handleChangeBookIcon(bookId: string, icon: string | null) {
    console.log("Change icon for book", bookId, "to", icon);
    updateBookIcon(bookId, icon);
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
      (navigator as any).share(shareData).catch(() => { });
    } else {
      alert(`Share "${book.name}"`);
    }
  }

  /**
   * DnD handlers
   * ------------
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

  function handleDragCancel(_event: DragCancelEvent) {
    setActiveId(null);
    setIsDraggingBookmark(false);
  }

  /**
   * activeBookmark
   * ---------------
   * Used to render the drag overlay preview.
   */
  const activeBookmark =
    activeId != null ? bookmarks.find((b) => b.id === activeId) : null;

  /**
   * booksWithCounts
   * ----------------
   * Enrich books with page counts for the Book Manager.
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

  /**
   * canReorderMain
   * ---------------
   * Reordering in the main list is only enabled when scoped to a book.
   * On "All Pages", this is false and the UI should reflect that.
   */
  const canReorderMain = activeBookId !== null;

  /**
   * Keyboard Shortcuts
   * ------------------
   * j/k navigation, d=delete, f=favorite, etc.
   */
  const handleKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Don't trigger shortcuts when modals are open
    if (showAddModal || showBookManager || editingBookmark || showSettings) {
      return;
    }

    const bookmarksInView = sortedByOrder; // Current visible bookmarks

    switch (event.key.toLowerCase()) {
      case 'j':
        // Navigate down
        event.preventDefault();
        if (bookmarksInView.length > 0) {
          const newIndex = keyboardNavigationIndex < bookmarksInView.length - 1
            ? keyboardNavigationIndex + 1
            : 0;
          setKeyboardNavigationIndex(newIndex);
          setSelectedIds([bookmarksInView[newIndex].id]);
        }
        break;

      case 'k':
        // Navigate up
        event.preventDefault();
        if (bookmarksInView.length > 0) {
          const newIndex = keyboardNavigationIndex > 0
            ? keyboardNavigationIndex - 1
            : bookmarksInView.length - 1;
          setKeyboardNavigationIndex(newIndex);
          setSelectedIds([bookmarksInView[newIndex].id]);
        }
        break;

      case 'd':
        // Delete selected bookmark
        event.preventDefault();
        if (selectedIds.length === 1) {
          const bookmark = bookmarks.find(b => b.id === selectedIds[0]);
          if (bookmark && confirm(`Delete "${bookmark.title}"?`)) {
            deleteBookmark(selectedIds[0]);
            setSelectedIds([]);
            setKeyboardNavigationIndex(-1);
          }
        }
        break;

      case 'f':
        // Toggle favorite (pin) status
        event.preventDefault();
        if (selectedIds.length === 1) {
          togglePin(selectedIds[0]);
        }
        break;

      case 'enter':
        // Open selected bookmark
        event.preventDefault();
        if (selectedIds.length === 1) {
          const bookmark = bookmarks.find(b => b.id === selectedIds[0]);
          if (bookmark?.url) {
            window.open(bookmark.url, '_blank');
          }
        }
        break;

      case 'escape':
        // Clear selection
        event.preventDefault();
        setSelectedIds([]);
        setKeyboardNavigationIndex(-1);
        break;
    }
  }, [
    selectedIds, bookmarks, keyboardNavigationIndex, sortedByOrder,
    deleteBookmark, togglePin, showAddModal, showBookManager,
    editingBookmark, showSettings
  ]);

  // Set up keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleKeyboardShortcuts]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Global DragOverlay for bookmarks */}
      <DragOverlay adjustScale={false} dropAnimation={null}>
        {activeBookmark ? (
          <div className="rotate-3 opacity-90 pointer-events-none max-w-md -translate-y-2 -translate-x-1">
            <BookmarkCard
              b={activeBookmark}
              selected={false}
              onToggleSelected={() => { }}
              editMode="inline"
              onEditRequest={() => { }}
              onSaveInline={() => { }}
              onDelete={() => { }}
              onPin={() => { }}
              onToggleReadLater={() => { }}
              onRetag={() => { }}
              onTagClick={() => { }}
              books={books}
              activeTags={activeTags}
              onMoveToBook={() => { }}
              canReorder={false}
              onActivateBook={() => { }}
              compact
            />
          </div>
        ) : null}
      </DragOverlay>
      
<div>
  {/* {import.meta.env.VITE_DEBUG_SYNC && <SyncDebugPanel />} */}
  { <SyncDebugPanel />}
</div>
      <Layout
        sidebar={
          <Sidebar
            onAdd={() => setShowAddModal(true)}
            search={search}
            setSearch={setSearch}
            tags={tags}
            activeTags={activeTags}
            setActiveTags={setActiveTags}
            statuses={statuses}
            activeStatuses={activeStatuses}
            setActiveStatuses={setActiveStatuses}
            books={books}
            bookmarks={bookmarks}
            activeBookId={activeBookId}
            setActiveBookId={setActiveBookId}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onCreateBook={addBook}
            onMoveBook={moveBook}
            onBookmarkDrop={assignBookmarkToBook}
            onImport={handleImport}
            onExport={handleExport}
            onOpenSettings={() => setShowSettings(true)}
            onOpenBookManager={() => setShowBookManager(true)}
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
            aiSettings={aiSettings}
            setAISettings={setAISettings}
            appSettings={appSettings}
            updateAppSetting={updateAppSetting}
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
              onToggleReadLater={toggleReadLater}
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
              activeStatuses={activeStatuses}
              activeBookId={activeBookId}
              canReorder={canReorderMain}
              activeDragId={activeId}
              onDelete={deleteBookmark}
              onPin={togglePin}
              onToggleReadLater={toggleReadLater}
              onRetag={handleRetag}
              onEditRequest={setEditingBookmark}
              onSaveInline={handleInlineSave}
              onTagClick={handleTagClick}
              onReorder={handleReorderMain}
              onMoveToBook={handleMoveToBook}
              onActivateBook={handleActivateBook}
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
          onAddPage={addBookmarkWithDescription}
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
    </DndContext>
  );
}

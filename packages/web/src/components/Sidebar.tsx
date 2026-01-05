import React, { useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import BookTree from "./BookTree";
import type { Book } from "../models/Book";
import type { RichBookmark } from "../models/RichBookmark";

/**
 * Sidebar.tsx
 * ------------
 * The Sidebar component serves as the primary navigation and control panel
 * for the Emperor Library application. It provides:
 *
 *   - Search functionality for filtering bookmarks
 *   - Book (group) navigation and selection
 *   - Multi‑tag filtering (OR logic)
 *   - Import/Export tools for data management
 *   - Access to settings and the Book Manager modal
 *
 * The sidebar is intentionally stateless: all state is managed by App.tsx.
 * This keeps the sidebar focused on rendering and user interaction only.
 */

/**
 * Props Interface
 * ---------------
 * Defines the properties required by the Sidebar component.
 * These props connect the sidebar to the application's state and event handlers.
 */
type Props = {
  /** Opens the "Add Page" modal */
  onAdd: () => void;

  /** Current search query string */
  search: string;
  /** Updates the search query */
  setSearch: (v: string) => void;

  /** All unique tag labels extracted from bookmarks */
  tags: string[];
  /** Currently active tag filters (multi‑select, OR logic) */
  activeTags: string[];
  /** Updates the active tag filters array */
  setActiveTags: (tags: string[]) => void;

  /** All unique status labels */
  statuses: string[];
  /** Currently active status filters */
  activeStatuses: string[];
  /** Updates the active status filters array */
  setActiveStatuses: (statuses: string[]) => void;

  /** All books (groups) in the library */
  books: Book[];
  /** All bookmarks in the library (for counts in BookTree) */
  bookmarks: RichBookmark[];
  /** Currently active book ID (null = "All Pages") */
  activeBookId: string | null;
  /** Sets the active book filter */
  setActiveBookId: (id: string | null) => void;

  /** Creates a new book inline (BookTree → App.tsx → addBook) */
  onCreateBook: (parentId: string | null, name: string) => void;
  /** Moves a book to a new parent */
  onMoveBook: (bookId: string, newParentId: string | null) => void;
  /** Handles bookmark drops onto books */
  onBookmarkDrop?: (bookmarkId: string, bookId: string | null) => void;

  /** Imports bookmarks from an HTML file */
  onImport: (e: any) => void;
  /** Exports the entire library as JSON */
  onExport: () => void;

  /** Opens the Settings screen */
  onOpenSettings: () => void;
  /** Opens the Book Manager modal */
  onOpenBookManager: () => void;

  /** Whether a bookmark is currently being dragged (for visual feedback) */
  isDraggingBookmark: boolean;

  /** BookTree advanced actions */
  onRenameBook?: (bookId: string, newName: string) => void;
  onChangeBookIcon?: (bookId: string, icon: string | null) => void;
  onDeleteBook?: (bookId: string) => void;
  onOpenAllBookmarks?: (bookId: string) => void;
  onShareBook?: (bookId: string) => void;
};

/**
 * Sidebar Component
 * -----------------
 * Renders the sidebar UI with:
 *   - Search bar
 *   - Book navigation
 *   - Tag filters (multi‑select)
 *   - Import/Export tools
 *   - Settings access
 *
 * The component is fully controlled by props and contains no internal state.
 */
export default function Sidebar({
  onAdd,
  search,
  setSearch,
  tags,
  activeTags,
  setActiveTags,
  statuses,
  activeStatuses,
  setActiveStatuses,
  books,
  bookmarks,
  activeBookId,
  setActiveBookId,
  onCreateBook,
  onMoveBook,
  onBookmarkDrop,
  onImport,
  onExport,
  onOpenSettings,
  onOpenBookManager,
  isDraggingBookmark,
  onRenameBook,
  onChangeBookIcon,
  onDeleteBook,
  onOpenAllBookmarks,
  onShareBook
}: Props) {
  const [showSearchHelp, setShowSearchHelp] = useState(false);

  /**
   * toggleTag
   * ---------
   * Toggles a tag in the activeTags array.
   * Multi‑select, OR‑logic filtering is handled in BookmarkList.
   */
  function toggleTag(tag: string) {
    setActiveTags(
      activeTags.includes(tag)
        ? activeTags.filter((t) => t !== tag)
        : [...activeTags, tag]
    );
  }

  /**
   * toggleStatus
   * ------------
   * Toggles a status in the activeStatuses array.
   */
  function toggleStatus(status: string) {
    setActiveStatuses(
      activeStatuses.includes(status)
        ? activeStatuses.filter((s) => s !== status)
        : [...activeStatuses, status]
    );
  }

  /**
   * Status display names and emojis
   */
  const statusOptions = [
    { key: "favorite", label: "⭐ Favorite", emoji: "⭐" },
    { key: "read_later", label: "📖 Read Later", emoji: "📖" },
    { key: "archive", label: "📦 Archive", emoji: "📦" },
    { key: "review", label: "🔍 Review", emoji: "🔍" },
    { key: "broken", label: "❌ Broken", emoji: "❌" }
  ];

  return (
    <div className="h-full flex flex-col bg-emperor-sidebar border-r border-emperor-border">
      {/* ------------------------------------------------------------------ */}
      {/* Header Section                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-4 border-b border-emperor-border">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-lg font-semibold">Library</h1>
          <Button size="sm" onClick={onAdd}>
            Add Page
          </Button>
        </div>

        <div className="relative">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages… (try 'url:github' or 'tag:javascript')"
          />
          <button
            onClick={() => setShowSearchHelp(!showSearchHelp)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-emperor-muted hover:text-emperor-text text-sm"
            title="Advanced search help"
          >
            ?
          </button>

          {showSearchHelp && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-emperor-surface border border-emperor-border rounded-md p-3 text-xs z-10 shadow-lg">
              <div className="font-semibold mb-2">Advanced Search</div>
              <div className="space-y-1 text-emperor-muted">
                <div><code>"exact phrase"</code> - Search for exact matches</div>
                <div><code>url:github</code> - Search in URLs</div>
                <div><code>title:react</code> - Search in titles</div>
                <div><code>tag:javascript</code> - Search by tags</div>
                <div><code>status:favorite</code> - Search by status</div>
                <div><code>content:blog</code> - Search in descriptions</div>
                <div><code>notes:important</code> - Search in personal notes</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main Content Area                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        {/* Books */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-emperor-muted text-xs uppercase tracking-wide">
              Books
            </h3>
            <button
              className="text-xs text-emperor-muted hover:text-emperor-text"
              onClick={onOpenBookManager}
            >
              Manage
            </button>
          </div>

          <BookTree
            books={books}
            bookmarks={bookmarks}
            activeBookId={activeBookId}
            onBookClick={setActiveBookId}
            onCreateBook={onCreateBook}
            onMoveBook={onMoveBook}
            onBookmarkDrop={onBookmarkDrop}
            isDraggingBookmark={isDraggingBookmark}
            onRenameBook={onRenameBook}
            onChangeBookIcon={onChangeBookIcon}
            onDeleteBook={onDeleteBook}
            onOpenAllBookmarks={onOpenAllBookmarks}
            onShareBook={onShareBook}
          />
        </div>

        {/* Tags */}
        <div className="px-4">
          <h3 className="text-emperor-muted text-xs uppercase tracking-wide mb-2">
            Tags
          </h3>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isActive = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    isActive
                      ? "bg-emperor-surfaceStrong border-emperor-border"
                      : "border-emperor-border hover:bg-emperor-surface"
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div className="px-4">
          <h3 className="text-emperor-muted text-xs uppercase tracking-wide mb-2">
            Status
          </h3>

          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => {
              const isActive = activeStatuses.includes(status.key);
              return (
                <button
                  key={status.key}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    isActive
                      ? "bg-emperor-surfaceStrong border-emperor-border"
                      : "border-emperor-border hover:bg-emperor-surface"
                  }`}
                  onClick={() => toggleStatus(status.key)}
                >
                  {status.emoji} {status.key.replace("_", " ")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Import / Export */}
        <div className="px-4">
          <h3 className="text-emperor-muted text-xs uppercase tracking-wide mb-2">
            Import / Export
          </h3>

          <div className="flex flex-col gap-2">
            <label className="text-sm">
              <span className="mr-2">Import HTML</span>
              <input type="file" accept=".html" onChange={onImport} />
            </label>

            <Button size="sm" variant="subtle" onClick={onExport}>
              Export JSON
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Footer Section                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-4 border-t border-emperor-border">
        <Button size="sm" variant="subtle" onClick={onOpenSettings}>
          Settings
        </Button>
      </div>
    </div>
  );
}

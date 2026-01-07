import React, { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import BookTree from "./BookTree";
import ImportExportModal from "./modals/ImportExportModal";
import type { Book } from "../models/Book";
import type { RichBookmark } from "../models/RichBookmark";

/**
 * Sidebar.tsx
 * ------------
 * The Sidebar component serves as the primary navigation and control panel
 * for the Emperor Library application. It provides:
 *
 *   - Advanced search functionality with suggestions and help
 *   - Book (group) navigation and selection
 *   - Multi‑tag filtering (OR logic)
 *   - Status filtering (favorite, archive, read_later, etc.)
 *   - Content type filtering (articles, videos, images, etc.)
 *   - Import/Export tools for data management
 *   - Access to settings and the Book Manager modal
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

  /** Current sort mode */
  sortBy: "default" | "recent";
  /** Sets the sort mode */
  setSortBy: (sort: "default" | "recent") => void;

  /** Ref for search input (for keyboard shortcuts) */
  searchInputRef?: React.RefObject<HTMLInputElement>;

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
  sortBy,
  setSortBy,
  searchInputRef,
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
  // Search functionality state
  const [showSearchHelp, setShowSearchHelp] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRefLocal = useRef<HTMLInputElement>(null);

  // Import/Export modal state
  const [showImportExport, setShowImportExport] = useState(false);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('emperor_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        // Ignore invalid data
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('emperor_recent_searches', JSON.stringify(updated));
  };

  // Generate search suggestions
  const searchSuggestions = useMemo(() => {
    const query = search.trim();
    if (!query) return [];

    const suggestions: Array<{ type: string; value: string; label: string; icon?: string }> = [];

    // Recent searches
    const matchingRecent = recentSearches
      .filter(rs => rs.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3);
    matchingRecent.forEach(rs => {
      suggestions.push({
        type: 'recent',
        value: rs,
        label: rs,
        icon: '🕒'
      });
    });

    // Books
    const matchingBooks = books
      .filter(book => book.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3);
    matchingBooks.forEach(book => {
      suggestions.push({
        type: 'book',
        value: `book:${book.id}`,
        label: book.name,
        icon: '📁'
      });
    });

    // Tags
    const matchingTags = tags
      .filter(tag => tag.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3);
    matchingTags.forEach(tag => {
      suggestions.push({
        type: 'tag',
        value: `tag:${tag}`,
        label: tag,
        icon: '#'
      });
    });

    // Field suggestions if typing a field prefix
    if (query.includes(':')) {
      const [field] = query.split(':');
      if (field === 'url') {
        suggestions.push({
          type: 'field',
          value: `${field}:`,
          label: `Search in URLs`,
          icon: '🔗'
        });
      } else if (field === 'title') {
        suggestions.push({
          type: 'field',
          value: `${field}:`,
          label: `Search in titles`,
          icon: '📄'
        });
      } else if (field === 'tag') {
        suggestions.push({
          type: 'field',
          value: `${field}:`,
          label: `Search by tags`,
          icon: '#'
        });
      } else if (field === 'status') {
        suggestions.push({
          type: 'field',
          value: `${field}:`,
          label: `Search by status`,
          icon: '📊'
        });
      }
    }

    return suggestions.slice(0, 8); // Limit to 8 suggestions
  }, [search, books, tags, recentSearches]);

  // Handle keyboard navigation
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showSearchSuggestions || searchSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev < searchSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > -1 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      const suggestion = searchSuggestions[selectedSuggestionIndex];
      if (suggestion) {
        setSearch(suggestion.value);
        setShowSearchSuggestions(false);
        setSelectedSuggestionIndex(-1);
        if (suggestion.type === 'recent') {
          // Don't save if it's already a recent search
        } else {
          saveRecentSearch(suggestion.value);
        }
      }
    } else if (e.key === 'Escape') {
      setShowSearchSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    setShowSearchSuggestions(value.trim().length > 0);
    setSelectedSuggestionIndex(-1);

    // Hide help when typing
    if (showSearchHelp) {
      setShowSearchHelp(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: any) => {
    setSearch(suggestion.value);
    setShowSearchSuggestions(false);
    setSelectedSuggestionIndex(-1);
    if (suggestion.type !== 'recent') {
      saveRecentSearch(suggestion.value);
    }
  };

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

  /**
   * Content type options for filtering
   */
  const contentTypeOptions = [
    { label: "Articles", search: "article OR blog OR news OR post" },
    { label: "Videos", search: "youtube.com OR vimeo.com OR video OR watch" },
    { label: "Images", search: "imgur.com OR flickr.com OR image OR photo OR picture" },
    { label: "Audio", search: "soundcloud.com OR spotify.com OR podcast OR music OR audio" },
    { label: "Documents", search: "pdf OR doc OR docx OR ppt OR xls OR drive.google.com" },
    { label: "Code", search: "github.com OR gitlab.com OR code OR repository OR gist" }
  ];

  /**
   * toggleContentType
   * -----------------
   * Toggles content type filters by adding/removing search terms
   */
  function toggleContentType(contentType: { label: string; search: string }) {
    const isActive = search.includes(contentType.search);
    if (isActive) {
      // Remove the search term
      setSearch(search.replace(new RegExp(`\\s*${contentType.search}\\s*`, 'gi'), '').trim());
    } else {
      // Add the search term
      const newSearch = search ? `${search} ${contentType.search}` : contentType.search;
      setSearch(newSearch);
    }
  }

  /**
   * handleImport
   * ------------
   * Handles importing bookmarks from the ImportExportModal
   */
  async function handleImport(importedBookmarks: RichBookmark[]) {
    // Add each imported bookmark using the existing addBookmark logic
    for (const bookmark of importedBookmarks) {
      try {
        // This will trigger the import logic in useBookmarks
        // We need to convert RichBookmark back to the expected format
        await onImport({
          target: {
            files: [new File([JSON.stringify({
              bookmarks: [bookmark],
              books: []
            })], 'import.json')]
          }
        });
      } catch (error) {
        console.error('Failed to import bookmark:', error);
      }
    }
  }

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
            ref={searchInputRef || searchInputRefLocal}
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search pages… (try 'url:github' or 'tag:javascript')"
          />
          <button
            onClick={() => setShowSearchHelp(!showSearchHelp)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-emperor-muted hover:text-emperor-text text-sm"
            title="Advanced search help"
          >
            ?
          </button>

          {/* Search Suggestions Dropdown */}
          {showSearchSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-emperor-surface border border-emperor-border rounded-md shadow-lg z-20 max-h-64 overflow-y-auto">
              {searchSuggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.value}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-emperor-surfaceStrong flex items-center gap-2 ${
                    index === selectedSuggestionIndex ? 'bg-emperor-accent/10 text-emperor-accent' : ''
                  }`}
                >
                  <span>{suggestion.icon}</span>
                  <span className="flex-1 truncate">{suggestion.label}</span>
                  <span className="text-xs text-emperor-muted capitalize">{suggestion.type}</span>
                </button>
              ))}
            </div>
          )}

          {showSearchHelp && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-emperor-surface border border-emperor-border rounded-md p-3 text-xs z-10 shadow-lg">
              <div className="font-semibold mb-2">Advanced Search</div>
              <div className="space-y-1 text-emperor-muted">
                <div><code>"exact phrase"</code> - Search for exact matches</div>
                <div><code>url:github</code> - Search in URLs</div>
                <div><code>title:react</code> - Search in titles</div>
                <div><code>tag:javascript</code> - Search by tags</div>
                <div><code>status:favorite</code> - Search by status</div>
                <div><code>-tutorial</code> - Exclude words</div>
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

        {/* Content Types */}
        <div className="px-4">
          <h3 className="text-emperor-muted text-xs uppercase tracking-wide mb-2">
            Content Types
          </h3>

          <div className="flex flex-wrap gap-2">
            {contentTypeOptions.map((type) => {
              const isActive = search.includes(type.search);
              return (
                <button
                  key={type.label}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    isActive
                      ? "bg-blue-500/20 border-blue-400 text-blue-300"
                      : "border-emperor-border hover:bg-emperor-surface"
                  }`}
                  onClick={() => toggleContentType(type)}
                  title={`Filter by ${type.label.toLowerCase()}`}
                >
                  {type.label}
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

          <Button size="sm" variant="subtle" onClick={() => setShowImportExport(true)}>
            Import / Export Data
          </Button>
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

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        onImport={handleImport}
        bookmarks={bookmarks}
        books={books}
      />

    </div>
  );
}

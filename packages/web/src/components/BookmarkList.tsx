import React, { useMemo, useState, useCallback } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Fuse from "fuse.js";

import BookmarkCard from "./BookmarkCard";
import MultiSelectToolbar from "./MultiSelectToolbar";
import type { RichBookmark } from "../models/RichBookmark";
import type { Book } from "../models/Book";

// Advanced search utilities
function parseAdvancedSearch(query: string): {
  terms: string[];
  excludedTerms: string[];
  fields: { [key: string]: string[] };
  operators: string[];
} {
  const result = {
    terms: [] as string[],
    excludedTerms: [] as string[],
    fields: {} as { [key: string]: string[] },
    operators: [] as string[]
  };

  // Handle quoted strings first
  const quotedMatches = query.match(/"([^"]*)"/g) || [];
  const quotedTerms = quotedMatches.map(match => match.slice(1, -1));

  // Remove quoted strings from query for further processing
  let processedQuery = query;
  quotedMatches.forEach(match => {
    processedQuery = processedQuery.replace(match, '');
  });

  // Handle field-specific searches
  const fieldRegex = /(\w+):([^\s]+)/g;
  let fieldMatch;
  while ((fieldMatch = fieldRegex.exec(processedQuery)) !== null) {
    const [, field, value] = fieldMatch;
    if (!result.fields[field]) result.fields[field] = [];
    result.fields[field].push(value);
    processedQuery = processedQuery.replace(fieldMatch[0], '');
  }

  // Split remaining query into terms and separate exclusions
  const remainingTerms = processedQuery.trim().split(/\s+/).filter(term => term.length > 0);

  remainingTerms.forEach(term => {
    if (term.startsWith('-')) {
      // Remove the - prefix and add to exclusions
      result.excludedTerms.push(term.slice(1));
    } else {
      result.terms.push(term);
    }
  });

  // Add quoted terms to general terms (quoted terms can't be excluded)
  result.terms.push(...quotedTerms);

  return result;
}

function advancedSearch(bookmarks: RichBookmark[], query: string): RichBookmark[] {
  if (!query.trim()) return bookmarks;

  const parsed = parseAdvancedSearch(query.toLowerCase());

  return bookmarks.filter(bookmark => {
    const searchableText = [
      bookmark.title,
      bookmark.url,
      bookmark.description,
      bookmark.tags?.map(t => t.label).join(' '),
      bookmark.notes
    ].filter(Boolean).join(' ').toLowerCase();

    // Check excluded terms first - if any excluded term is found, reject this bookmark
    if (parsed.excludedTerms.length > 0) {
      const containsExcludedTerm = parsed.excludedTerms.some(excludedTerm =>
        searchableText.includes(excludedTerm.toLowerCase())
      );
      if (containsExcludedTerm) return false;
    }

    // Check field-specific searches
    for (const [field, values] of Object.entries(parsed.fields)) {
      const fieldValue = getFieldValue(bookmark, field)?.toLowerCase();
      if (!fieldValue) return false;

      const matchesAnyValue = values.some(value =>
        fieldValue.includes(value.toLowerCase())
      );
      if (!matchesAnyValue) return false;
    }

    // Check general terms
    if (parsed.terms.length > 0) {
      const matchesAllTerms = parsed.terms.every(term =>
        searchableText.includes(term.toLowerCase())
      );
      if (!matchesAllTerms) return false;
    }

    return true;
  });
}

function getFieldValue(bookmark: RichBookmark, field: string): string | undefined {
  switch (field) {
    case 'title':
      return bookmark.title;
    case 'url':
      return bookmark.url;
    case 'content':
    case 'description':
      return bookmark.description;
    case 'notes':
      return bookmark.notes;
    case 'tag':
    case 'tags':
      return bookmark.tags?.map(t => t.label).join(' ');
    case 'status':
      return bookmark.status;
    default:
      return undefined;
  }
}

/**
 * BookmarkList.tsx
 * -----------------
 * Main scrollable list of bookmark cards with:
 *
 *   - Multi‑select toolbar (delete, tag, pin, move to book)
 *   - Fuzzy search (Fuse.js)
 *   - Multi‑tag filtering (OR logic)
 *   - Optional book scoping (activeBookId)
 *
 * DESIGN NOTE
 * -----------
 * App.tsx passes an *ordered, unfiltered* array of bookmarks into this component.
 * All filtering (search, tags, book) happens inside BookmarkList.
 *
 * IMPORTANT:
 *   The order of `bookmarks` is the DnD source of truth.
 *   Filtering must preserve that order.
 */

type Props = {
  /** Ordered, unfiltered list of bookmarks (source of truth for DnD) */
  bookmarks: RichBookmark[];

  /** All books (for multi‑select "Move to book" action) */
  books: Book[];

  /** IDs of currently selected bookmarks */
  selectedIds: string[];
  /** Updates the selected IDs array */
  setSelectedIds: (ids: string[]) => void;

  /** Edit mode for bookmark cards */
  editMode: "modal" | "inline";

  /** CRUD + action callbacks for individual bookmarks */
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onToggleReadLater: (id: string) => void;
  onRetag: (b: RichBookmark) => void;
  onEditRequest: (b: RichBookmark) => void;
  onSaveInline: (b: RichBookmark) => void;
  onTagClick: (tag: string) => void;

  /** Called when drag‑and‑drop creates a new global order (when scoped to a book) */
  onReorder: (ids: string[]) => void;

  /** Moves a bookmark to a different book (or back to root) */
  onMoveToBook: (id: string, bookId: string | null) => void;

  /** Search query from App.tsx (used for fuzzy search) */
  search: string;

  /** Active tag filters (multi‑select, OR logic) */
  activeTags: string[];

  /** Active status filters */
  activeStatuses: string[];

  /** Active book context (null = show all books) */
  activeBookId: string | null;

  /** Whether reordering is allowed (disabled on All Pages) */
  canReorder: boolean;

  /** Currently active drag ID (from App's DnD context) */
  activeDragId: string | null;

  /** Activates a book when its label is clicked on a card */
  onActivateBook: (bookId: string) => void;
};

export default function BookmarkList({
  bookmarks,
  books,
  selectedIds,
  setSelectedIds,
  editMode,
  onDelete,
  onPin,
  onToggleReadLater,
  onRetag,
  onEditRequest,
  onSaveInline,
  onTagClick,
  onReorder,
  onMoveToBook,
  search,
  activeTags,
  activeStatuses,
  activeBookId,
  canReorder,
  activeDragId,
  onActivateBook
}: Props) {
  /**
   * toggleSelected
   * --------------
   * Toggles a bookmark ID in the selectedIds array.
   * Used by the checkbox inside BookmarkCard.
   */
  function toggleSelected(id: string) {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  /**
   * Multi‑select helpers
   * --------------------
   * Simple bulk actions delegated to App handlers.
   */
  function selectAll() {
    setSelectedIds(bookmarks.map((b) => b.id));
  }

  function clearAll() {
    setSelectedIds([]);
  }

  function deleteSelected() {
    for (const id of selectedIds) onDelete(id);
    setSelectedIds([]);
  }

  function tagSelected() {
    const tag = prompt("Tag to apply to selected pages?");
    if (!tag) return;

    for (const b of bookmarks) {
      if (selectedIds.includes(b.id)) {
        onRetag({
          ...b,
          tags: [...(b.tags ?? []), { label: tag, type: "user" }],
          updatedAt: Date.now()
        });
      }
    }
  }

  function pinSelected() {
    for (const id of selectedIds) onPin(id);
  }

  function unpinSelected() {
    for (const id of selectedIds) onPin(id);
  }

  function moveSelectedToBook(bookId: string | null) {
    for (const id of selectedIds) onMoveToBook(id, bookId);
  }

  /**
   * getDescendantBookIds
   * --------------------
   * Recursively collects all descendant book IDs for a given book.
   * Used for hierarchical bookmark filtering.
   */
  function getDescendantBookIds(bookId: string, allBooks: Book[]): string[] {
    const descendants: string[] = [bookId];
    const children = allBooks.filter((b) => b.parentBookId === bookId);
    
    for (const child of children) {
      descendants.push(...getDescendantBookIds(child.id, allBooks));
    }
    
    return descendants;
  }

  /**
   * filteredBookmarks
   * -----------------
   * Applies:
   *   1. Fuzzy search (Fuse.js)
   *   2. Multi‑tag filtering (OR logic)
   *   3. Status filtering (OR logic)
   *   4. Book context filter (activeBookId + descendants)
   *
   * IMPORTANT:
   *   Filtering happens on the ordered list passed from App.tsx,
   *   preserving DnD ordering semantics within the active scope.
   */
  const filteredBookmarks = useMemo(() => {
    let list = bookmarks;

    /** 1. Advanced search (includes field-specific and quoted searches) */
    const query = search.trim();
    if (query) {
      // Check if query contains advanced search syntax
      const hasFieldSearch = /(\w+):/.test(query) || /"/.test(query);
      if (hasFieldSearch) {
        list = advancedSearch(list, query);
      } else {
        // Fall back to fuzzy search for simple queries
        const fuse = new Fuse(list, {
          keys: ["title", "url", "tags.label", "description", "notes"],
          threshold: 0.35
        });
        list = fuse.search(query).map((r) => r.item);
      }
    }

    /** 2. Multi‑tag OR filtering */
    if (activeTags.length > 0) {
      list = list.filter((b) =>
        b.tags?.some((t) => activeTags.includes(t.label))
      );
    }

    /** 3. Status filtering */
    if (activeStatuses.length > 0) {
      list = list.filter((b) =>
        b.status && activeStatuses.includes(b.status)
      );
    }

    /** 4. Book scoping (includes descendants) */
    if (activeBookId) {
      const descendantBookIds = getDescendantBookIds(activeBookId, books);
      list = list.filter((b) => b.bookId && descendantBookIds.includes(b.bookId));
    }

    return list;
  }, [bookmarks, search, activeTags, activeStatuses, activeBookId, books]);

  /**
   * ids
   * ---
   * SortableContext requires the *full ordered list* of IDs,
   * not the filtered list.
   *
   * This ensures:
   *   - Dragging works even when items are filtered
   *   - DnD ordering is always based on the true source of truth
   */
  const ids = bookmarks.map((b) => b.id);

  return (
    <div>
      {/* Multi‑select toolbar (bulk actions) */}
      <MultiSelectToolbar
        selectedCount={selectedIds.length}
        totalCount={bookmarks.length}
        onSelectAll={selectAll}
        onClearAll={clearAll}
        onDeleteSelected={deleteSelected}
        onTagSelected={tagSelected}
        onPinSelected={pinSelected}
        onUnpinSelected={unpinSelected}
        books={books}
        onMoveSelectedToBook={moveSelectedToBook}
      />

      {/* Bulk Status Change Toolbar */}
      {selectedIds.length > 1 && (
        <div className="mb-4 p-3 bg-emperor-surfaceStrong border border-emperor-border rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {selectedIds.length} bookmarks selected
            </span>
            <div className="flex gap-2">
              <span className="text-xs text-emperor-muted">Change status:</span>
              {[
                { key: 'active', label: 'Active', emoji: '📄' },
                { key: 'favorite', label: 'Favorite', emoji: '⭐' },
                { key: 'read_later', label: 'Read Later', emoji: '📖' },
                { key: 'archive', label: 'Archive', emoji: '📦' },
                { key: 'review', label: 'Review', emoji: '🔍' },
                { key: 'broken', label: 'Broken', emoji: '❌' }
              ].map((status) => (
                <button
                  key={status.key}
                  onClick={() => {
                    // Bulk update status for all selected bookmarks
                    selectedIds.forEach(id => {
                      const bookmark = bookmarks.find(b => b.id === id);
                      if (bookmark) {
                        onSaveInline({
                          ...bookmark,
                          status: status.key === 'active' ? undefined : status.key as any,
                          updatedAt: Date.now()
                        });
                      }
                    });
                    setSelectedIds([]); // Clear selection after bulk operation
                  }}
                  className="px-2 py-1 text-xs bg-emperor-surface border border-emperor-border rounded hover:bg-emperor-surfaceStrong transition"
                  title={`Set status to ${status.label}`}
                >
                  {status.emoji} {status.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedIds([])}
              className="ml-auto text-xs text-emperor-muted hover:text-emperor-text"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Sortable context for main bookmark list */}
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="space-y-4">
          {filteredBookmarks.map((b) => (
            <li key={b.id}>
              <BookmarkCard
                b={b}
                books={books}
                selected={selectedIds.includes(b.id)}
                onToggleSelected={toggleSelected}
                editMode={editMode}
                activeTags={activeTags}
                onDelete={onDelete}
                onPin={onPin}
                onToggleReadLater={onToggleReadLater}
                onRetag={onRetag}
                onEditRequest={onEditRequest}
                onSaveInline={onSaveInline}
                onTagClick={onTagClick}
                onMoveToBook={onMoveToBook}
                canReorder={canReorder}
                onActivateBook={onActivateBook}
              />
            </li>
          ))}
        </ul>
      </SortableContext>

      {/* Ghost placeholder when dragging + reordering is allowed */}
      {activeDragId && canReorder && (
        <div className="h-1 bg-emperor-surfaceStrong rounded-card opacity-40 mt-2" />
      )}
    </div>
  );
}

/**
 * BookmarkList.tsx
 * -----------------
 * Main scrollable list of bookmark cards with:
 *
 *   - Multi‑select toolbar (delete, tag, pin, move to book)
 *   - Fuzzy search (Fuse.js)
 *   - Multi‑tag filtering (OR logic)
 *   - Optional book scoping (activeBookId)
 *   - Infinite scroll pagination
 *   - Drag‑and‑drop reordering
 *
 * DESIGN NOTE
 * -----------
 * App.tsx passes an *ordered, unfiltered* array of bookmarks into this component.
 * All filtering (search, tags, book) happens inside BookmarkList.
 *
 * IMPORTANT:
 *   The order of `bookmarks` is the DnD source of truth.
 *   Filtering must preserve that order.
 *
 * BULK OPERATIONS
 * ---------------
 * Bulk operations (delete, tag, pin) use batch processing to avoid
 * stale closure issues. All changes are applied in a single atomic
 * persistAll() call rather than parallel individual updates.
 */

import React, { useMemo, useState, useEffect, useRef } from "react";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import Fuse from "fuse.js";
import BookmarkCard from "./BookmarkCard";
import MultiSelectToolbar from "./MultiSelectToolbar";
import type { RichBookmark } from "../models/RichBookmark";
import type { Book } from "../models/Book";
import type { ViewMode, InfoVisibility } from "./SettingsScreen";
import {
  logBulkOperationStart,
  logBulkOperationCompletion,
  logBulkOperationFailure,
  bulkDebug,
  bulkInfo,
  bulkWarn
} from "../sync/bulkLogger";

/**
 * bubbleSortStrategy
 * ------------------
 * Custom DnD sort strategy where items swap places as the dragged
 * item moves through the list. This provides a more intuitive
 * reordering experience compared to the default insertion strategy.
 *
 * @param params - Dnd-kit strategy parameters
 * @returns Transform object for the dragged item's new position
 */
function bubbleSortStrategy({ activeIndex, activeNodeRect, index, rects, overIndex }: any) {
  const rect = rects[index];
  if (!rect) return null;
  
  // If this item is the active (dragged) item, keep it at drag position
  if (index === activeIndex) {
    return { x: activeNodeRect.left - rect.left, y: activeNodeRect.top - rect.top, scaleX: 1, scaleY: 1 };
  }
  
  // Calculate target position based on drag direction
  let targetIndex = index;
  if (overIndex > activeIndex && index > activeIndex && index <= overIndex) {
    targetIndex = index - 1; // Dragging down - items above overIndex move up
  } else if (overIndex < activeIndex && index >= overIndex && index < activeIndex) {
    targetIndex = index + 1; // Dragging up - items below overIndex move down
  }
  
  const targetRect = rects[targetIndex];
  if (!targetRect) return null;
  
  return { x: targetRect.left - rect.left, y: targetRect.top - rect.top, scaleX: 1, scaleY: 1 };
}

/**
 * parseAdvancedSearch
 * -------------------
 * Parses advanced search query syntax including:
 *   - Quoted strings for exact phrases: "hello world"
 *   - Field-specific searches: title:foo, url:bar
 *   - Excluded terms: -excluded
 *
 * @param query - The search query to parse
 * @returns Parsed search components (terms, excludedTerms, fields)
 */
function parseAdvancedSearch(query: string) {
  const result = { terms: [] as string[], excludedTerms: [] as string[], fields: {} as { [key: string]: string[] } };
  
  // Handle quoted strings first for exact phrase matching
  const quotedMatches = query.match(/"([^"]*)"/g) || [];
  const quotedTerms = quotedMatches.map(m => m.slice(1, -1));
  let processedQuery = query;
  quotedMatches.forEach(m => { processedQuery = processedQuery.replace(m, ''); });
  
  // Parse field-specific searches (field:value format)
  const fieldRegex = /(\w+):([^\s]+)/g;
  let fieldMatch;
  while ((fieldMatch = fieldRegex.exec(processedQuery)) !== null) {
    const [, field, value] = fieldMatch;
    if (!result.fields[field]) result.fields[field] = [];
    result.fields[field].push(value);
    processedQuery = processedQuery.replace(fieldMatch[0], '');
  }
  
  // Process remaining terms and exclusions
  const remainingTerms = processedQuery.trim().split(/\s+/).filter(t => t.length > 0);
  remainingTerms.forEach(term => {
    if (term.startsWith('-')) result.excludedTerms.push(term.slice(1));
    else result.terms.push(term);
  });
  
  // Add quoted terms to general terms (quoted terms can't be excluded)
  result.terms.push(...quotedTerms);
  return result;
}

/**
 * advancedSearch
 * ---------------
 * Filters bookmarks using advanced search syntax including
 * field-specific searches, quoted phrases, and exclusions.
 *
 * @param bookmarks - Array of bookmarks to filter
 * @param query - Advanced search query
 * @returns Filtered array of bookmarks matching the query
 */
function advancedSearch(bookmarks: RichBookmark[], query: string): RichBookmark[] {
  if (!query.trim()) return bookmarks;
  
  const parsed = parseAdvancedSearch(query.toLowerCase());
  
  return bookmarks.filter(bookmark => {
    // Build searchable text from bookmark fields
    const searchableText = [bookmark.title, bookmark.url, bookmark.description, bookmark.tags?.map(t => t.label).join(' '), bookmark.notes].filter(Boolean).join(' ').toLowerCase();
    
    // Check excluded terms first - if found, reject this bookmark
    if (parsed.excludedTerms.length > 0 && parsed.excludedTerms.some(t => searchableText.includes(t.toLowerCase()))) return false;
    
    // Check field-specific searches
    for (const [field, values] of Object.entries(parsed.fields)) {
      const fieldValue = (bookmark as any)[field]?.toLowerCase();
      if (!fieldValue || !values.some(v => fieldValue.includes(v.toLowerCase()))) return false;
    }
    
    // Check general terms (all must be present)
    if (parsed.terms.length > 0 && !parsed.terms.every(term => searchableText.includes(term.toLowerCase()))) return false;
    
    return true;
  });
}

/**
 * Props
 * -----
 * Component props for BookmarkList
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
  /** CRUD callbacks for individual bookmarks */
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onToggleReadLater: (id: string) => void;
  onRetag: (b: RichBookmark) => void;
  onEditRequest: (b: RichBookmark) => void;
  onSaveInline: (b: RichBookmark) => void;
  onTagClick: (tag: string) => void;
  /** Called when drag‑and‑drop creates a new global order */
  onReorder: (ids: string[]) => void;
  /** Moves a bookmark to a different book (or back to root) */
  onMoveToBook: (id: string, bookId: string | null) => void;
  /** Search query from App.tsx */
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
  /** View mode: card, list, or grid */
  viewMode?: ViewMode;
  /** Info visibility settings */
  infoVisibility?: InfoVisibility;
  /** Multi-retag callback for batch tagging */
  onMultiRetag: (bookmarks: RichBookmark[]) => void;
  /** Ordering arrays and persistence for batch operations */
  rootOrder?: string[];
  pinnedOrder?: string[];
  persistAll?: (bookmarks: RichBookmark[], books: Book[], rootOrder: string[], pinnedOrder: string[]) => void;
};

/**
 * BookmarkList Component
 * ----------------------
 * Main component for displaying and managing bookmark cards.
 * Handles filtering, search, selection, and bulk operations.
 */
export default function BookmarkList({
  bookmarks, books, selectedIds, setSelectedIds, editMode, onDelete, onPin, onToggleReadLater, onRetag, onEditRequest, onSaveInline, onTagClick, onReorder, onMoveToBook,
  search, activeTags, activeStatuses, activeBookId, canReorder, activeDragId, onActivateBook,
  viewMode = "card", infoVisibility = { favicon: true, url: true, tags: true, date: true, book: true }, onMultiRetag,
  rootOrder = [], pinnedOrder = [], persistAll = () => {},
}: Props) {
  /**
   * Debug Effect
   * ------------
   * Logs when the bookmarks prop changes to help debug
   * rendering and state synchronization issues.
   */
  useEffect(() => { console.log('BookmarkList: bookmarks prop changed, length:', bookmarks.length); }, [bookmarks.length]);

  /**
   * toggleSelected
   * --------------
   * Toggles a bookmark ID in the selectedIds array.
   * Used by the checkbox inside BookmarkCard.
   */
  function toggleSelected(id: string) {
    setSelectedIds(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  /**
   * deleteSelected
   * ---------------
   * BATCH deletes all selected bookmarks in a single atomic operation.
   * This fixes the stale closure issue where parallel deletion
   * was overwriting state updates.
   *
   * Flow:
   *   1. Calculate all new state arrays (bookmarks, orders, books)
   *   2. Apply all changes in one persistAll() call
   *   3. Clear selection after successful deletion
   */
  async function deleteSelected() {
    try {
      logBulkOperationStart('bulk-delete', selectedIds.length, 'BookmarkList');
      const startTime = Date.now();
      
      // Calculate new state - filter out all selected bookmarks
      const nextBookmarks = bookmarks.filter((b) => !selectedIds.includes(b.id));
      const nextRootOrder = rootOrder.filter((x) => !selectedIds.includes(x));
      const nextPinnedOrder = pinnedOrder.filter((x) => !selectedIds.includes(x));
      const nextBooks = books.map((b) => ({ 
        ...b, 
        order: (b.order ?? []).filter((x) => !selectedIds.includes(x)) 
      }));
      
      // Single atomic state update - prevents stale closure issues
      persistAll(nextBookmarks, nextBooks, nextRootOrder, nextPinnedOrder);
      setSelectedIds([]);
      
      const durationMs = Date.now() - startTime;
      logBulkOperationCompletion('bulk-delete', selectedIds.length, selectedIds.length);
      bulkInfo('Bulk delete completed', { deletedCount: selectedIds.length, newBookmarksCount: nextBookmarks.length, durationMs });
    } catch (error) {
      logBulkOperationFailure('bulk-delete', error as Error, { selectedIds });
      setSelectedIds([]);
    }
  }

  /**
   * tagSelected
   * -----------
   * Opens the multi-retag modal for batch tagging.
   * Validates that at least one bookmark is selected.
   */
  function tagSelected() {
    try {
      logBulkOperationStart('bulk-tag', selectedIds.length, 'BookmarkList');
      const selectedBookmarks = bookmarks.filter(b => selectedIds.includes(b.id));
      
      if (selectedBookmarks.length === 0) { 
        bulkWarn('No bookmarks selected for tagging operation'); 
        return; 
      }
      
      onMultiRetag(selectedBookmarks);
      logBulkOperationCompletion('bulk-tag', selectedBookmarks.length, selectedBookmarks.length);
    } catch (error) {
      logBulkOperationFailure('bulk-tag', error as Error, { selectedIds });
    }
  }

  /**
   * pinSelected
   * -----------
   * BATCH pins all selected bookmarks in a single atomic operation.
   * Updates bookmark pinned status and pinned order.
   */
  async function pinSelected() {
    try {
      logBulkOperationStart('bulk-pin', selectedIds.length, 'BookmarkList');

      // Calculate new state - update pinned status and order
      const nextBookmarks = bookmarks.map((b) =>
        selectedIds.includes(b.id) ? { ...b, pinned: true } : b
      );

      // Add newly pinned items to pinned order if not already there
      const nextPinnedOrder = [...pinnedOrder];
      for (const id of selectedIds) {
        if (!nextPinnedOrder.includes(id)) {
          nextPinnedOrder.push(id);
        }
      }

      // Single atomic state update
      persistAll(nextBookmarks, books, rootOrder, nextPinnedOrder);

      logBulkOperationCompletion('bulk-pin', selectedIds.length, selectedIds.length);
    } catch (error) {
      logBulkOperationFailure('bulk-pin', error as Error, { selectedIds });
    }
  }

  /**
   * unpinSelected
   * -------------
   * BATCH unpins all selected bookmarks in a single atomic operation.
   * Updates bookmark pinned status and removes from pinned order.
   */
  async function unpinSelected() {
    try {
      logBulkOperationStart('bulk-unpin', selectedIds.length, 'BookmarkList');

      // Calculate new state - update pinned status and order
      const nextBookmarks = bookmarks.map((b) =>
        selectedIds.includes(b.id) ? { ...b, pinned: false } : b
      );

      // Remove unpinned items from pinned order
      const nextPinnedOrder = pinnedOrder.filter((id) => !selectedIds.includes(id));

      // Single atomic state update
      persistAll(nextBookmarks, books, rootOrder, nextPinnedOrder);

      logBulkOperationCompletion('bulk-unpin', selectedIds.length, selectedIds.length);
    } catch (error) {
      logBulkOperationFailure('bulk-unpin', error as Error, { selectedIds });
    }
  }

  /**
   * moveSelectedToBook
   * ------------------
   * BATCH moves all selected bookmarks to a target book in a single atomic operation.
   * Updates bookmark bookId and book orders.
   */
  async function moveSelectedToBook(targetBookId: string | null) {
    try {
      logBulkOperationStart('bulk-move', selectedIds.length, 'BookmarkList');

      // Calculate new state - update bookmark bookId assignments
      const nextBookmarks = bookmarks.map((b) =>
        selectedIds.includes(b.id) ? { ...b, bookId: targetBookId } : b
      );

      // Update book orders - remove from old books, add to new book
      let nextBooks = books.map((book) => {
        if (book.id === targetBookId) {
          // Add selected bookmarks to target book order
          const existingOrder = book.order ?? [];
          const newOrder = [...existingOrder, ...selectedIds.filter(id => !existingOrder.includes(id))];
          return { ...book, order: newOrder };
        } else {
          // Remove selected bookmarks from other books' orders
          const filteredOrder = (book.order ?? []).filter(id => !selectedIds.includes(id));
          return { ...book, order: filteredOrder };
        }
      });

      // Update root order - remove moved items if moving to a book, add if moving to root
      let nextRootOrder = rootOrder.filter((id) => !selectedIds.includes(id));
      if (targetBookId === null) {
        // Moving to root - add to root order
        nextRootOrder = [...nextRootOrder, ...selectedIds];
      }

      // Single atomic state update
      persistAll(nextBookmarks, nextBooks, nextRootOrder, pinnedOrder);

      logBulkOperationCompletion('bulk-move', selectedIds.length, selectedIds.length);
    } catch (error) {
      logBulkOperationFailure('bulk-move', error as Error, { selectedIds, targetBookId });
    }
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
    for (const child of children) { descendants.push(...getDescendantBookIds(child.id, allBooks)); }
    return descendants;
  }

  /**
   * filteredBookmarks
   * -----------------
   * Memoized filtered list of bookmarks based on:
   *   1. Fuzzy/advanced search query
   *   2. Multi‑tag filtering (OR logic)
   *   3. Status filtering (OR logic)
   *   4. Book context filter (activeBookId + descendants)
   */
  const filteredBookmarks = useMemo(() => {
    let list = bookmarks;
    const query = search.trim();
    
    if (query) {
      // Check for advanced search syntax (field: or quotes)
      const hasFieldSearch = /(\w+):/.test(query) || /"/.test(query);
      if (hasFieldSearch) {
        list = advancedSearch(list, query);
      } else {
        // Fall back to fuzzy search for simple queries
        const fuse = new Fuse(list, { keys: ["title", "url", "tags.label", "description", "notes"], threshold: 0.35 });
        list = fuse.search(query).map((r) => r.item);
      }
    }
    
    // Apply tag filter (OR logic)
    if (activeTags.length > 0) { 
      list = list.filter((b) => b.tags?.some((t) => activeTags.includes(t.label))); 
    }
    
    // Apply status filter
    if (activeStatuses.length > 0) { 
      list = list.filter((b) => b.status && activeStatuses.includes(b.status)); 
    }
    
    // Apply book scope filter (includes descendants)
    if (activeBookId) { 
      const descendantBookIds = getDescendantBookIds(activeBookId, books);
      list = list.filter((b) => b.bookId && descendantBookIds.includes(b.bookId)); 
    }
    
    return list;
  }, [bookmarks, search, activeTags, activeStatuses, activeBookId, books]);

  /**
   * IDs for SortableContext
   * ------------------------
   * The full ordered list of IDs for DnD (not just filtered).
   * This ensures dragging works even when items are filtered.
   */
  const ids = canReorder ? bookmarks.map((b) => b.id) : [];
  
  // Infinite scroll state
  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  /**
   * Reset visible count when filters change
   * ----------------------------------------
   * When search, tags, or book context changes,
   * reset to show only the first 20 items.
   */
  useEffect(() => { setVisibleCount(20); }, [filteredBookmarks.length, search, activeTags, activeStatuses, activeBookId]);

  /**
   * Infinite Scroll Observer
   * ------------------------
   * Loads more bookmarks when the trigger element
   * comes into view (20 items at a time).
   */
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && visibleCount < filteredBookmarks.length) {
        setVisibleCount(Math.min(visibleCount + 20, filteredBookmarks.length));
      }
    }, { threshold: 0.1, rootMargin: '100px' });
    
    const currentTrigger = loadMoreTriggerRef.current;
    if (currentTrigger) observer.observe(currentTrigger);
    return () => { if (currentTrigger) observer.unobserve(currentTrigger); };
  }, [visibleCount, filteredBookmarks.length]);

  // Derived state for rendering
  const visibleBookmarks = filteredBookmarks.slice(0, visibleCount);
  const allVisibleSelected = visibleBookmarks.length > 0 && selectedIds.length === visibleBookmarks.length && visibleBookmarks.every(b => selectedIds.includes(b.id));
  const currentBookName = activeBookId ? books.find(b => b.id === activeBookId)?.name || "Unknown Book" : "All Pages";

  /**
   * toggleSelectAllVisible
   * ----------------------
   * Raindrop.io style selection - toggles selection of all
   * currently visible bookmarks when clicking the book icon.
   */
  function toggleSelectAllVisible() {
    if (allVisibleSelected) setSelectedIds([]);
    else setSelectedIds(visibleBookmarks.map(b => b.id));
  }

  // Container classes based on view mode
  const containerClass = viewMode === "grid" 
    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 auto-rows-fr" 
    : "space-y-4";

  /**
   * Render
   * ------
   * Returns the complete bookmark list markup including:
   *   - MultiSelectToolbar (bulk actions header)
   *   - SortableContext wrapper (when reordering enabled)
   *   - Visible bookmark cards
   *   - Infinite scroll trigger
   */
  return (
    <div>
      <MultiSelectToolbar 
        selectedCount={selectedIds.length} 
        totalCount={filteredBookmarks.length} 
        currentBookName={currentBookName} 
        allSelected={allVisibleSelected} 
        onToggleSelectAll={toggleSelectAllVisible} 
        onDeleteSelected={deleteSelected} 
        onTagSelected={tagSelected} 
        onPinSelected={pinSelected} 
        onUnpinSelected={unpinSelected} 
        books={books} 
        onMoveSelectedToBook={moveSelectedToBook} 
      />
      {canReorder ? (
        <SortableContext items={ids} strategy={viewMode === "grid" ? rectSortingStrategy : bubbleSortStrategy}>
          <div className={`${containerClass} mt-4`}>
            {visibleBookmarks.map((b) => (
              <div key={b.id}>
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
                  viewMode={viewMode} 
                  infoVisibility={infoVisibility} 
                />
              </div>
            ))}
            {visibleCount < filteredBookmarks.length && (
              <div ref={loadMoreTriggerRef} className="col-span-full flex justify-center py-4">
                <div className="text-sm text-emperor-muted">Loading more...</div>
              </div>
            )}
          </div>
        </SortableContext>
      ) : (
        <div className={`${containerClass} mt-4`}>
          {visibleBookmarks.map((b) => (
            <div key={b.id}>
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
                viewMode={viewMode} 
                infoVisibility={infoVisibility} 
              />
            </div>
          ))}
          {visibleCount < filteredBookmarks.length && (
            <div ref={loadMoreTriggerRef} className="flex justify-center py-4">
              <div className="text-sm text-emperor-muted">Loading more...</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

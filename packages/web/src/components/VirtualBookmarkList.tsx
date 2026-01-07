import React, { useState, useEffect, useCallback, useMemo } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import BookmarkCard from "./BookmarkCard";
import MultiSelectToolbar from "./MultiSelectToolbar";
import type { RichBookmark } from "../models/RichBookmark";
import type { Book } from "../models/Book";

interface VirtualBookmarkListProps {
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
}

const ITEM_HEIGHT = 120; // Approximate height of each bookmark card
const OVERSCAN = 5; // Number of extra items to render outside viewport

export default function VirtualBookmarkList({
  bookmarks,
  books,
  selectedIds,
  setSelectedIds,
  editMode,
  onDelete,
  onPin,
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
}: VirtualBookmarkListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleResize = useCallback(() => {
    const container = document.querySelector('[data-virtual-container]');
    if (container) {
      setContainerHeight(container.clientHeight);
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    bookmarks.length - 1,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN
  );

  const visibleBookmarks = useMemo(() => {
    return bookmarks.slice(startIndex, endIndex + 1);
  }, [bookmarks, startIndex, endIndex]);

  const totalHeight = bookmarks.length * ITEM_HEIGHT;

  return (
    <div
      data-virtual-container
      className="h-full overflow-y-auto"
      onScroll={handleScroll}
    >
      {/* Multi‑select toolbar (bulk actions) */}
      <MultiSelectToolbar
        selectedCount={selectedIds.length}
        totalCount={bookmarks.length}
        onSelectAll={() => setSelectedIds(bookmarks.map(b => b.id))}
        onClearAll={() => setSelectedIds([])}
        onDeleteSelected={() => {
          selectedIds.forEach(id => onDelete(id));
          setSelectedIds([]);
        }}
        onTagSelected={() => {
          const tag = prompt("Tag to apply to selected pages?");
          if (!tag) return;
          bookmarks.forEach(b => {
            if (selectedIds.includes(b.id)) {
              onRetag({
                ...b,
                tags: [...(b.tags ?? []), { label: tag, type: "user" }],
                updatedAt: Date.now()
              });
            }
          });
        }}
        onPinSelected={() => selectedIds.forEach(id => onPin(id))}
        onUnpinSelected={() => selectedIds.forEach(id => onPin(id))}
        books={books}
        onMoveSelectedToBook={(bookId) => {
          selectedIds.forEach(id => onMoveToBook(id, bookId));
          setSelectedIds([]);
        }}
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
                    setSelectedIds([]);
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

      {/* Virtual scrolling container */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${startIndex * ITEM_HEIGHT}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          <SortableContext items={bookmarks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-4">
              {visibleBookmarks.map((b) => (
                <li key={b.id}>
                  <BookmarkCard
                    b={b}
                    books={books}
                    selected={selectedIds.includes(b.id)}
                    onToggleSelected={(id) => {
                      setSelectedIds(
                        selectedIds.includes(id)
                          ? selectedIds.filter(x => x !== id)
                          : [...selectedIds, id]
                      );
                    }}
                    editMode={editMode}
                    activeTags={activeTags}
                    onDelete={onDelete}
                    onPin={onPin}
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
        </div>
      </div>

      {/* Ghost placeholder when dragging + reordering is allowed */}
      {activeDragId && canReorder && (
        <div className="h-1 bg-emperor-surfaceStrong rounded-card opacity-40 mt-2" />
      )}
    </div>
  );
}

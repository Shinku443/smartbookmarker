import React, { useMemo } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Fuse from "fuse.js";

import BookmarkCard from "./BookmarkCard";
import MultiSelectToolbar from "./MultiSelectToolbar";
import type { RichBookmark } from "../models/RichBookmark";
import type { Book } from "../models/Book";

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
 * All filtering (search, tags, book) happens INSIDE BookmarkList.
 */

type Props = {
  /** Ordered, unfiltered list of bookmarks (source of truth for DnD) */
  bookmarks: RichBookmark[];

  /** All books (for "move to book" multi‑select action) */
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

  /** Active book context (null = show all books) */
  activeBookId: string | null;

  /** Whether reordering is allowed (disabled on All Pages) */
  canReorder: boolean;

  /** Currently active drag ID (from App's DnD context) */
  activeDragId: string | null;
};

export default function BookmarkList({
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
  activeBookId,
  canReorder,
  activeDragId
}: Props) {
  function toggleSelected(id: string) {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

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
   * filteredBookmarks
   * -----------------
   * Applies:
   *   1. Fuzzy search (Fuse.js)
   *   2. Multi‑tag filtering (OR logic)
   *   3. Book context filter (activeBookId)
   */
  const filteredBookmarks = useMemo(() => {
    let list = bookmarks;

    const query = search.trim();
    if (query) {
      const fuse = new Fuse(list, {
        keys: ["title", "url", "tags.label"],
        threshold: 0.35
      });
      list = fuse.search(query).map((r) => r.item);
    }

    if (activeTags.length > 0) {
      list = list.filter((b) =>
        b.tags?.some((t) => activeTags.includes(t.label))
      );
    }

    if (activeBookId) {
      list = list.filter((b) => b.bookId === activeBookId);
    }

    return list;
  }, [bookmarks, search, activeTags, activeBookId]);

  const ids = bookmarks.map((b) => b.id);

  return (
    <div>
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
                onRetag={onRetag}
                onEditRequest={onEditRequest}
                onSaveInline={onSaveInline}
                onTagClick={onTagClick}
                onMoveToBook={onMoveToBook}
                canReorder={canReorder}
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
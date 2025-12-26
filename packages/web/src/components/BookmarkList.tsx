import React, { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragCancelEvent,
  DragOverlay
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove
} from "@dnd-kit/sortable";
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
 *   - Drag‑and‑drop reordering (via @dnd-kit)
 *   - Multi‑select toolbar (delete, tag, pin, move to book)
 *   - Fuzzy search (Fuse.js)
 *   - Multi‑tag filtering (OR logic)
 *   - Optional book scoping (activeBookId)
 *   - DragOverlay for smooth drag pickup
 *
 * DESIGN NOTE
 * -----------
 * App.tsx passes an *ordered, unfiltered* array of bookmarks into this component.
 * All filtering (search, tags, book) happens INSIDE BookmarkList.
 *
 * This guarantees that:
 *   - Reordering always uses the full, ordered list of IDs
 *   - Filtering never breaks drag‑and‑drop
 *   - The DragOverlay always matches the correct bookmark
 */

/**
 * Props Interface
 * ---------------
 * Defines the inputs required by BookmarkList.
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

  /** Called when drag‑and‑drop creates a new global order */
  onReorder: (ids: string[]) => void;

  /** Moves a bookmark to a different book (or back to root) */
  onMoveToBook: (id: string, bookId: string | null) => void;

  /** Search query from App.tsx (used for fuzzy search) */
  search: string;

  /** Active tag filters (multi‑select, OR logic) */
  activeTags: string[];

  /** Active book context (null = show all books) */
  activeBookId: string | null;
};

export default function BookmarkList({
  bookmarks,
  books,
  selectedIds,
  setSelectedIds,
  editMode,
  onReorder,
  onMoveToBook,
  search,
  activeTags,
  activeBookId,
  ...actions
}: Props) {
  /**
   * activeId
   * --------
   * ID of the bookmark currently being dragged.
   * Used by DragOverlay to render a visual clone.
   */
  const [activeId, setActiveId] = useState<string | null>(null);

  /**
   * toggleSelected
   * ---------------
   * Adds/removes a bookmark from the multi‑select selection.
   */
  function toggleSelected(id: string) {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  /**
   * Multi‑select helper actions
   * ---------------------------
   * These are wired into the MultiSelectToolbar.
   */
  function selectAll() {
    setSelectedIds(bookmarks.map((b) => b.id));
  }

  function clearAll() {
    setSelectedIds([]);
  }

  function deleteSelected() {
    for (const id of selectedIds) {
      actions.onDelete(id);
    }
    setSelectedIds([]);
  }

  function tagSelected() {
    const tag = prompt("Tag to apply to selected pages?");
    if (!tag) return;

    for (const b of bookmarks) {
      if (selectedIds.includes(b.id)) {
        actions.onRetag({
          ...b,
          tags: [
            ...(b.tags ?? []),
            { label: tag, type: "user" as const }
          ],
          updatedAt: Date.now()
        });
      }
    }
  }

  function pinSelected() {
    for (const id of selectedIds) {
      actions.onPin(id);
    }
  }

  function unpinSelected() {
    for (const id of selectedIds) {
      actions.onPin(id);
    }
  }

  function moveSelectedToBook(bookId: string | null) {
    for (const id of selectedIds) {
      onMoveToBook(id, bookId);
    }
  }

  /**
   * filteredBookmarks
   * -----------------
   * Applies:
   *   1. Fuzzy search (Fuse.js) across title, URL, and tags
   *   2. Multi‑tag filtering (OR logic)
   *   3. Book context filter (activeBookId)
   *
   * NOTE:
   *   The input list is already ordered. Filtering never touches the
   *   underlying ordering arrays; it only affects what's rendered.
   */
  const filteredBookmarks = useMemo(() => {
    let list = bookmarks;

    // 1. Fuzzy search
    const query = search.trim();
    if (query) {
      const fuse = new Fuse(list, {
        keys: ["title", "url", "tags.label"],
        threshold: 0.35
      });
      const results = fuse.search(query);
      list = results.map((r) => r.item);
    }

    // 2. Multi‑tag filter (OR logic)
    if (activeTags.length > 0) {
      list = list.filter((b) =>
        b.tags?.some((t: { label: string }) =>
          activeTags.includes(t.label)
        )
      );
    }

    // 3. Book filter
    if (activeBookId) {
      list = list.filter((b) => b.bookId === activeBookId);
    }

    return list;
  }, [bookmarks, search, activeTags, activeBookId]);

  /**
   * Drag lifecycle
   * --------------
   * - handleDragStart  → store activeId
   * - handleDragEnd    → compute new order based on full ordered list
   * - handleDragCancel → clear activeId
   */
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // Reordering MUST use the full ordered list, not the filtered subset.
    const ids = bookmarks.map((b) => b.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(ids, oldIndex, newIndex);
    onReorder(newOrder);
  }

  function handleDragCancel(_event: DragCancelEvent) {
    setActiveId(null);
  }

  /**
   * ids
   * ---
   * The IDs used by SortableContext.
   * Always derived from the full ordered list.
   */
  const ids = bookmarks.map((b) => b.id);

  /**
   * activeBookmark
   * ---------------
   * Used by DragOverlay to render a visual clone while dragging.
   */
  const activeBookmark =
    activeId != null ? bookmarks.find((b) => b.id === activeId) : null;

  return (
    <div>
      {/* ------------------------------------------------------------------ */}
      {/* Multi‑Select Toolbar                                               */}
      {/* Controls bulk operations on selected bookmarks.                    */}
      {/* ------------------------------------------------------------------ */}
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

      {/* ------------------------------------------------------------------ */}
      {/* Drag‑and‑Drop Context                                              */}
      {/* Wraps the sortable list and drag overlay.                          */}
      {/* ------------------------------------------------------------------ */}
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Sortable list container */}
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
                  {...actions}
                />
              </li>
            ))}
          </ul>
        </SortableContext>

        {/* ------------------------------------------------------------------ */}
        {/* DragOverlay                                                       */}
        {/* Lightweight clone of the active card for snappy drag pickup.      */}
        {/* ------------------------------------------------------------------ */}
        <DragOverlay>
          {activeBookmark ? (
            <BookmarkCard
              b={activeBookmark}
              books={books}
              selected={false}
              onToggleSelected={() => {}}
              editMode="inline"
              activeTags={activeTags}
              onEditRequest={() => {}}
              onSaveInline={() => {}}
              onDelete={() => {}}
              onPin={() => {}}
              onRetag={() => {}}
              onTagClick={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
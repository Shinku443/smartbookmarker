import React, { useState } from "react";
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

import BookmarkCard from "./BookmarkCard";
import type { RichBookmark } from "../models/RichBookmark";
import type { Book } from "../models/Book";

/**
 * PinnedBookmarks.tsx
 * -------------------
 * Renders the "Pinned" section at the top of the library.
 *
 * Features:
 *   - Displays only bookmarks with `pinned: true`
 *   - Supports drag‑and‑drop reordering (separate from main list)
 *   - Uses its own ordering array (`pinnedOrder`) managed by useBookmarks()
 *   - Supports multi‑select (checkboxes)
 *   - Supports inline/modal editing, retagging, pin/unpin, delete
 *   - Uses DragOverlay for smooth drag pickup
 *
 * DESIGN NOTE
 * -----------
 * Pinned bookmarks have their own ordering array because they are displayed
 * independently of book grouping and root ordering. This component receives
 * the already‑sorted pinned list from App.tsx and only handles reordering
 * within that subset.
 */

/**
 * Props Interface
 * ---------------
 * Defines all inputs required by PinnedBookmarks.
 */
type Props = {
  /** The full list of bookmarks already filtered to pinned items by App.tsx */
  bookmarks: RichBookmark[];

  /** All books (for showing membership inside BookmarkCard) */
  books: Book[];

  /** IDs of currently selected bookmarks (multi‑select) */
  selectedIds: string[];
  /** Updates the selected IDs array */
  setSelectedIds: (ids: string[]) => void;

  /** Inline vs modal editing mode */
  editMode: "modal" | "inline";

  /** CRUD + action callbacks for individual bookmarks */
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onRetag: (b: RichBookmark) => void;
  onEditRequest: (b: RichBookmark) => void;
  onSaveInline: (b: RichBookmark) => void;
  onTagClick: (tag: string) => void;

  /** Called when pinned bookmarks are reordered */
  onReorderPinned: (ids: string[]) => void;

  /** Active tag filters (used to highlight matching tag chips) */
  activeTags: string[];
};

export default function PinnedBookmarks({
  bookmarks,
  books,
  selectedIds,
  setSelectedIds,
  editMode,
  onReorderPinned,
  activeTags,
  ...actions
}: Props) {
  /**
   * pinned
   * ------
   * Extract only pinned bookmarks.
   * App.tsx already sorts them using pinnedOrder.
   */
  const pinned = bookmarks.filter((b) => b.pinned);
  if (pinned.length === 0) return null;

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
   * Drag Lifecycle
   * --------------
   * handleDragStart  → store activeId
   * handleDragEnd    → compute new pinned order
   * handleDragCancel → clear activeId
   */
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // Reorder within the pinned subset
    const ids = pinned.map((b) => b.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorderPinned(arrayMove(ids, oldIndex, newIndex));
  }

  function handleDragCancel(_event: DragCancelEvent) {
    setActiveId(null);
  }

  /**
   * ids
   * ---
   * The IDs used by SortableContext.
   * Always derived from the pinned subset.
   */
  const ids = pinned.map((b) => b.id);

  /**
   * activeBookmark
   * ---------------
   * Used by DragOverlay to render a lightweight clone.
   */
  const activeBookmark =
    activeId != null ? pinned.find((b) => b.id === activeId) : null;

  return (
    <section className="mb-8">
      {/* ------------------------------------------------------------------ */}
      {/* Section Header                                                     */}
      {/* ------------------------------------------------------------------ */}
      <h2 className="text-lg font-semibold mb-3">Pinned</h2>

      {/* ------------------------------------------------------------------ */}
      {/* Drag‑and‑Drop Context                                              */}
      {/* Wraps the sortable pinned list and drag overlay.                   */}
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
            {pinned.map((b) => (
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
        {/* Lightweight clone for smooth drag pickup.                         */}
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
    </section>
  );
}
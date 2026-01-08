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
import type { ViewMode, InfoVisibility } from "./SettingsScreen";

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

type Props = {
  bookmarks: RichBookmark[];
  books: Book[];

  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;

  editMode: "modal" | "inline";

  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onToggleReadLater: (id: string) => void;
  onRetag: (b: RichBookmark) => void;
  onEditRequest: (b: RichBookmark) => void;
  onSaveInline: (b: RichBookmark) => void;
  onTagClick: (tag: string) => void;

  onReorderPinned: (ids: string[]) => void;

  activeTags: string[];

  /** Moves a pinned bookmark to a different book (or root) */
  onMoveToBook: (id: string, bookId: string | null) => void;

  /** View mode: card, list, or grid */
  viewMode?: ViewMode;

  /** Info visibility settings */
  infoVisibility?: InfoVisibility;
};

export default function PinnedBookmarks({
  bookmarks,
  books,
  selectedIds,
  setSelectedIds,
  editMode,
  onReorderPinned,
  activeTags,
  onMoveToBook,
  viewMode = "card",
  infoVisibility = {
    favicon: true,
    url: true,
    tags: true,
    date: true,
    book: true
  },
  ...actions
}: Props) {
  const pinned = bookmarks.filter((b) => b.pinned);
  if (pinned.length === 0) return null;

  const [activeId, setActiveId] = useState<string | null>(null);

  function toggleSelected(id: string) {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const ids = pinned.map((b) => b.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorderPinned(arrayMove(ids, oldIndex, newIndex));
  }

  function handleDragCancel(_event: DragCancelEvent) {
    setActiveId(null);
  }

  const ids = pinned.map((b) => b.id);

  const activeBookmark =
    activeId != null ? pinned.find((b) => b.id === activeId) : null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3">Pinned</h2>

      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
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
                  onDelete={actions.onDelete}
                  onPin={actions.onPin}
                  onToggleReadLater={actions.onToggleReadLater}
                  onRetag={actions.onRetag}
                  onEditRequest={actions.onEditRequest}
                  onSaveInline={actions.onSaveInline}
                  onTagClick={actions.onTagClick}
                  onMoveToBook={onMoveToBook}
                  canReorder={true}
                  viewMode={viewMode}
                  infoVisibility={infoVisibility}
                />
              </li>
            ))}
          </ul>
        </SortableContext>

        {/* DragOverlay — FIXED: removed transform override */}
        <DragOverlay adjustScale={false} dropAnimation={null}>
          {activeBookmark ? (
            <div className="-translate-y-2 -translate-x-1">
              <BookmarkCard
                b={activeBookmark}
                books={books}
                selected={false}
                onToggleSelected={() => {}}
                editMode="inline"
                activeTags={activeTags}
                onDelete={() => {}}
                onPin={() => {}}
                onToggleReadLater={() => {}}
                onRetag={() => {}}
                onEditRequest={() => {}}
                onSaveInline={() => {}}
                onTagClick={() => {}}
                onMoveToBook={() => {}}
                canReorder={true}
                compact
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}

import {
  DndContext,
  closestCenter,
  DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove
} from "@dnd-kit/sortable";
import BookmarkCard from "./BookmarkCard";
import { RichBookmark } from "../models/RichBookmark";
import { Book } from "../models/Book";

/**
 * PinnedBookmarks.tsx
 * -------------------
 * A specialized component for displaying and managing pinned bookmarks.
 * Provides drag-and-drop reordering for pinned items and integrates with
 * multi-select functionality. Only renders when there are pinned bookmarks.
 */

/**
 * Props Interface
 * ---------------
 * Defines the properties for the PinnedBookmarks component.
 */
type Props = {
  /** Array of all bookmarks (filtered for pinned ones internally) */
  bookmarks: RichBookmark[];
  /** Array of books for display purposes */
  books: Book[];
  /** IDs of currently selected bookmarks */
  selectedIds: string[];
  /** Function to update selected IDs */
  setSelectedIds: (ids: string[]) => void;
  /** Edit mode for bookmark cards */
  editMode: "modal" | "inline";
  /** Callback to delete a bookmark */
  onDelete: (id: string) => void;
  /** Callback to toggle pin status */
  onPin: (id: string) => void;
  /** Callback to retag a bookmark */
  onRetag: (b: RichBookmark) => void;
  /** Callback to request editing a bookmark */
  onEditRequest: (b: RichBookmark) => void;
  /** Callback to save inline edits */
  onSaveInline: (b: RichBookmark) => void;
  /** Callback when a tag is clicked */
  onTagClick: (tag: string) => void;
  /** Callback to reorder pinned bookmarks */
  onReorderPinned: (ids: string[]) => void;
};

/**
 * PinnedBookmarks Component
 * -------------------------
 * Renders a section for pinned bookmarks with drag-and-drop reordering.
 * Filters bookmarks for pinned items and provides sortable functionality.
 * Returns null if no bookmarks are pinned.
 *
 * @param props - The component props
 * @returns JSX element for pinned bookmarks section or null
 */
export default function PinnedBookmarks({
  bookmarks,
  books,
  selectedIds,
  setSelectedIds,
  editMode,
  onReorderPinned,
  ...actions
}: Props) {
  // Filter for only pinned bookmarks
  const pinned = bookmarks.filter((b) => b.pinned);

  // Don't render if no pinned bookmarks
  if (pinned.length === 0) return null;

  /**
   * toggleSelected
   * ---------------
   * Toggles the selection state of a pinned bookmark.
   * Adds to selection if not selected, removes if already selected.
   *
   * @param id - The ID of the bookmark to toggle
   */
  function toggleSelected(id: string) {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id) // Remove from selection
        : [...selectedIds, id] // Add to selection
    );
  }

  /**
   * handleDragEnd
   * --------------
   * Handles the completion of a drag operation for pinned bookmarks.
   * Calculates new order and notifies parent component.
   *
   * @param event - The drag end event from @dnd-kit
   */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = pinned.map((b) => b.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(ids, oldIndex, newIndex);
    onReorderPinned(newOrder);
  }

  // Extract IDs for sortable context
  const ids = pinned.map((b) => b.id);

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3">Pinned</h2>

      {/* Drag-and-drop context for pinned bookmarks */}
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
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
                  {...actions}
                />
              </li>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  );
}

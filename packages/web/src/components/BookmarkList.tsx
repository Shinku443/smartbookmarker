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
import MultiSelectToolbar from "./MultiSelectToolbar";
import { RichBookmark } from "../models/RichBookmark";
import { Book } from "../models/Book";

/**
 * BookmarkList.tsx
 * -----------------
 * A container component that manages a sortable list of bookmark cards.
 * Provides multi-select functionality, bulk operations, and drag-and-drop reordering.
 * Integrates with @dnd-kit for smooth drag interactions and coordinates
 * between individual cards and bulk selection tools.
 */

/**
 * Props Interface
 * ---------------
 * Defines all properties for the BookmarkList component.
 */
type Props = {
  /** Array of bookmarks to display in the list */
  bookmarks: RichBookmark[];
  /** Array of all books for move operations */
  books: Book[];
  /** IDs of currently selected bookmarks */
  selectedIds: string[];
  /** Function to update selected IDs */
  setSelectedIds: (ids: string[]) => void;
  /** Edit mode for individual cards */
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
  /** Callback to reorder bookmarks */
  onReorder: (ids: string[]) => void;
  /** Callback to move bookmark to a different book */
  onMoveToBook: (id: string, bookId: string | null) => void;
};

/**
 * BookmarkList Component
 * ----------------------
 * Renders a sortable list of bookmark cards with multi-select capabilities.
 * Handles bulk operations like tagging, pinning, and moving multiple bookmarks.
 *
 * @param props - The component props
 * @returns JSX element containing the bookmark list and toolbar
 */
export default function BookmarkList({
  bookmarks,
  books,
  selectedIds,
  setSelectedIds,
  editMode,
  onReorder,
  onMoveToBook,
  ...actions
}: Props) {
  /**
   * toggleSelected
   * ---------------
   * Toggles the selection state of a single bookmark.
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
   * selectAll
   * ----------
   * Selects all bookmarks in the current list.
   */
  function selectAll() {
    setSelectedIds(bookmarks.map((b) => b.id));
  }

  /**
   * clearAll
   * ---------
   * Clears all selections.
   */
  function clearAll() {
    setSelectedIds([]);
  }

  /**
   * deleteSelected
   * ---------------
   * Deletes all currently selected bookmarks and clears the selection.
   */
  function deleteSelected() {
    for (const id of selectedIds) {
      actions.onDelete(id);
    }
    setSelectedIds([]);
  }

  /**
   * tagSelected
   * ------------
   * Applies a user-entered tag to all selected bookmarks.
   * Prompts for tag input and updates each selected bookmark.
   */
  function tagSelected() {
    const tag = prompt("Tag to apply to selected pages?");
    if (!tag) return;

    for (const b of bookmarks) {
      if (selectedIds.includes(b.id)) {
        actions.onRetag({
          ...b,
          tags: [...(b.tags ?? []), { label: tag, type: "user" as const }],
          updatedAt: Date.now()
        });
      }
    }
  }

  /**
   * pinSelected
   * ------------
   * Pins all selected bookmarks.
   */
  function pinSelected() {
    for (const id of selectedIds) {
      actions.onPin(id);
    }
  }

  /**
   * unpinSelected
   * --------------
   * Unpins all selected bookmarks (same as pinSelected since it's a toggle).
   */
  function unpinSelected() {
    for (const id of selectedIds) {
      actions.onPin(id); // Toggle pin status
    }
  }

  /**
   * moveSelectedToBook
   * -------------------
   * Moves all selected bookmarks to the specified book (or to root if null).
   *
   * @param bookId - The target book ID, or null for root
   */
  function moveSelectedToBook(bookId: string | null) {
    for (const id of selectedIds) {
      onMoveToBook(id, bookId);
    }
  }

  /**
   * handleDragEnd
   * --------------
   * Handles the completion of a drag operation by calculating new order.
   * Uses arrayMove to reorder bookmark IDs and notifies parent component.
   *
   * @param event - The drag end event from @dnd-kit
   */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = bookmarks.map((b) => b.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(ids, oldIndex, newIndex);
    onReorder(newOrder);
  }

  // Extract IDs for sortable context
  const ids = bookmarks.map((b) => b.id);

  return (
    <div>
      {/* Multi-select toolbar for bulk operations */}
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

      {/* Drag-and-drop context for the bookmark list */}
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="space-y-4">
            {bookmarks.map((b) => (
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
    </div>
  );
}

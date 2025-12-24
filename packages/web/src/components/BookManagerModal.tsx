import React from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import type { Book } from "../models/Book";
import { Bars3Icon, TrashIcon } from "@heroicons/react/24/outline";

/**
 * BookManagerModal.tsx
 * --------------------
 * A modal interface for managing book collections in the library.
 * Provides drag-and-drop reordering, inline renaming, and deletion of books.
 * Uses @dnd-kit for smooth drag-and-drop interactions.
 */

/**
 * BookWithCount Type
 * ------------------
 * Extends the Book type with a pageCount field for displaying book statistics.
 */
type BookWithCount = Book & { pageCount: number };

/**
 * Props Interface
 * ---------------
 * Defines the properties for the BookManagerModal component.
 */
type Props = {
  /** Array of books with their page counts */
  books: BookWithCount[];
  /** Callback to reorder books by their IDs */
  onReorderBooks: (ids: string[]) => void;
  /** Callback to rename a book */
  onRenameBook: (id: string, name: string) => void;
  /** Callback to delete a book */
  onDeleteBook: (id: string) => void;
  /** Callback to close the modal */
  onClose: () => void;
};

/**
 * SortableBookRow Component
 * -------------------------
 * A draggable row component for individual books in the manager.
 * Uses @dnd-kit's useSortable hook to enable drag-and-drop functionality.
 * Displays book name (editable), page count, and delete button.
 *
 * @param book - The book data with count
 * @param onRename - Callback for renaming the book
 * @param onDelete - Callback for deleting the book
 */
function SortableBookRow({
  book,
  onRename,
  onDelete
}: {
  book: BookWithCount;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  // Hook for drag-and-drop functionality
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: book.id });

  // Apply transform styles for smooth dragging
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 py-2 border-b border-emperor-border last:border-none"
      {...attributes} // Accessibility attributes for drag handles
    >
      {/* Drag handle button */}
      <button
        className="cursor-grab active:cursor-grabbing text-emperor-muted hover:text-emperor-text"
        {...listeners} // Drag event listeners
      >
        <Bars3Icon className="w-4 h-4" />
      </button>

      {/* Book details and edit input */}
      <div className="flex-1">
        <Input
          value={book.name}
          onChange={(e) => onRename(e.target.value)}
          className="text-sm"
        />
        {/* Display page count with proper pluralization */}
        <div className="text-xs text-emperor-muted mt-1">
          {book.pageCount} {book.pageCount === 1 ? "page" : "pages"}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="text-emperor-muted hover:text-red-400"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * BookManagerModal Component
 * --------------------------
 * Main modal component for book management operations.
 * Wraps the sortable book list in DndContext for drag-and-drop support.
 * Handles reordering logic and delegates other operations to props.
 *
 * @param props - The component props
 * @returns JSX element for the book manager modal
 */
export default function BookManagerModal({
  books,
  onReorderBooks,
  onRenameBook,
  onDeleteBook,
  onClose
}: Props) {
  // Extract IDs for sortable context
  const ids = books.map((b) => b.id);

  /**
   * handleDragEnd
   * --------------
   * Handles the end of a drag operation by calculating new order and notifying parent.
   * Uses arrayMove utility to reorder the IDs array based on drag positions.
   *
   * @param event - The drag end event from @dnd-kit
   */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    // Ignore if dropped on same item or no target
    if (!over || active.id === over.id) return;

    // Find indices in current order
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    // Calculate new order and notify parent
    const newOrder = arrayMove(ids, oldIndex, newIndex);
    onReorderBooks(newOrder);
  }

  return (
    // Modal overlay
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg bg-emperor-surfaceStrong p-6">
        {/* Modal header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Manage Books</h2>
          <Button size="sm" variant="subtle" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Drag-and-drop context for the book list */}
        <DndContext
          collisionDetection={closestCenter} // Center-based collision detection
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div>
              {/* Render sortable rows for each book */}
              {books.map((b) => (
                <SortableBookRow
                  key={b.id}
                  book={b}
                  onRename={(name) => onRenameBook(b.id, name)}
                  onDelete={() => onDeleteBook(b.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </Card>
    </div>
  );
}

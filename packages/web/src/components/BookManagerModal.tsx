import React, { useState, useRef, useEffect } from "react";
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
import { Bars3Icon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";

/**
 * BookManagerModal.tsx
 * --------------------
 * A modal interface for managing book collections in the library.
 * Provides:
 *   - Drag‑and‑drop reordering
 *   - Inline renaming
 *   - Deletion
 *   - Inline creation of new books (floating + button)
 *
 * Uses @dnd-kit for smooth drag‑and‑drop interactions.
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
  /** Callback to create a new book */
  onCreateBook: (name: string, parentId?: string | null) => void;
  /** Callback to close the modal */
  onClose: () => void;
};

/**
 * SortableBookRow Component
 * -------------------------
 * A draggable row component for individual books in the manager.
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
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: book.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 py-2 border-b border-emperor-border last:border-none"
      {...attributes}
    >
      {/* Drag handle */}
      <button
        className="cursor-grab active:cursor-grabbing text-emperor-muted hover:text-emperor-text"
        {...listeners}
      >
        <Bars3Icon className="w-4 h-4" />
      </button>

      {/* Editable name + page count */}
      <div className="flex-1">
        <Input
          value={book.name}
          onChange={(e) => onRename(e.target.value)}
          className="text-sm"
        />
        <div className="text-xs text-emperor-muted mt-1">
          {book.pageCount} {book.pageCount === 1 ? "page" : "pages"}
        </div>
      </div>

      {/* Delete */}
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
 * InlineCreateRow
 * ----------------
 * Temporary row for creating a new book.
 * Auto‑focuses the input and submits on Enter.
 */
function InlineCreateRow({
  onSubmit,
  onCancel
}: {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div className="flex items-center gap-3 py-2 border-b border-emperor-border">
      {/* Spacer where drag handle would be */}
      <div className="w-4 h-4 opacity-0" />

      <div className="flex-1">
        <Input
          ref={ref}
          value={value}
          placeholder="New book name…"
          onChange={(e) => setValue(e.target.value)}
          className="text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onSubmit(value.trim());
            if (e.key === "Escape") onCancel();
          }}
          onBlur={() => {
            if (value.trim()) onSubmit(value.trim());
            else onCancel();
          }}
        />
      </div>

      {/* Spacer where delete button would be */}
      <div className="w-4 h-4 opacity-0" />
    </div>
  );
}

/**
 * BookManagerModal Component
 * --------------------------
 * Main modal component for book management operations.
 */
export default function BookManagerModal({
  books,
  onReorderBooks,
  onRenameBook,
  onDeleteBook,
  onCreateBook,
  onClose
}: Props) {
  const [isCreating, setIsCreating] = useState(false);

  const ids = books.map((b) => b.id);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(ids, oldIndex, newIndex);
    onReorderBooks(newOrder);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card
        className="
          relative 
          w-full max-w-lg 
          bg-emperor-surfaceStrong 
          border border-emperor-border 
          rounded-lg 
          shadow-xl 
          flex flex-col 
          max-h-[80vh] 
          overflow-hidden
        "
      >
        {/* Floating + button */}
        <button
          onClick={() => setIsCreating(true)}
          className="absolute top-4 right-4 text-emperor-muted hover:text-emperor-text"
          title="Add Book"
        >
          <PlusIcon className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-emperor-border">
          <h2 className="text-lg font-semibold">Manage Books</h2>
          <Button size="sm" variant="subtle" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <div>
                {books.map((b) => (
                  <SortableBookRow
                    key={b.id}
                    book={b}
                    onRename={(name) => onRenameBook(b.id, name)}
                    onDelete={() => onDeleteBook(b.id)}
                  />
                ))}

                {/* Inline creation row at bottom */}
                {isCreating && (
                  <InlineCreateRow
                    onSubmit={(name) => {
                      onCreateBook(name, null);
                      setIsCreating(false);
                    }}
                    onCancel={() => setIsCreating(false)}
                  />
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </Card>
    </div>
  );
}
import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import type { Book } from "../../models/Book";

/**
 * BookManagerModal.tsx
 * ---------------------
 * Modal for managing all books (groups) in the library.
 *
 * Features:
 *   - Reorder books (drag handled externally)
 *   - Rename books
 *   - Delete books
 *   - Create new root‑level books
 *
 * SIGNATURE UPDATE (Dec 2025)
 * ---------------------------
 * onCreateBook now uses the unified signature:
 *
 *    (parentId: string | null, name: string) => void
 *
 * This modal always creates **root‑level** books → parentId = null.
 */

type Props = {
  /** All books with page counts */
  books: (Book & { pageCount: number })[];

  /** Reorders books (drag‑and‑drop handled externally) */
  onReorderBooks: (ids: string[]) => void;

  /** Renames a book */
  onRenameBook: (bookId: string, newName: string) => void;

  /** Deletes a book */
  onDeleteBook: (bookId: string) => void;

  /** Creates a new root‑level book */
  onCreateBook: (parentId: string | null, name: string) => void;

  /** Closes the modal */
  onClose: () => void;
};

export default function BookManagerModal({
  books,
  onReorderBooks,
  onRenameBook,
  onDeleteBook,
  onCreateBook,
  onClose
}: Props) {
  const [newBookName, setNewBookName] = useState("");

  function handleCreateBook() {
    const name = newBookName.trim();
    if (!name) return;

    // Unified signature
    onCreateBook(null, name);

    setNewBookName("");
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-emperor-surfaceStrong border border-emperor-border rounded-lg p-6 w-[480px] shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Manage Books</h2>

        {/* Book list */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto mb-6">
          {books.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between p-2 rounded-card bg-emperor-surface border border-emperor-border"
            >
              <div>
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-emperor-muted">
                  {b.pageCount} pages
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => {
                    const newName = prompt("Rename book:", b.name);
                    if (newName && newName.trim()) {
                      onRenameBook(b.id, newName.trim());
                    }
                  }}
                >
                  Rename
                </Button>

                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onDeleteBook(b.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Create new book */}
        <div className="mb-6">
          <label className="text-sm text-emperor-muted">
            Create New Book
          </label>
          <div className="flex gap-2 mt-1">
            <Input
              value={newBookName}
              onChange={(e) => setNewBookName(e.target.value)}
              placeholder="New book name"
            />
            <Button size="sm" variant="primary" onClick={handleCreateBook}>
              Add
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="subtle" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
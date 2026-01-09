import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { TagInput } from "../ui/TagInput";
import type { Book } from "../../models/Book";

/**
 * AddBookmarkModal.tsx
 * ---------------------
 * Modal for creating a new bookmark (page).
 *
 * Features:
 *   - Title + URL input fields
 *   - Optional book assignment
 *   - Inline creation of a new book (root‑level)
 *   - Fully controlled by parent (App.tsx)
 *
 * SIGNATURE UPDATE (Dec 2025)
 * ---------------------------
 * onCreateBook now uses the unified signature:
 *
 *    (parentId: string | null, name: string) => void
 *
 * This modal always creates **root‑level** books, so parentId = null.
 */

/** Props Interface */
type Props = {
  /** All books (for the dropdown) */
  books: Book[];

  /** Currently active book ID (for default selection) */
  activeBookId: string | null;

  /** Creates a new bookmark */
  onAddPage: (title: string, url: string, description: string | null, bookId: string | null, tags: string[]) => void;

  /** Creates a new book (root‑level only in this modal) */
  onCreateBook: (parentId: string | null, name: string) => void;

  /** Closes the modal */
  onClose: () => void;
};

export default function AddBookmarkModal({
  books,
  activeBookId,
  onAddPage,
  onCreateBook,
  onClose
}: Props) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [bookId, setBookId] = useState<string | null>(activeBookId);
  const [newBookName, setNewBookName] = useState("");

  /** Creates a new root‑level book */
  function handleCreateBook() {
    const name = newBookName.trim();
    if (!name) return;

    // Unified signature: (parentId, name)
    onCreateBook(null, name);

    setNewBookName("");
  }

  /** Creates the bookmark */
  function handleSubmit() {
    if (!title.trim() || !url.trim()) return;
    onAddPage(title.trim(), url.trim(), description.trim() || null, bookId, tags);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-emperor-surfaceStrong border border-emperor-border rounded-lg p-6 w-[420px] shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Add Bookmark</h2>

        {/* Title */}
        <div className="mb-3">
          <label className="text-sm text-emperor-muted">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bookmark title"
          />
        </div>

        {/* URL */}
        <div className="mb-3">
          <label className="text-sm text-emperor-muted">URL</label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </div>

        {/* Tags */}
        <div className="mb-4">
          <label className="text-sm text-emperor-muted">Tags</label>
          <TagInput
            value={tags}
            onChange={setTags}
            placeholder="Add tags (comma, semicolon, or space separated)"
          />
        </div>

        {/* Book selection */}
        <div className="mb-4">
          <label className="text-sm text-emperor-muted">Add to Book</label>
          <select
            className="w-full mt-1 px-2 py-1 rounded-card bg-emperor-surface border border-emperor-border text-sm"
            value={bookId ?? ""}
            onChange={(e) =>
              setBookId(e.target.value === "" ? null : e.target.value)
            }
          >
            <option value="">(None — add to All Pages)</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Inline create book */}
        <div className="mb-4">
          <label className="text-sm text-emperor-muted">
            Create New Book (optional)
          </label>
          <div className="flex gap-2 mt-1">
            <Input
              value={newBookName}
              onChange={(e) => setNewBookName(e.target.value)}
              placeholder="New book name"
            />
            <Button
              size="sm"
              variant="primary"
              onClick={handleCreateBook}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button size="sm" variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={handleSubmit}>
            Add Bookmark
          </Button>
        </div>
      </div>
    </div>
  );
}

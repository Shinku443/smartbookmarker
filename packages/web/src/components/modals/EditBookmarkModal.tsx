import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { TagInput } from "../ui/TagInput";
import type { Book } from "../../models/Book";
import type { RichBookmark } from "../../models/RichBookmark";
import type { BookmarkTag } from "@smart/core";

/**
 * EditBookmarkModal.tsx
 * ----------------------
 * Modal for editing an existing bookmark.
 *
 * Features:
 *   - Edit title + URL
 *   - Move bookmark to another book
 *   - Inline creation of a new root‑level book
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
  /** Bookmark being edited */
  bookmark: RichBookmark;

  /** All books (for dropdown) */
  books: Book[];

  /** Saves the updated bookmark */
  onSave: (b: RichBookmark) => void;

  /** Creates a new root‑level book */
  onCreateBook: (parentId: string | null, name: string) => void;

  /** Closes the modal */
  onClose: () => void;
};

export default function EditBookmarkModal({
  bookmark,
  books,
  onSave,
  onCreateBook,
  onClose
}: Props) {
  const [title, setTitle] = useState(bookmark.title);
  const [url, setUrl] = useState(bookmark.url);
  const [description, setDescription] = useState(bookmark.description || "");
  const [tags, setTags] = useState<string[]>(bookmark.tags?.map(t => t.label) || []);
  const [bookId, setBookId] = useState<string | null>(bookmark.bookId ?? null);
  const [newBookName, setNewBookName] = useState("");

  function handleCreateBook() {
    const name = newBookName.trim();
    if (!name) return;

    onCreateBook(null, name);

    setNewBookName("");
  }

  function handleSave() {
    const bookmarkTags: BookmarkTag[] = tags.map(label => ({
      label,
      type: "user" as const
    }));

    onSave({
      ...bookmark,
      title: title.trim(),
      url: url.trim(),
      description: description.trim() || undefined,
      tags: bookmarkTags,
      bookId
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-emperor-surfaceStrong border border-emperor-border rounded-lg p-6 w-[420px] shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Edit Bookmark</h2>

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

        {/* Description */}
        <div className="mb-4">
          <label className="text-sm text-emperor-muted">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add your own description..."
            className="w-full mt-1 px-2 py-1 rounded-card bg-emperor-surface border border-emperor-border text-sm resize-none"
            rows={3}
          />
        </div>

        {/* Tags */}
        <div className="mb-4">
          <label className="text-sm text-emperor-muted">Tags</label>
          <TagInput
            value={tags}
            onChange={setTags}
            placeholder="Add or edit tags"
          />
        </div>

        {/* Book selection */}
        <div className="mb-4">
          <label className="text-sm text-emperor-muted">Move to Book</label>
          <select
            className="w-full mt-1 px-2 py-1 rounded-card bg-emperor-surface border border-emperor-border text-sm"
            value={bookId ?? ""}
            onChange={(e) =>
              setBookId(e.target.value === "" ? null : e.target.value)
            }
          >
            <option value="">(None — All Pages)</option>
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
            <Button size="sm" variant="primary" onClick={handleCreateBook}>
              Add
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button size="sm" variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
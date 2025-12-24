import React, { useState } from "react";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import type { Book } from "../models/Book";

/**
 * AddBookmarkModal.tsx
 * --------------------
 * A comprehensive modal for adding new bookmarks with advanced options.
 * Allows users to specify title, URL, tags, and assign to existing or new books.
 * Handles book creation inline if needed, providing a seamless bookmark addition experience.
 */

/**
 * Props Interface
 * ---------------
 * Defines the properties for the AddBookmarkModal component.
 */
type Props = {
  /** Array of existing books for selection */
  books: Book[];
  /** Callback to add a new page/bookmark with all specified details */
  onAddPage: (
    title: string,
    url: string,
    bookId: string | null,
    tags: string[]
  ) => void;
  /** Callback to create a new book and return it */
  onCreateBook: (name: string) => Book;
  /** Callback to close the modal */
  onClose: () => void;
};

/**
 * AddBookmarkModal Component
 * --------------------------
 * Renders a modal dialog for adding bookmarks with full feature set.
 * Manages complex state for book selection, including creation of new books.
 *
 * @param props - The component props
 * @returns JSX element for the bookmark addition modal
 */
export default function AddBookmarkModal({
  books,
  onAddPage,
  onCreateBook,
  onClose
}: Props) {
  // Form state
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [tagString, setTagString] = useState("");
  // Book selection: "none" for no book, "new" for creating new, or book ID
  const [selectedBookId, setSelectedBookId] = useState<string | "new" | "none">(
    "none"
  );
  const [newBookName, setNewBookName] = useState("");

  /**
   * handleSubmit
   * -------------
   * Processes the form submission, handling book creation if needed.
   * Parses tags, trims inputs, and calls the appropriate callbacks.
   * Closes the modal after successful submission.
   */
  function handleSubmit() {
    let bookId: string | null = null;

    // Handle book selection logic
    if (selectedBookId === "new" && newBookName.trim()) {
      // Create new book if selected
      const book = onCreateBook(newBookName.trim());
      bookId = book.id;
    } else if (selectedBookId !== "none") {
      // Use existing book ID
      bookId = selectedBookId;
    }

    // Parse and clean tags
    const tags = tagString
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    // Add the bookmark with trimmed title and URL
    onAddPage(title.trim(), url.trim(), bookId, tags);
    onClose();
  }

  // Validation: require title and URL
  const canSubmit = title.trim() && url.trim();

  return (
    // Modal overlay
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-emperor-surfaceStrong p-6">
        <h2 className="text-lg font-semibold mb-4">Add Page</h2>

        {/* Form fields */}
        <div className="space-y-4">
          {/* Title input */}
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title"
            />
          </div>

          {/* URL input */}
          <div>
            <label className="block text-sm font-medium mb-1">URL</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* Tags input */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Tags (semicolon separated)
            </label>
            <Input
              value={tagString}
              onChange={(e) => setTagString(e.target.value)}
              placeholder="work; research; ai"
            />
          </div>

          {/* Book selection dropdown */}
          <div>
            <label className="block text-sm font-medium mb-1">Book</label>
            <select
              className="w-full bg-emperor-surface border border-emperor-border rounded-card px-2 py-1 text-sm"
              value={selectedBookId}
              onChange={(e) =>
                setSelectedBookId(e.target.value as "none" | "new" | string)
              }
            >
              <option value="none">No Book</option>
              {/* Existing books */}
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
              <option value="new">+ Create new book…</option>
            </select>

            {/* Conditional input for new book name */}
            {selectedBookId === "new" && (
              <div className="mt-2">
                <Input
                  value={newBookName}
                  onChange={(e) => setNewBookName(e.target.value)}
                  placeholder="New book name"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Add Page
          </Button>
        </div>
      </Card>
    </div>
  );
}

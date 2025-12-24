import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { TagChip } from "./ui/TagChip";
import { Input } from "./ui/Input";
import { RichBookmark } from "../models/RichBookmark";
import { Book } from "../models/Book";
import {
  StarIcon as StarSolid
} from "@heroicons/react/24/solid";
import {
  StarIcon as StarOutline,
  ClipboardIcon,
  Bars3Icon
} from "@heroicons/react/24/outline";

/**
 * BookmarkCard.tsx
 * -----------------
 * A comprehensive card component for displaying individual bookmarks.
 * Supports drag-and-drop reordering, inline/modal editing, pinning, selection,
 * and various actions like copying URL, retagging, and deletion.
 * Integrates with @dnd-kit for smooth drag interactions.
 */

/**
 * Props Interface
 * ---------------
 * Defines all properties required by the BookmarkCard component.
 */
type Props = {
  /** The bookmark data to display */
  b: RichBookmark;
  /** Whether this bookmark is currently selected for multi-select operations */
  selected: boolean;
  /** Callback to toggle selection state */
  onToggleSelected: (id: string) => void;
  /** Edit mode: "modal" for popup editing, "inline" for in-place editing */
  editMode: "modal" | "inline";
  /** Callback to request modal editing */
  onEditRequest: (b: RichBookmark) => void;
  /** Callback to save inline edits */
  onSaveInline: (b: RichBookmark) => void;
  /** Callback to delete the bookmark */
  onDelete: (id: string) => void;
  /** Callback to toggle pin status */
  onPin: (id: string) => void;
  /** Callback to retag the bookmark */
  onRetag: (b: RichBookmark) => void;
  /** Callback when a tag is clicked (for filtering) */
  onTagClick: (tag: string) => void;
  /** Array of all books for displaying book membership */
  books: Book[];
};

/**
 * BookmarkCard Component
 * ----------------------
 * Renders a draggable card representing a single bookmark.
 * Handles multiple interaction modes and visual states based on bookmark properties.
 *
 * @param props - The component props
 * @returns JSX element for the bookmark card
 */
export default function BookmarkCard({
  b,
  selected,
  onToggleSelected,
  editMode,
  onEditRequest,
  onSaveInline,
  onDelete,
  onPin,
  onRetag,
  onTagClick,
  books
}: Props) {
  // State for inline editing
  const [inlineTitle, setInlineTitle] = useState(b.title);
  const [inlineUrl, setInlineUrl] = useState(b.url);
  const [isEditingInline, setIsEditingInline] = useState(false);

  // Drag-and-drop hook from @dnd-kit
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: b.id });

  // Apply transform and opacity for drag state
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1 // Fade during drag
  };

  /**
   * startEdit
   * ----------
   * Initiates editing based on the current edit mode.
   * Either opens a modal or switches to inline editing.
   */
  function startEdit() {
    if (editMode === "modal") {
      onEditRequest(b);
    } else {
      setIsEditingInline(true);
    }
  }

  /**
   * saveInline
   * -----------
   * Saves the inline edits by calling the save callback with updated data.
   * Includes timestamp update and exits edit mode.
   */
  function saveInline() {
    onSaveInline({
      ...b,
      title: inlineTitle,
      url: inlineUrl,
      updatedAt: Date.now()
    });
    setIsEditingInline(false);
  }

  /**
   * copyUrl
   * --------
   * Copies the bookmark's URL to the clipboard using the modern Clipboard API.
   */
  function copyUrl() {
    navigator.clipboard.writeText(b.url);
  }

  // Find the book this bookmark belongs to (if any)
  const book = books.find((bk) => bk.id === b.bookId);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`
        border transition relative group
        ${
          b.pinned
            ? "bg-blue-900/30 border-blue-400/30 shadow-[0_0_12px_rgba(0,0,255,0.25)]" // Special styling for pinned bookmarks
            : "bg-emperor-surface border-emperor-border"
        }
        ${isDragging ? "ring-2 ring-emperor-accent" : ""} // Highlight during drag
      `}
      {...attributes}
    >
      {/* Main content row */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex gap-3 flex-1">
          {/* Selection checkbox */}
          <input
            type="checkbox"
            className="mt-1"
            checked={selected}
            onChange={() => onToggleSelected(b.id)}
          />

          {/* Drag handle */}
          <button
            className="mt-1 cursor-grab active:cursor-grabbing text-emperor-muted hover:text-emperor-text"
            {...listeners}
          >
            <Bars3Icon className="w-4 h-4" />
          </button>

          {/* Favicon display */}
          {b.faviconUrl && (
            <img src={b.faviconUrl} className="w-5 h-5 mt-1" />
          )}

          {/* Bookmark details */}
          <div className="flex-1">
            {isEditingInline ? (
              // Inline editing mode
              <div className="space-y-2">
                <Input
                  value={inlineTitle}
                  onChange={(e) => setInlineTitle(e.target.value)}
                />
                <Input
                  value={inlineUrl}
                  onChange={(e) => setInlineUrl(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" onClick={saveInline}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => setIsEditingInline(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              // Display mode
              <>
                {/* Title as clickable link */}
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline"
                >
                  {b.title}
                </a>

                {/* URL with copy button */}
                <div className="text-sm text-emperor-muted flex items-center gap-2">
                  {b.url}
                  <button
                    onClick={copyUrl}
                    className="opacity-0 group-hover:opacity-100 transition" // Show on hover
                  >
                    <ClipboardIcon className="w-4 h-4 text-emperor-muted hover:text-emperor-text" />
                  </button>
                </div>

                {/* Book membership indicator */}
                {book && (
                  <div className="text-xs text-emperor-muted mt-1">
                    In <span className="font-medium">{book.name}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action buttons (hidden during inline edit) */}
        {!isEditingInline && (
          <div className="flex items-center gap-3">
            {/* Pin/unpin button */}
            <button
              onClick={() => onPin(b.id)}
              className="flex items-center justify-center hover:scale-110 transition"
            >
              {b.pinned ? (
                <StarSolid className="w-5 h-5 text-yellow-400" />
              ) : (
                <StarOutline className="w-5 h-5 text-emperor-muted" />
              )}
            </button>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 justify-end">
              <Button size="sm" variant="subtle" onClick={() => onRetag(b)}>
                Retag
              </Button>
              <Button size="sm" variant="subtle" onClick={startEdit}>
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => onDelete(b.id)}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tags section */}
      <div className="mt-3 flex flex-wrap gap-2">
        {b.tags?.map((t) => (
          <TagChip
            key={t.label}
            label={t.label}
            onClick={() => onTagClick(t.label)}
          />
        ))}
      </div>
    </Card>
  );
}

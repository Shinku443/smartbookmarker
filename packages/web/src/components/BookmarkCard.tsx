import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { TagChip } from "./ui/TagChip";
import { Input } from "./ui/Input";

import type { RichBookmark } from "../models/RichBookmark";
import type { Book } from "../models/Book";

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
 * A draggable, interactive card representing a single bookmark.
 *
 * Features:
 *   - Drag handle (via @dnd-kit)
 *   - Selection checkbox (for multi‑select)
 *   - Inline or modal editing
 *   - Pin/unpin
 *   - Retagging
 *   - Tag chips (clickable, highlight if active)
 *   - Favicon, title, URL, copy‑URL button
 *   - Book membership indicator
 *
 * The card is intentionally dense but readable to support scanning.
 */

/**
 * Props Interface
 * ---------------
 * Defines all inputs required by BookmarkCard.
 */
type Props = {
  /** The bookmark data to display */
  b: RichBookmark;

  /** Whether this bookmark is selected in multi‑select mode */
  selected: boolean;
  /** Toggles selection state */
  onToggleSelected: (id: string) => void;

  /** Inline vs modal editing mode */
  editMode: "modal" | "inline";
  /** Requests modal editing of this bookmark */
  onEditRequest: (b: RichBookmark) => void;
  /** Saves inline edits to the bookmark */
  onSaveInline: (b: RichBookmark) => void;

  /** Deletes this bookmark */
  onDelete: (id: string) => void;

  /** Toggles the pinned state of this bookmark */
  onPin: (id: string) => void;

  /** Retags this bookmark (used for manual tagging) */
  onRetag: (b: RichBookmark) => void;

  /** Called when a tag chip is clicked (for filtering logic) */
  onTagClick: (tag: string) => void;

  /** All books (for displaying book membership) */
  books: Book[];

  /** Active tag filters, used to visually highlight matching chips */
  activeTags: string[];
};

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
  books,
  activeTags
}: Props) {
  /**
   * Inline editing state
   * --------------------
   * Only used when editMode === "inline".
   */
  const [inlineTitle, setInlineTitle] = useState(b.title);
  const [inlineUrl, setInlineUrl] = useState(b.url);
  const [isEditingInline, setIsEditingInline] = useState(false);

  /**
   * useSortable
   * -----------
   * Integrates the card into the @dnd-kit sortable system:
   *   - setNodeRef: ref for the draggable root
   *   - listeners: props for a drag handle
   *   - attributes: ARIA + DnD attributes
   *   - transform/transition: current drag transform
   *   - isDragging: boolean for visual state
   */
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: b.id });

  /**
   * style
   * -----
   * Applies drag transform and fade effect during drag.
   */
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };

  /**
   * startEdit
   * ----------
   * Decides between modal editing and inline editing based on editMode.
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
   * Saves inline edits and updates the bookmark's timestamp.
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
   * Copies the bookmark's URL to the clipboard.
   */
  function copyUrl() {
    navigator.clipboard.writeText(b.url);
  }

  /**
   * book
   * ----
   * Finds the book this bookmark belongs to, if any.
   */
  const book = books.find((bk) => bk.id === b.bookId);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`
        border transition relative group
        ${
          b.pinned
            ? "bg-blue-900/30 border-blue-400/30 shadow-[0_0_12px_rgba(0,0,255,0.25)]"
            : "bg-emperor-surface border-emperor-border"
        }
        ${isDragging ? "ring-2 ring-emperor-accent" : ""}
      `}
      {...attributes}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Main Row: checkbox + drag handle + favicon + content + actions     */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex gap-3 flex-1">
          {/* Selection checkbox (multi‑select) */}
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

          {/* Favicon (if present) */}
          {b.faviconUrl && (
            <img src={b.faviconUrl} className="w-5 h-5 mt-1" />
          )}

          {/* Core bookmark content */}
          <div className="flex-1">
            {isEditingInline ? (
              /* Inline editing mode */
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
              /* Display mode */
              <>
                {/* Title (clickable, opens in new tab) */}
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline"
                >
                  {b.title}
                </a>

                {/* URL with copy button (only visible on hover) */}
                <div className="text-sm text-emperor-muted flex items-center gap-2">
                  {b.url}
                  <button
                    onClick={copyUrl}
                    className="opacity-0 group-hover:opacity-100 transition"
                  >
                    <ClipboardIcon className="w-4 h-4 text-emperor-muted hover:text-emperor-text" />
                  </button>
                </div>

                {/* Book membership indicator (if in a book) */}
                {book && (
                  <div className="text-xs text-emperor-muted mt-1">
                    In <span className="font-medium">{book.name}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right-side actions (hidden while inline editing) */}
        {!isEditingInline && (
          <div className="flex items-center gap-3">
            {/* Pin / Unpin */}
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

            {/* Other actions */}
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

      {/* ------------------------------------------------------------------ */}
      {/* Tags Row: chips reflecting tag labels, clickable for filtering     */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-3 flex flex-wrap gap-2">
        {b.tags?.map((t) => (
          <TagChip
            key={t.label}
            label={t.label}
            active={activeTags.includes(t.label)}
            onClick={() => onTagClick(t.label)}
          />
        ))}
      </div>
    </Card>
  );
}
import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { TagChip } from "./ui/TagChip";
import { Input } from "./ui/Input";

import type { RichBookmark } from "../models/RichBookmark";
import type { Book } from "../models/Book";

import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import {
  StarIcon as StarOutline,
  ClipboardIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

/**
 * BookmarkCard.tsx
 * -----------------
 * Full interactive card for bookmarks.
 *
 * NEW:
 *   - `compact` mode for DragOverlay
 *   - Compact mode shows ALL informational content:
 *       • favicon
 *       • title
 *       • URL
 *       • "In Book" label
 *       • tags
 *       • created date
 *     but hides ALL interactive controls:
 *       • checkbox
 *       • star
 *       • retag
 *       • edit
 *       • delete
 *       • copy URL button
 *   - Compact mode is visually scaled down (~30%) and dimmed.
 *   - Compact mode has pointer-events disabled and no listeners.
 */

type Props = {
  b: RichBookmark;
  selected: boolean;
  onToggleSelected: (id: string) => void;

  editMode: "modal" | "inline";
  onEditRequest: (b: RichBookmark) => void;
  onSaveInline: (b: RichBookmark) => void;

  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onToggleReadLater: (id: string) => void;
  onRetag: (b: RichBookmark) => void;
  onTagClick: (tag: string) => void;

  books: Book[];
  activeTags: string[];

  /** Moves this bookmark to a different book (or root) */
  onMoveToBook: (id: string, bookId: string | null) => void;

  /** Whether reordering is allowed (drag handle enabled) */
  canReorder: boolean;

  onActivateBook?: (bookId: string) => void;

  /** Compact mode for DragOverlay (non-interactive) */
  compact?: boolean;
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
  onToggleReadLater,
  onRetag,
  onTagClick,
  books,
  activeTags,
  onMoveToBook,
  canReorder,
  onActivateBook,
  compact = false
}: Props) {
  /**
   * COMPACT MODE
   * ------------
   * A completely separate layout.
   * Shows all informational content.
   * Hides all interactive controls.
   * Scaled down to ~30%.
   * Dimmed edges.
   * Pointer events disabled.
   */
  if (compact) {
    const book = books.find((bk) => bk.id === b.bookId);

    return (
      <div className="scale-[0.30] opacity-90 pointer-events-none">
        <Card
          className={`
            border bg-emperor-surface shadow-xl rounded-lg p-4
            relative overflow-hidden
          `}
        >
          <div className="absolute inset-0 pointer-events-none rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.25)]" />

          {/* Top row */}
          <div className="flex gap-3 items-start">
          {/* Thumbnail and favicon */}
          <div className="flex gap-2">
            {b.thumbnailUrl && (
              <img
                src={b.thumbnailUrl}
                className="w-12 h-8 object-cover rounded flex-shrink-0"
                alt="Page preview"
              />
            )}
            {b.faviconUrl && (
              <img src={b.faviconUrl} className="w-5 h-5 mt-1 flex-shrink-0" />
            )}
          </div>

            <div className="flex-1">
              <div className="font-semibold truncate">{b.title}</div>

              <div className="text-sm text-emperor-muted truncate">
                {b.url}
              </div>

              {book && (
                <div className="text-xs text-emperor-muted mt-1">
                  In <span className="text-emperor-accent">{book.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tags + date */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {b.tags?.map((t) => (
                <TagChip
                  key={t.label}
                  label={t.label}
                  active={activeTags.includes(t.label)}
                  onClick={() => {}}
                />
              ))}
            </div>

            <div className="text-xs text-emperor-muted ml-4">
              {new Date(b.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  /**
   * FULL MODE
   * ---------
   * Original interactive card.
   */

  const [inlineTitle, setInlineTitle] = useState(b.title);
  const [inlineUrl, setInlineUrl] = useState(b.url);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: b.id });

  /**
   * DnD style
   * ---------
   * IMPORTANT:
   *   When isDragging, we do NOT apply the sortable transform to the
   *   original DOM node. The moving representation is handled by the
   *   DragOverlay. This prevents the "double transform" bug where the
   *   overlay appears offset (e.g., bottom-right) and reordering feels
   *   biased or only works in one direction.
   */
 const style = {
  transform: isDragging ? undefined : CSS.Transform.toString(transform),
  transition: isDragging ? "none" : transition,
};

  function startEdit() {
    if (editMode === "modal") onEditRequest(b);
    else setIsEditingInline(true);
  }

  function saveInline() {
    onSaveInline({
      ...b,
      title: inlineTitle,
      url: inlineUrl,
      updatedAt: Date.now()
    });
    setIsEditingInline(false);
  }

  function copyUrl() {
    if (!b.url) return;
    navigator.clipboard.writeText(b.url);
  }

  function updateStatus(newStatus: string) {
    const updatedBookmark = {
      ...b,
      status: newStatus === 'active' ? undefined : newStatus as any,
      updatedAt: Date.now()
    };
    onSaveInline(updatedBookmark);
  }

  const book = books.find((bk) => bk.id === b.bookId);

  const statusOptions = [
    { key: 'active', label: 'Active', emoji: '📄' },
    { key: 'favorite', label: 'Favorite', emoji: '⭐' },
    { key: 'read_later', label: 'Read Later', emoji: '📖' },
    { key: 'archive', label: 'Archive', emoji: '📦' },
    { key: 'review', label: 'Review', emoji: '🔍' },
    { key: 'broken', label: 'Broken', emoji: '❌' }
  ];

  const currentStatus = statusOptions.find(s => s.key === (b.status || 'active'));

  return (
   <Card
  ref={setNodeRef}
  style={style}
  {...attributes}
  {...(canReorder ? listeners : {})}
  className={`
    border transition relative group
    ${canReorder ? "cursor-grab active:cursor-grabbing" : "cursor-default"}

    ${isDragging ? "opacity-0 invisible pointer-events-none" : ""}

    ${
      b.pinned
        ? "bg-blue-900/30 border-blue-400/30 shadow-[0_0_12px_rgba(0,0,255,0.25)]"
        : "bg-emperor-surface border-emperor-border"
    }
    ${isDragging ? "ring-2 ring-emperor-accent" : ""}
  `}
>
      {/* Top row */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex gap-3 flex-1">
          <input
            type="checkbox"
            className="mt-1"
            checked={selected}
            onChange={() => onToggleSelected(b.id)}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Thumbnail and favicon */}
          <div className="flex gap-2">
            {b.thumbnailUrl && (
              <img
                src={b.thumbnailUrl}
                className="w-12 h-8 object-cover rounded flex-shrink-0"
                alt="Page preview"
              />
            )}
            {b.faviconUrl && (
              <img src={b.faviconUrl} className="w-5 h-5 mt-1 flex-shrink-0" />
            )}
          </div>

          <div className="flex-1">
            {isEditingInline ? (
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
              <>
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {b.title}
                </a>

                <div className="text-sm text-emperor-muted flex items-center gap-2">
                  {b.url}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyUrl();
                    }}
                    className="opacity-0 group-hover:opacity-100 transition"
                  >
                    <ClipboardIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Description (legacy) */}
                {b.description && (
                  <div className="text-sm text-emperor-muted mt-1 italic">
                    {b.description}
                  </div>
                )}

                {/* Extracted content preview */}
                {b.extractedText && (
                  <div className="text-sm text-emperor-muted mt-2 p-2 bg-emperor-surface rounded border-l-2 border-emperor-accent/30">
                    {b.extractedText}
                  </div>
                )}

                {/* Screenshot thumbnail */}
                {b.screenshotUrl && (
                  <div className="mt-2">
                    <img
                      src={b.screenshotUrl}
                      alt="Page preview"
                      className="w-full h-24 object-cover rounded border border-emperor-border opacity-70 hover:opacity-100 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(b.url, '_blank');
                      }}
                    />
                  </div>
                )}

                {book && (
                  <div className="text-xs text-emperor-muted mt-1">
                    In{" "}
                    <button
                      className="text-emperor-accent font-medium hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onActivateBook?.(book.id);
                      }}
                    >
                      {book.name}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {!isEditingInline && (
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPin(b.id);
              }}
              className="hover:scale-110 transition"
            >
              {b.pinned ? (
                <StarSolid className="w-5 h-5 text-yellow-400" />
              ) : (
                <StarOutline className="w-5 h-5 text-emperor-muted" />
              )}
            </button>

            {/* Status Selector */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStatusDropdown(!showStatusDropdown);
                }}
                className="text-sm px-2 py-1 rounded border border-emperor-border hover:bg-emperor-surface transition flex items-center gap-1"
                title={`Status: ${currentStatus?.label}`}
              >
                <span>{currentStatus?.emoji}</span>
                <span className="text-xs">▼</span>
              </button>

              {showStatusDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-emperor-surface border border-emperor-border rounded-md shadow-lg z-10 min-w-[120px]">
                  {statusOptions.map((status) => (
                    <button
                      key={status.key}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateStatus(status.key);
                        setShowStatusDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-emperor-surfaceStrong flex items-center gap-2 ${
                        status.key === (b.status || 'active') ? 'bg-emperor-accent/10 text-emperor-accent' : ''
                      }`}
                    >
                      <span>{status.emoji}</span>
                      <span>{status.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              size="sm"
              variant="subtle"
              onClick={(e) => {
                e.stopPropagation();
                onRetag(b);
              }}
            >
              Retag
            </Button>

            <Button
              size="sm"
              variant="subtle"
              onClick={(e) => {
                e.stopPropagation();
                // Share bookmark
                const shareData = {
                  title: b.title,
                  text: b.description || b.title,
                  url: b.url
                };
                if ((navigator as any).share) {
                  (navigator as any).share(shareData).catch(() => {
                    // Fallback: copy to clipboard
                    navigator.clipboard.writeText(`${b.title}\n${b.url}`);
                    alert('Bookmark copied to clipboard!');
                  });
                } else {
                  // Fallback: copy to clipboard
                  navigator.clipboard.writeText(`${b.title}\n${b.url}`);
                  alert('Bookmark copied to clipboard!');
                }
              }}
            >
              Share
            </Button>

            <Button
              size="sm"
              variant="subtle"
              onClick={(e) => {
                e.stopPropagation();
                startEdit();
              }}
            >
              Edit
            </Button>

            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(b.id);
              }}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Tags + date */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {b.tags?.map((t) => (
            <TagChip
              key={t.label}
              label={t.label}
              active={activeTags.includes(t.label)}
              onClick={() => onTagClick(t.label)}
            />
          ))}
        </div>

        <div className="text-xs text-emperor-muted ml-4">
          {new Date(b.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
          })}
        </div>
      </div>
    </Card>
  );
}

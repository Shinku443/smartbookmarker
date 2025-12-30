import React, { useState, useEffect, useRef } from "react";
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
 *   - "Move" menu with search, keyboard navigation
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
  onRetag: (b: RichBookmark) => void;
  onTagClick: (tag: string) => void;

  books: Book[];
  activeTags: string[];

  /** Moves this bookmark to a different book (or root) */
  onMoveToBook: (id: string, bookId: string | null) => void;

  /** Whether reordering is allowed (drag handle enabled) */
  canReorder: boolean;
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
  activeTags,
  onMoveToBook,
  canReorder
}: Props) {
  const [inlineTitle, setInlineTitle] = useState(b.title);
  const [inlineUrl, setInlineUrl] = useState(b.url);
  const [isEditingInline, setIsEditingInline] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: b.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };

  function startEdit() {
    if (editMode === "modal") {
      onEditRequest(b);
    } else {
      setIsEditingInline(true);
    }
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

  const book = books.find((bk) => bk.id === b.bookId);

  /**
   * Move menu state
   * ---------------
   * Searchable, keyboard‑navigable dropdown for moving a bookmark.
   */
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [moveSearch, setMoveSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const moveMenuRef = useRef<HTMLDivElement | null>(null);
  const moveButtonRef = useRef<HTMLButtonElement | null>(null);

  const filteredBooks = books.filter((bk) =>
    bk.name.toLowerCase().includes(moveSearch.toLowerCase())
  );

  const moveOptions: { label: string; targetId: string | null }[] = [
    { label: "All Pages", targetId: null },
    ...filteredBooks.map((bk) => ({ label: bk.name, targetId: bk.id }))
  ];

  useEffect(() => {
    if (!showMoveMenu) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        moveMenuRef.current &&
        !moveMenuRef.current.contains(e.target as Node) &&
        !moveButtonRef.current?.contains(e.target as Node)
      ) {
        setShowMoveMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMoveMenu]);

  function handleMoveKeyDown(e: React.KeyboardEvent) {
    if (moveOptions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % moveOptions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) =>
        prev === 0 ? moveOptions.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = moveOptions[focusedIndex];
      if (!option) return;
      onMoveToBook(b.id, option.targetId);
      setShowMoveMenu(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowMoveMenu(false);
    }
  }

  function openMoveMenu() {
    setShowMoveMenu(true);
    setMoveSearch("");
    setFocusedIndex(0);
  }

  function toggleMoveMenu(e: React.MouseEvent) {
    e.stopPropagation();
    setShowMoveMenu((prev) => !prev);
    if (!showMoveMenu) {
      setMoveSearch("");
      setFocusedIndex(0);
    }
  }

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
            className={`mt-1 text-emperor-muted hover:text-emperor-text
              ${
                canReorder
                  ? "cursor-grab active:cursor-grabbing"
                  : "cursor-not-allowed opacity-60"
              }`}
            {...(canReorder ? listeners : {})}
            title={
              canReorder
                ? "Reorder within this book"
                : "Reordering is disabled on All Pages"
            }
          >
            <Bars3Icon className="w-4 h-4" />
          </button>

          {/* Favicon */}
          {b.faviconUrl && (
            <img src={b.faviconUrl} className="w-5 h-5 mt-1" />
          )}

          {/* Content */}
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
                >
                  {b.title}
                </a>

                <div className="text-sm text-emperor-muted flex items-center gap-2">
                  {b.url}
                  <button
                    onClick={copyUrl}
                    className="opacity-0 group-hover:opacity-100 transition"
                    title="Copy URL"
                  >
                    <ClipboardIcon className="w-4 h-4 text-emperor-muted hover:text-emperor-text" />
                  </button>
                </div>

                {book && (
                  <div className="text-xs text-emperor-muted mt-1">
                    In <span className="font-medium">{book.name}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

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

            {/* Actions */}
            <div className="flex flex-wrap gap-2 justify-end">
              <Button size="sm" variant="subtle" onClick={() => onRetag(b)}>
                Retag
              </Button>

              {/* Move menu */}
              <div className="relative">
                <Button
                  ref={moveButtonRef}
                  size="sm"
                  variant="subtle"
                  onClick={toggleMoveMenu}
                >
                  Move
                </Button>

                {showMoveMenu && (
                  <div
                    ref={moveMenuRef}
                    className="absolute right-0 mt-1 w-56 bg-emperor-surfaceStrong border border-emperor-border rounded-card shadow-lg z-50 origin-top-right transform scale-95 opacity-0 animate-emperor-dropdown"
                    onKeyDown={handleMoveKeyDown}
                    tabIndex={-1}
                  >
                    <div className="p-2 border-b border-emperor-border">
                      <Input
                        value={moveSearch}
                        onChange={(e) => {
                          setMoveSearch(e.target.value);
                          setFocusedIndex(0);
                        }}
                        placeholder="Search books…"
                        className="text-sm"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {moveOptions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-emperor-muted">
                          No books match.
                        </div>
                      ) : (
                        moveOptions.map((option, index) => (
                          <button
                            key={`${option.targetId ?? "root"}`}
                            className={`w-full text-left px-3 py-2 text-sm rounded
                              ${
                                index === focusedIndex
                                  ? "bg-emperor-surface text-emperor-text"
                                  : "hover:bg-emperor-surface text-emperor-muted"
                              }`}
                            onClick={() => {
                              onMoveToBook(b.id, option.targetId);
                              setShowMoveMenu(false);
                            }}
                            onMouseEnter={() => setFocusedIndex(index)}
                          >
                            {option.label}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Button size="sm" variant="subtle" onClick={startEdit}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => onDelete(b.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

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
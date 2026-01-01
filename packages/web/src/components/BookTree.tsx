import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  EllipsisVerticalIcon,
  FolderOpenIcon,
  PlusSmallIcon,
  CursorArrowRaysIcon,
  PencilSquareIcon,
  SparklesIcon,
  ShareIcon,
  TrashIcon
} from "@heroicons/react/24/outline";

import type { Book } from "../models/Book";
import type { RichBookmark } from "../models/RichBookmark";
import ChangeIconModal from "../components/modals/ChangeIconModal";

/**
 * BookTree.tsx
 * -------------
 * Hierarchical tree view of books with:
 *
 * Features:
 *   - Full‑row clickable book entries (Raindrop‑style)
 *   - Entire row is draggable (no hamburger)
 *   - Expand/collapse with smooth animation
 *   - Inline creation of books and sub‑books
 *   - Auto‑expand on drag hover (for nested drop targets)
 *   - Drag‑and‑drop nesting (books as draggable + droppable)
 *   - Root‑level drop zone for books
 *   - Nested page counts (book + descendants)
 *   - Book Action Menu (rename, icon, delete, share, etc.)
 *   - Emoji-based icons for books (via Change Icon modal)
 *
 * DESIGN NOTE
 * -----------
 * This component is intentionally UI‑focused and stateless.
 * All mutations flow upward to App.tsx via callbacks.
 *
 * The entire row is draggable — not a handle — which matches Raindrop’s UX.
 * A small drag activation distance prevents accidental drags on click.
 */

/* -------------------------------------------------------------------------- */
/* Tree Construction Helpers                                                  */
/* -------------------------------------------------------------------------- */

type TreeNode = Book & {
  children: TreeNode[];
  depth: number;
};

/**
 * buildTree
 * ---------
 * Converts a flat list of books into a nested tree structure.
 */
function buildTree(books: Book[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const b of books) {
    byId.set(b.id, { ...b, children: [], depth: 0 });
  }

  for (const node of byId.values()) {
    if (node.parentBookId && byId.has(node.parentBookId)) {
      const parent = byId.get(node.parentBookId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * getNestedPageCount
 * ------------------
 * Returns the total number of pages inside a book and all of its descendants.
 */
function getNestedPageCount(
  bookId: string,
  books: Book[],
  bookmarks: RichBookmark[]
): number {
  const children = books.filter((b) => b.parentBookId === bookId);
  const directPages = bookmarks.filter((b) => b.bookId === bookId).length;

  let nested = 0;
  for (const child of children) {
    nested += getNestedPageCount(child.id, books, bookmarks);
  }

  return directPages + nested;
}

/* -------------------------------------------------------------------------- */
/* Inline Create Input                                                        */
/* -------------------------------------------------------------------------- */

function InlineCreateInput({
  depth,
  onSubmit,
  onCancel
}: {
  depth: number;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div
      className="flex items-center py-1"
      style={{ paddingLeft: depth * 16 + 32 }}
    >
      <input
        ref={ref}
        className="text-sm px-2 py-1 rounded-card bg-emperor-surface text-emperor-text w-full outline-none"
        placeholder="New book name…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
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
  );
}

/* -------------------------------------------------------------------------- */
/* Book Icon Renderer (emoji + custom uploads)                                */
/* -------------------------------------------------------------------------- */

function BookIcon({ icon }: { icon: string | null | undefined }) {
  if (!icon) {
    // return <span className="text-base leading-none mr-1">📘</span>;
    return null;
  }

  // Custom uploaded icons (data URLs or blob URLs)
  if (icon.startsWith("data:") || icon.startsWith("blob:")) {
    return (
      <img
        src={icon}
        className="w-4 h-4 mr-1 object-contain"
        draggable={false}
      />
    );
  }

  // Unicode emoji
  return <span className="text-base leading-none mr-1">{icon}</span>;
}

/* -------------------------------------------------------------------------- */
/* Draggable Book Item                                                        */
/* -------------------------------------------------------------------------- */

type BookTreeItemProps = {
  node: TreeNode;
  books: Book[];
  bookmarks: RichBookmark[];
  activeBookId: string | null;
  onBookClick: (id: string | null) => void;
  onCreateBook: (parentId: string | null, name: string) => void;
  onMoveBook: (id: string, parentId: string | null) => void;
  isBookExpanded: (id: string) => boolean;
  onToggleExpanded: (id: string) => void;
  isDraggingBookmark: boolean;
  autoExpandOnHover: (id: string) => void;
  inlineCreateFor: string | null;
  setInlineCreateFor: (id: string | null) => void;

  /** Global Book Action Menu control (one open at a time) */
  openMenuFor: string | null;
  setOpenMenuFor: (id: string | null) => void;

  onRenameBook?: (bookId: string, newName: string) => void;
  onChangeBookIcon?: (bookId: string, icon: string | null) => void;
  onDeleteBook?: (bookId: string) => void;
  onOpenAllBookmarks?: (bookId: string) => void;
  onShareBook?: (bookId: string) => void;

  /** Open the Change Icon modal for this book */
  onRequestChangeIcon: (bookId: string) => void;
};

/**
 * DraggableBookItem
 * -----------------
 * Renders a single book row with:
 *   - Full‑row click to activate
 *   - Entire row is draggable (no hamburger)
 *   - Expand/collapse chevron
 *   - Nested page count
 *   - Action menu
 */
function DraggableBookItem({
  node,
  books,
  bookmarks,
  activeBookId,
  onBookClick,
  onCreateBook,
  onMoveBook,
  isBookExpanded,
  onToggleExpanded,
  isDraggingBookmark,
  autoExpandOnHover,
  inlineCreateFor,
  setInlineCreateFor,
  openMenuFor,
  setOpenMenuFor,
  onRenameBook,
  onChangeBookIcon,
  onDeleteBook,
  onOpenAllBookmarks,
  onShareBook,
  onRequestChangeIcon
}: BookTreeItemProps) {
  /* ------------------------------ DnD Setup ------------------------------ */

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: node.id });

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.id });

  /**
   * FIX: Only apply transform when THIS BOOK is being dragged.
   * ----------------------------------------------------------
   * When dragging a BOOKMARK, we must NOT transform book rows.
   * Otherwise the bookmark overlay gets "sucked" upward into the tree,
   * because both the bookmark and the book row are moving at the same time.
   *
   * This matches Raindrop’s behavior:
   *   - Books move when dragging books
   *   - Books stay still when dragging bookmarks
   *   - Bookmark overlay moves freely and visibly
   */
  const style = {
    transform:
      isDragging && !isDraggingBookmark && transform
        ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
        : undefined,
    transition: isDragging ? "none" : undefined
  };

  /* ------------------------------ Local State ---------------------------- */

  const [isRenaming, setIsRenaming] = useState(false);
  const [localName, setLocalName] = useState(node.name);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Timer for delayed auto‑expand on hover while dragging
  const hoverTimer = useRef<number | null>(null);

  const hasChildren = node.children.length > 0;
  const isActive = activeBookId === node.id;
  const isExpanded = isBookExpanded(node.id);
  const nestedCount = getNestedPageCount(node.id, books, bookmarks);
  const menuOpen = openMenuFor === node.id;

  /* ------------------------------ Hover Expand --------------------------- */

  useEffect(() => {
    const shouldExpand =
      isOver && !isExpanded && !isDraggingBookmark && hasChildren;

    if (shouldExpand) {
      if (hoverTimer.current == null) {
        hoverTimer.current = window.setTimeout(() => {
          autoExpandOnHover(node.id);
          hoverTimer.current = null;
        }, 800);
      }
    } else {
      if (hoverTimer.current != null) {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
    }

    return () => {
      if (hoverTimer.current != null) {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
    };
  }, [
    isOver,
    isExpanded,
    isDraggingBookmark,
    hasChildren,
    node.id,
    autoExpandOnHover
  ]);

  /* ------------------------------ Menu Outside Click --------------------- */

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (!menuRef.current) {
        setOpenMenuFor(null);
        return;
      }
      if (!menuRef.current.contains(e.target as Node)) {
        setOpenMenuFor(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, setOpenMenuFor]);

  /* ------------------------------ Rename Sync ---------------------------- */

  useEffect(() => {
    setLocalName(node.name);
  }, [node.name]);

  function handleRenameCommit() {
    const trimmed = localName.trim();
    if (!trimmed) {
      setLocalName(node.name);
      setIsRenaming(false);
      return;
    }
    if (trimmed !== node.name) {
      onRenameBook?.(node.id, trimmed);
    }
    setIsRenaming(false);
  }

  /* ------------------------------ Menu Toggle ---------------------------- */

  function toggleMenu() {
    const willOpen = !menuOpen;

    if (!willOpen) {
      setOpenMenuFor(null);
      return;
    }

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const menuWidth = 192;
      const left = rect.right - menuWidth;
      const top = rect.bottom + 4;
      setMenuPosition({ top, left });
    }

    setOpenMenuFor(node.id);
  }

  const portalRoot =
    typeof document !== "undefined"
      ? document.getElementById("book-action-menu-root")
      : null;

  /* ------------------------------ Render ------------------------------------- */

  return (
    <div
      ref={setDropRef}
      className={`group relative ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center py-1">
        {/* Entire row (chevron + emoji + name + count + menu) indents together */}
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          style={{
            ...style,
            paddingLeft: node.depth * 16 + 16
          }}
          className={`
            flex items-center flex-1 rounded-card px-1 pr-2 py-1
            cursor-grab active:cursor-grabbing select-none transition-colors
            ${isActive
              ? "bg-emperor-surfaceStrong"
              : "hover:bg-emperor-surface"
            }
            ${isOver && !isDraggingBookmark
              ? "outline outline-2 outline-emperor-accent"
              : ""
            }
          `}
          onClick={(e) => {
            e.stopPropagation();
            onBookClick(node.id);
          }}
        >
          {/* Expand/collapse chevron */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded(node.id);
            }}
            className="w-4 h-4 flex items-center justify-center text-emperor-muted hover:text-emperor-text mr-1"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDownIcon className="w-3 h-3" />
              ) : (
                <ChevronRightIcon className="w-3 h-3" />
              )
            ) : (
              <span className="inline-block w-3 h-3" />
            )}
          </button>

          {/* Optional emoji icon (from Book model) */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRequestChangeIcon(node.id);
            }}
            className="mr-1 p-0.5 rounded hover:bg-emperor-surfaceStrong"
          >
            <BookIcon icon={node.icon} />
          </button>

          {/* Name / rename input */}
          <div className="flex-1 min-w-0">
            {isRenaming ? (
              <input
                className="w-full text-sm px-1 py-0.5 rounded-card bg-emperor-surface text-emperor-text outline-none"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameCommit();
                  if (e.key === "Escape") {
                    setLocalName(node.name);
                    setIsRenaming(false);
                  }
                }}
                onBlur={handleRenameCommit}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="text-sm truncate"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                }}
              >
                {node.name}
              </span>
            )}
          </div>

          {/* Nested page count */}
          <span className="text-xs text-emperor-muted ml-2">
            {nestedCount}
          </span>

          {/* Action menu trigger */}
          <button
            ref={triggerRef}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              toggleMenu();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-emperor-surfaceStrong"
          >
            <EllipsisVerticalIcon className="w-4 h-4 text-emperor-muted" />
          </button>
        </div>
      </div>

      {/* Inline sub-book creation */}
      {inlineCreateFor === node.id && (
        <InlineCreateInput
          depth={node.depth}
          onSubmit={(name) => {
            onCreateBook(node.id, name);
            setInlineCreateFor(null);
            onToggleExpanded(node.id);
          }}
          onCancel={() => setInlineCreateFor(null)}
        />
      )}

      {/* Children */}
      <div
        className={`transition-all duration-200 overflow-hidden ${isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
          }`}
      >
        {node.children.map((child) => (
          <DraggableBookItem
            key={child.id}
            node={child}
            books={books}
            bookmarks={bookmarks}
            activeBookId={activeBookId}
            onBookClick={onBookClick}
            onCreateBook={onCreateBook}
            onMoveBook={onMoveBook}
            isBookExpanded={isBookExpanded}
            onToggleExpanded={onToggleExpanded}
            isDraggingBookmark={isDraggingBookmark}
            autoExpandOnHover={autoExpandOnHover}
            inlineCreateFor={inlineCreateFor}
            setInlineCreateFor={setInlineCreateFor}
            openMenuFor={openMenuFor}
            setOpenMenuFor={setOpenMenuFor}
            onRenameBook={onRenameBook}
            onChangeBookIcon={onChangeBookIcon}
            onDeleteBook={onDeleteBook}
            onOpenAllBookmarks={onOpenAllBookmarks}
            onShareBook={onShareBook}
            onRequestChangeIcon={onRequestChangeIcon}
          />
        ))}
      </div>

      {/* Action Menu (portal) */}
      {menuOpen &&
        portalRoot &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[99999] w-48 bg-emperor-surfaceStrong border border-emperor-border rounded-card shadow-lg origin-top-right transform scale-95 opacity-0 animate-emperor-dropdown"
            style={{
              top: menuPosition.top,
              left: menuPosition.left
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-emperor-surface"
              onClick={() => {
                onOpenAllBookmarks?.(node.id);
                setOpenMenuFor(null);
              }}
            >
              <FolderOpenIcon className="w-4 h-4 text-emperor-muted" />
              <span>Open all bookmarks</span>
            </button>

            <button
              className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-emperor-surface"
              onClick={() => {
                setInlineCreateFor(node.id);
                setOpenMenuFor(null);
              }}
            >
              <PlusSmallIcon className="w-4 h-4 text-emperor-muted" />
              <span>Create nested collection</span>
            </button>

            <button
              className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-emperor-surface"
              onClick={() => {
                onBookClick(node.id);
                setOpenMenuFor(null);
              }}
            >
              <CursorArrowRaysIcon className="w-4 h-4 text-emperor-muted" />
              <span>Select</span>
            </button>

            <button
              className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-emperor-surface"
              onClick={() => {
                setIsRenaming(true);
                setOpenMenuFor(null);
              }}
            >
              <PencilSquareIcon className="w-4 h-4 text-emperor-muted" />
              <span>Rename</span>
            </button>

            <button
              className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-emperor-surface"
              onClick={() => {
                onRequestChangeIcon(node.id);
                setOpenMenuFor(null);
              }}
            >
              <SparklesIcon className="w-4 h-4 text-emperor-muted" />
              <span>Change icon</span>
            </button>

            <button
              className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-emperor-surface"
              onClick={() => {
                onShareBook?.(node.id);
                setOpenMenuFor(null);
              }}
            >
              <ShareIcon className="w-4 h-4 text-emperor-muted" />
              <span>Share</span>
            </button>

            <button
              className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-red-500 hover:bg-emperor-surface"
              onClick={() => {
                onDeleteBook?.(node.id);
                setOpenMenuFor(null);
              }}
            >
              <TrashIcon className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>,
          portalRoot
        )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* BookTree Component                                                         */
/* -------------------------------------------------------------------------- */

type BookTreeProps = {
  books: Book[];
  bookmarks: RichBookmark[];
  activeBookId: string | null;
  onBookClick: (id: string | null) => void;
  onCreateBook: (parentId: string | null, name: string) => void;
  onMoveBook: (id: string, parentId: string | null) => void;
  onBookmarkDrop?: (bookmarkId: string, bookId: string | null) => void;
  isDraggingBookmark: boolean;
  onRenameBook?: (bookId: string, newName: string) => void;
  onChangeBookIcon?: (bookId: string, icon: string | null) => void;
  onDeleteBook?: (bookId: string) => void;
  onOpenAllBookmarks?: (bookId: string) => void;
  onShareBook?: (bookId: string) => void;
};

export default function BookTree({
  books,
  bookmarks,
  activeBookId,
  onBookClick,
  onCreateBook,
  onMoveBook,
  onBookmarkDrop,
  isDraggingBookmark,
  onRenameBook,
  onChangeBookIcon,
  onDeleteBook,
  onOpenAllBookmarks,
  onShareBook
}: BookTreeProps) {
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set());
  const [inlineCreateFor, setInlineCreateFor] = useState<string | null>(null);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [iconModalForBookId, setIconModalForBookId] = useState<string | null>(
    null
  );

  const { setNodeRef: setRootRef, isOver: isRootOver } = useDroppable({
    id: "library-root"
  });

  const treeNodes = buildTree(books);

  function toggleExpanded(id: string) {
    setExpandedBooks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function autoExpandOnHover(id: string) {
    setExpandedBooks((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  /* ------------------------------ Render ------------------------------------- */

  return (
    <div className="relative space-y-1 p-1 rounded-card">
      {/* All Pages root entry */}
      <div
        ref={setRootRef}
        className={`w-full text-left text-sm px-2 py-1 rounded-card cursor-pointer
          ${activeBookId === null
            ? "bg-emperor-surfaceStrong"
            : "hover:bg-emperor-surface"
          }
          ${isRootOver ? "outline outline-2 outline-emperor-accent" : ""}
        `}
        onClick={() => {
          onBookClick(null);
          setOpenMenuFor(null);
        }}
      >
        All Pages
      </div>

      {/* Tree */}
      {treeNodes.map((node) => (
        <DraggableBookItem
          key={node.id}
          node={node}
          books={books}
          bookmarks={bookmarks}
          activeBookId={activeBookId}
          onBookClick={onBookClick}
          onCreateBook={onCreateBook}
          onMoveBook={onMoveBook}
          isBookExpanded={(id) => expandedBooks.has(id)}
          onToggleExpanded={toggleExpanded}
          isDraggingBookmark={isDraggingBookmark}
          autoExpandOnHover={autoExpandOnHover}
          inlineCreateFor={inlineCreateFor}
          setInlineCreateFor={setInlineCreateFor}
          openMenuFor={openMenuFor}
          setOpenMenuFor={setOpenMenuFor}
          onRenameBook={onRenameBook}
          onChangeBookIcon={onChangeBookIcon}
          onDeleteBook={onDeleteBook}
          onOpenAllBookmarks={onOpenAllBookmarks}
          onShareBook={onShareBook}
          onRequestChangeIcon={(bookId) => setIconModalForBookId(bookId)}
        />
      ))}

      {/* Root-level inline create */}
      {inlineCreateFor === "root" ? (
        <InlineCreateInput
          depth={0}
          onSubmit={(name) => {
            onCreateBook(null, name);
            setInlineCreateFor(null);
          }}
          onCancel={() => setInlineCreateFor(null)}
        />
      ) : (
        <button
          className="w-full text-left text-sm px-2 py-1 rounded-card text-emperor-muted hover:bg-emperor-surface"
          onClick={() => setInlineCreateFor("root")}
        >
          + New Book
        </button>
      )}

      {/* Change Icon modal */}
      {iconModalForBookId && (
        <ChangeIconModal
          onClose={() => setIconModalForBookId(null)}
          onSelect={(emoji) => {
            onChangeBookIcon?.(iconModalForBookId, emoji);
            setIconModalForBookId(null);
          }}
          onDelete={() => {
            onChangeBookIcon?.(iconModalForBookId, null);
            setIconModalForBookId(null);
          }}
        />
      )}
    </div>
  );
}
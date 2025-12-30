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

/**
 * BookTree.tsx
 * -------------
 * Hierarchical tree view of books with:
 *   - Inline creation of books/sub‑books
 *   - Expand/collapse with simple animation
 *   - Auto‑expand on drag hover (with delay)
 *   - Drag‑and‑drop nesting (books as draggable + droppable)
 *   - Root‑level drop zone for books
 *   - Explicit "All Pages" drop target for bookmarks
 *   - Visual outlines for drop targets
 *   - Raindrop‑style nested page count
 *   - Raindrop‑style Book Action Menu (overflow 3‑dot) with:
 *       • Open all bookmarks
 *       • Create nested collection
 *       • Select
 *       • Rename (inline + double‑click)
 *       • Change icon (emoji picker)
 *       • Share
 *       • Delete
 *
 * This component owns only UI state (expanded/collapsed, inline creation target, open menu).
 * All persistence and domain logic flows through App.tsx via props.
 */

type BookTreeProps = {
  /** Flat list of all books */
  books: Book[];
  /** All bookmarks (pages), used for nested page counts */
  bookmarks: RichBookmark[];
  /** Currently active book ID (null = All Pages) */
  activeBookId: string | null;
  /** Called when a book or "All Pages" is selected */
  onBookClick: (bookId: string | null) => void;
  /** Inline creation handler (App.tsx → addBook) */
  onCreateBook: (parentId: string | null, name: string) => void;
  /** Move a book into another book or back to root */
  onMoveBook: (bookId: string, newParentId: string | null) => void;
  /** Assign a bookmark to a book via drag‑and‑drop (handled in App) */
  onBookmarkDrop?: (bookmarkId: string, bookId: string | null) => void;
  /** Whether a bookmark (not a book) is being dragged */
  isDraggingBookmark: boolean;

  /** Optional: rename a book (for inline rename) */
  onRenameBook?: (bookId: string, newName: string) => void;
  /** Optional: change icon for a book (emoji picker) */
  onChangeBookIcon?: (bookId: string, icon: string) => void;
  /** Optional: delete a book */
  onDeleteBook?: (bookId: string) => void;
  /** Optional: open all bookmarks in a book */
  onOpenAllBookmarks?: (bookId: string) => void;
  /** Optional: share a book */
  onShareBook?: (bookId: string) => void;
};

/**
 * Tree node type for rendering
 * (derived from Book with nested children and depth for indentation)
 */
type TreeNode = Book & {
  children: TreeNode[];
  depth: number;
};

/**
 * Builds a nested tree structure from a flat list of books.
 * Uses parentBookId relationships and depth tracking.
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
 * Recursively count all pages in a book and its descendants.
 */
function getNestedPageCount(
  bookId: string,
  books: Book[],
  bookmarks: RichBookmark[] = []
): number {
  const children = books.filter((b) => b.parentBookId === bookId);
  const directPages = bookmarks.filter((b) => b.bookId === bookId).length;

  let nested = 0;
  for (const child of children) {
    nested += getNestedPageCount(child.id, books, bookmarks);
  }

  return directPages + nested;
}

/**
 * InlineCreateInput
 * -----------------
 * Temporary inline input row for creating a new book or sub‑book.
 * Replaces the "New Book" entry while active.
 */
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
      style={{ paddingLeft: `${depth * 16 + 16}px` }}
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

/**
 * Simple emoji picker for "Change icon".
 * In a future iteration, this could be replaced with a richer picker.
 */
const EMOJI_CHOICES = ["📚", "📁", "⭐", "🧠", "📝", "🏷️", "📂", "🔥"];

function EmojiPicker({
  onSelect
}: {
  onSelect: (emoji: string) => void;
}) {
  return (
    <div className="mt-1 grid grid-cols-4 gap-1 p-2 bg-emperor-surface border border-emperor-border rounded-card">
      {EMOJI_CHOICES.map((emoji) => (
        <button
          key={emoji}
          className="text-xl leading-none p-1 hover:bg-emperor-surfaceStrong rounded-card"
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

/**
 * DraggableBookItem
 * -----------------
 * Renders a single book row:
 *   - Draggable as a book
 *   - Droppable as a book target
 *   - Expand/collapse if it has children
 *   - Inline sub‑book creation
 *   - Raindrop‑style nested page count
 *   - Book Action Menu (overflow 3‑dot)
 *   - Inline rename (including double‑click)
 *   - Emoji picker for icon
 *
 * IMPORTANT:
 *   The draggable wrapper only wraps the label area,
 *   NOT the expand/collapse button, so expand/collapse works normally.
 */
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
  onChangeBookIcon?: (bookId: string, icon: string) => void;
  onDeleteBook?: (bookId: string) => void;
  onOpenAllBookmarks?: (bookId: string) => void;
  onShareBook?: (bookId: string) => void;
};

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
  onShareBook
}: BookTreeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging
  } = useDraggable({ id: node.id });

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.id });

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [localName, setLocalName] = useState(node.name);
  const [localIcon, setLocalIcon] = useState<string | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [menuDirection, setMenuDirection] = useState<"down" | "up">("down");
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

  // Delayed auto‑expand when hovering a collapsed parent with a dragged item
  useEffect(() => {
    const shouldSchedule =
      isOver && !isExpanded && !isDraggingBookmark && hasChildren;

    if (shouldSchedule) {
      // Only schedule if not already scheduled
      if (hoverTimer.current == null) {
        hoverTimer.current = window.setTimeout(() => {
          autoExpandOnHover(node.id);
          hoverTimer.current = null;
        }, 800); // 0.8s feels good; adjust to 1000–1500ms if you want slower
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

  // Click‑outside to close Book Action Menu + emoji picker
  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (!menuRef.current) {
        setOpenMenuFor(null);
        setEmojiPickerOpen(false);
        return;
      }
      if (!menuRef.current.contains(e.target as Node)) {
        setOpenMenuFor(null);
        setEmojiPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, setOpenMenuFor]);

  // Sync localName if the node name changes externally
  useEffect(() => {
    setLocalName(node.name);
  }, [node.name]);

  // Stabilize drag position: no transitions while dragging
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        transition: isDragging ? "none" : undefined
      }
    : undefined;

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

  function handleEmojiSelect(emoji: string) {
    setLocalIcon(emoji);
    onChangeBookIcon?.(node.id, emoji);
    setEmojiPickerOpen(false);
    setOpenMenuFor(null);
  }

  function closeMenu() {
    setOpenMenuFor(null);
    setEmojiPickerOpen(false);
  }

  function toggleMenu() {
    const willOpen = !menuOpen;

    if (!willOpen) {
      closeMenu();
      return;
    }

    if (typeof window === "undefined") {
      setOpenMenuFor(node.id);
      return;
    }

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedHeight = 240; // approximate Book Action Menu height
      const direction = spaceBelow < estimatedHeight ? "up" : "down";
      setMenuDirection(direction);

      const menuWidth = 192; // w-48 ≈ 192px
      const left = rect.right - menuWidth;
      const top =
        direction === "down"
          ? rect.bottom + 4
          : rect.top - estimatedHeight - 4;

      setMenuPosition({ top, left });
    }

    setOpenMenuFor(node.id);
    setEmojiPickerOpen(false);
  }

  const portalRoot =
    typeof document !== "undefined"
      ? document.getElementById("book-action-menu-root")
      : null;

  return (
    <div
      ref={setDropRef}
      className={`group relative transition-colors ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center py-1">
        <div
          style={{ paddingLeft: `${node.depth * 16}px` }}
          className={`flex items-center flex-1 rounded-card transition-colors ${
            isOver && !isDraggingBookmark
              ? "bg-emperor-surfaceStrong outline outline-2 outline-emperor-accent"
              : ""
          }`}
        >
          {/* Expand/collapse control — NOT draggable */}
          {hasChildren ? (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpanded(node.id);
              }}
              className="w-4 h-4 flex items-center justify-center text-emperor-muted hover:text-emperor-text mr-1"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-3 h-3" />
              ) : (
                <ChevronRightIcon className="w-3 h-3" />
              )}
            </button>
          ) : (
            <div className="w-4 h-4 mr-1" />
          )}

          {/* Draggable label */}
          <div
            ref={setDragRef}
            {...listeners}
            {...attributes}
            style={style}
            className="flex-1 cursor-move"
          >
            {isRenaming ? (
              <input
                className="w-full text-sm px-2 py-1 rounded-card bg-emperor-surface text-emperor-text outline-none"
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
              />
            ) : (
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  // Single click: select book only (no expand/collapse)
                  onBookClick(node.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                }}
                className={`flex items-center gap-1 text-left text-sm px-2 py-1 rounded-card transition-colors ${
                  isActive
                    ? "bg-emperor-surfaceStrong text-emperor-text"
                    : "hover:bg-emperor-surface text-emperor-text"
                }`}
              >
                {/* Optional icon (emoji) */}
                {localIcon && (
                  <span className="text-base leading-none">{localIcon}</span>
                )}
                <span className="truncate">{node.name}</span>
              </button>
            )}
          </div>

          {/* Nested page count */}
          <span className="text-xs text-emperor-muted ml-2">
            {nestedCount}
          </span>

          {/* Book Action Menu trigger (overflow 3‑dot) */}
          <div className="ml-1 relative">
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
      </div>

      {/* Inline sub‑book creation replaces the “New Book” entry for this node */}
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

      {/* Children with simple expand/collapse animation */}
      <div
        className={`transition-all duration-200 overflow-hidden ${
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
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
          />
        ))}
      </div>

      {/* Book Action Menu Overlay (portal) */}
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
                closeMenu();
              }}
            >
              <FolderOpenIcon className="w-4 h-4 text-emperor-muted" />
              <span>Open all bookmarks</span>
            </button>

            <button
              className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-emperor-surface"
              onClick={() => {
                setInlineCreateFor(node.id);
                closeMenu();
              }}
            >
              <PlusSmallIcon className="w-4 h-4 text-emperor-muted" />
              <span>Create nested collection</span>
            </button>

            <button className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-emperor-surface">
              <CursorArrowRaysIcon className="w-4 h-4 text-emperor-muted" />
              <span>Select</span>
            </button>

            <button
              className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-emperor-surface"
              onClick={() => {
                setIsRenaming(true);
                closeMenu();
              }}
            >
              <PencilSquareIcon className="w-4 h-4 text-emperor-muted" />
              <span>Rename</span>
            </button>

            <button
              className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-emperor-surface"
              onClick={() => setEmojiPickerOpen((prev) => !prev)}
            >
              <SparklesIcon className="w-4 h-4 text-emperor-muted" />
              <span>Change icon</span>
            </button>

            {emojiPickerOpen && <EmojiPicker onSelect={handleEmojiSelect} />}

            <button
              className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-emperor-surface"
              onClick={() => {
                onShareBook?.(node.id);
                closeMenu();
              }}
            >
              <ShareIcon className="w-4 h-4 text-emperor-muted" />
              <span>Share</span>
            </button>

            <button
              className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-red-500 hover:bg-emperor-surface"
              onClick={() => {
                onDeleteBook?.(node.id);
                closeMenu();
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

/**
 * BookTree Component
 * ------------------
 * Renders:
 *   - "All Pages" root button (explicit drop target: id = "library-root")
 *   - Nested book tree
 *   - Root‑level inline creation (replacing the “+ New Book” entry)
 */
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

  // Explicit "All Pages" drop target (used for bookmarks + books)
  const { setNodeRef: setRootRef, isOver: isRootOver } = useDroppable({
    id: "library-root"
  });

  const treeNodes = buildTree(books);

  const toggleExpanded = (id: string) => {
    setExpandedBooks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const autoExpandOnHover = (id: string) => {
    setExpandedBooks((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div className="relative space-y-1 p-1 rounded-card">
      {/* All Pages (explicit root drop target) */}
      <div
        ref={setRootRef}
        className={`w-full text-left text-sm px-2 py-1 rounded-card ${
          activeBookId === null
            ? "bg-emperor-surfaceStrong"
            : "hover:bg-emperor-surface"
        } ${isRootOver ? "outline outline-2 outline-emperor-accent" : ""}`}
        onClick={() => {
          onBookClick(null);
          setOpenMenuFor(null);
        }}
      >
        All Pages
      </div>

      {/* Book tree */}
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
        />
      ))}

      {/* Root‑level inline creation replaces the button */}
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
    </div>
  );
}
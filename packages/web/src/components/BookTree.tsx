import React, { useState, useEffect, useRef } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon
} from "@heroicons/react/24/outline";
import type { Book } from "../models/Book";

/**
 * BookTree.tsx
 * -------------
 * Hierarchical tree view of books with:
 *   - Inline creation of books/sub‑books
 *   - Expand/collapse with simple animation
 *   - Auto‑expand on drag hover
 *   - Drag‑and‑drop nesting (books as draggable + droppable)
 *   - Root‑level drop zone for books
 *   - Explicit "All Pages" drop target for bookmarks
 *   - Visual outlines for drop targets
 *
 * This component owns only UI state (expanded/collapsed, inline creation target).
 * All persistence and domain logic flows through App.tsx via props.
 */

type BookTreeProps = {
  /** Flat list of all books */
  books: Book[];
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
 * DraggableBookItem
 * -----------------
 * Renders a single book row:
 *   - Draggable as a book
 *   - Droppable as a book target
 *   - Expand/collapse if it has children
 *   - Inline sub‑book creation
 *
 * IMPORTANT:
 *   The draggable wrapper only wraps the label area,
 *   NOT the expand/collapse button, so expand/collapse works normally.
 */
type BookTreeItemProps = {
  node: TreeNode;
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
};

function DraggableBookItem({
  node,
  activeBookId,
  onBookClick,
  onCreateBook,
  onMoveBook,
  isBookExpanded,
  onToggleExpanded,
  isDraggingBookmark,
  autoExpandOnHover,
  inlineCreateFor,
  setInlineCreateFor
}: BookTreeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging
  } = useDraggable({ id: node.id });

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.id });

  const hasChildren = node.children.length > 0;
  const isActive = activeBookId === node.id;
  const isExpanded = isBookExpanded(node.id);

  // Auto‑expand when hovering a collapsed parent with a dragged book
  useEffect(() => {
    if (isOver && !isExpanded && !isDraggingBookmark) {
      autoExpandOnHover(node.id);
    }
  }, [isOver, isExpanded, isDraggingBookmark, node.id, autoExpandOnHover]);

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

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
        {/* Expand/collapse control */}
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
          <button
            onMouseDown={(e) => e.stopPropagation()}
            className={`flex-1 text-left text-sm px-2 py-1 rounded-card transition-colors ${
              isActive
                ? "bg-emperor-surfaceStrong text-emperor-text"
                : "hover:bg-emperor-surface text-emperor-text"
            }`}
            onClick={() => {
              if (hasChildren) onToggleExpanded(node.id);
              onBookClick(node.id);
            }}
          >
            {node.name}
          </button>
        </div>

        {/* + button */}
        {inlineCreateFor !== node.id && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-emperor-muted hover:text-emperor-text ml-1 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setInlineCreateFor(node.id);
            }}
          >
            <PlusIcon className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>


      {/* Inline sub‑book creation replaces the + button */}
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
          />
        ))}
      </div>
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
 *
 * NOTE:
 *   The experimental outer root zone droppable ("library-root-zone") has been
 *   removed to ensure per‑book droppables receive drag‑over events correctly.
 */
export default function BookTree({
  books,
  activeBookId,
  onBookClick,
  onCreateBook,
  onMoveBook,
  onBookmarkDrop,
  isDraggingBookmark
}: BookTreeProps) {
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set());
  const [inlineCreateFor, setInlineCreateFor] = useState<string | null>(null);

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
    <div className="space-y-1 p-1 rounded-card">
      {/* All Pages (explicit root drop target) */}
      <div
        ref={setRootRef}
        className={`w-full text-left text-sm px-2 py-1 rounded-card ${
          activeBookId === null
            ? "bg-emperor-surfaceStrong"
            : "hover:bg-emperor-surface"
        } ${isRootOver ? "outline outline-2 outline-emperor-accent" : ""}`}
        onClick={() => onBookClick(null)}
      >
        All Pages
      </div>

      {/* Book tree */}
      {treeNodes.map((node) => (
        <DraggableBookItem
          key={node.id}
          node={node}
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

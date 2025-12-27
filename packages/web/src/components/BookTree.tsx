import React, { useState, useEffect } from "react";
import {
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import type { Book } from "../models/Book";
import { BookTreeNode, buildBookTree } from "../models/BookTree";

/**
 * BookTreeItem Props
 */
type BookTreeItemProps = {
  node: BookTreeNode;
  activeBookId: string | null;
  onBookClick: (bookId: string | null) => void;
  onCreateBook: (parentId: string | null, name: string) => void;
  onMoveBook: (bookId: string, newParentId: string | null) => void;
  isBookExpanded: (bookId: string) => boolean;
  onToggleExpanded: (bookId: string) => void;
  isDraggingBookmark: boolean;
  autoExpandOnHover: (bookId: string) => void;
  inlineCreateFor: string | null;
  setInlineCreateFor: (id: string | null) => void;
};

/**
 * DraggableBookItem
 */
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
  setInlineCreateFor,
}: BookTreeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({ id: node.id });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: node.id,
  });

  const hasChildren = node.children.length > 0;
  const isActive = activeBookId === node.id;
  const isExpanded = isBookExpanded(node.id);

  // Auto-expand when dragging over a collapsed parent
  useEffect(() => {
    if (isOver && !isExpanded && !isDraggingBookmark) {
      autoExpandOnHover(node.id);
    }
  }, [isOver]);

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setDropRef}
      className={`group relative transition-colors ${
        isDragging ? "opacity-50" : ""
      } ${
        isOver && !isDraggingBookmark
          ? "outline outline-2 outline-emperor-accent"
          : ""
      }`}
      style={{ paddingLeft: `${node.depth * 16}px` }}
    >
      {/* Indentation line */}
      {node.depth > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-px bg-emperor-border"
          style={{ left: `${(node.depth - 1) * 16 + 8}px` }}
        />
      )}

      <div className="flex items-center py-1">
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded(node.id);
            }}
            className="w-4 h-4 flex items-center justify-center text-emperor-muted hover:text-emperor-text mr-1 flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-3 h-3" />
            ) : (
              <ChevronRightIcon className="w-3 h-3" />
            )}
          </button>
        ) : (
          <div className="w-4 h-4 mr-1 flex-shrink-0" />
        )}

        {/* Draggable area */}
        <div
          ref={setDragRef}
          style={style}
          {...listeners}
          {...attributes}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center flex-1 cursor-move"
        >
          {/* Book button */}
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

          {/* Add sub-book button */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-emperor-muted hover:text-emperor-text ml-1 transition-opacity flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setInlineCreateFor(node.id);
            }}
            title="Add sub-book"
          >
            <PlusIcon className="w-3 h-3" />
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
          }}
          onCancel={() => setInlineCreateFor(null)}
        />
      )}

      {/* Children with animation */}
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
 * InlineCreateInput
 */
function InlineCreateInput({
  depth,
  onSubmit,
  onCancel,
}: {
  depth: number;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");

  return (
    <div
      className="flex items-center py-1"
      style={{ paddingLeft: `${depth * 16 + 16}px` }}
    >
      <input
        autoFocus
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
 * BookTree
 */
export default function BookTree({
  books,
  activeBookId,
  onBookClick,
  onCreateBook,
  onMoveBook,
  onBookmarkDrop,
  isDraggingBookmark,
}: {
  books: Book[];
  activeBookId: string | null;
  onBookClick: (bookId: string | null) => void;
  onCreateBook: (parentId: string | null, name: string) => void;
  onMoveBook: (bookId: string, newParentId: string | null) => void;
  onBookmarkDrop?: (bookmarkId: string, bookId: string | null) => void;
  isDraggingBookmark: boolean;
}) {
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set());
  const [inlineCreateFor, setInlineCreateFor] = useState<string | null>(null);

  const { setNodeRef: setRootDropRef, isOver: isRootOver } = useDroppable({
    id: "library-root",
  });

  const treeNodes = buildBookTree(books);

  const toggleExpanded = (bookId: string) => {
    setExpandedBooks((prev) => {
      const next = new Set(prev);
      next.has(bookId) ? next.delete(bookId) : next.add(bookId);
      return next;
    });
  };

  const autoExpandOnHover = (bookId: string) => {
    setExpandedBooks((prev) => {
      if (prev.has(bookId)) return prev;
      const next = new Set(prev);
      next.add(bookId);
      return next;
    });
  };

  return (
    <div
      ref={setRootDropRef}
      className={`space-y-1 p-1 rounded-card transition-colors ${
        isRootOver ? "outline outline-2 outline-emperor-accent" : ""
      }`}
    >
      {/* All Pages */}
      <div
        className={`w-full text-left text-sm px-2 py-1 rounded-card ${
          activeBookId === null
            ? "bg-emperor-surfaceStrong"
            : "hover:bg-emperor-surface"
        }`}
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

      {/* Inline root-level create */}
      {inlineCreateFor === "root" && (
        <InlineCreateInput
          depth={0}
          onSubmit={(name) => {
            onCreateBook(null, name);
            setInlineCreateFor(null);
          }}
          onCancel={() => setInlineCreateFor(null)}
        />
      )}

      {/* New root book button */}
      <button
        className="w-full text-left text-sm px-2 py-1 rounded-card text-emperor-muted hover:bg-emperor-surface"
        onClick={() => setInlineCreateFor("root")}
      >
        + New Book
      </button>
    </div>
  );
}

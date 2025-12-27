import React from "react";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/24/outline";
import type { Book } from "../models/Book";
import { getBookAncestors } from "../models/BookTree";

/**
 * Breadcrumb Props
 * ----------------
 * Props for the Breadcrumb component.
 */
type BreadcrumbProps = {
  books: Book[];
  activeBookId: string | null;
  onBookClick: (bookId: string | null) => void;
};

/**
 * Breadcrumb
 * ----------
 * Navigation breadcrumb showing the path from root to the current book.
 */
export default function Breadcrumb({
  books,
  activeBookId,
  onBookClick,
}: BreadcrumbProps) {
  if (!activeBookId) return null;

  const ancestors = getBookAncestors(books, activeBookId);
  const currentBook = books.find(b => b.id === activeBookId);

  if (!currentBook) return null;

  const path = [...ancestors, currentBook];

  return (
    <div className="flex items-center space-x-1 text-sm text-emperor-muted mb-4 px-4">
      {/* Home/All Pages */}
      <button
        onClick={() => onBookClick(null)}
        className="flex items-center hover:text-emperor-text transition-colors"
      >
        <HomeIcon className="w-4 h-4 mr-1" />
        All Pages
      </button>

      {/* Path separators and books */}
      {path.map((book, index) => (
        <React.Fragment key={book.id}>
          <ChevronRightIcon className="w-4 h-4" />
          <button
            onClick={() => onBookClick(book.id)}
            className={`hover:text-emperor-text transition-colors ${
              index === path.length - 1 ? "text-emperor-text font-medium" : ""
            }`}
          >
            {book.name}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
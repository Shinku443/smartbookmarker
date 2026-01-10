import React, { useState } from "react";
import { Button } from "./ui/Button";
import { BookOpenIcon, CheckIcon } from "@heroicons/react/24/outline";
import type { Book } from "../models/Book";

/**
 * MultiSelectToolbar.tsx
 * ----------------------
 * Raindrop.io style toolbar for bookmark selection and bulk operations.
 * Features:
 *   - Book title with icon that turns into checkbox on hover
 *   - Click checkbox to select/deselect all pages in current book
 *   - Shows selection status (X pages in book / All pages in book)
 *   - Bulk operations for selected bookmarks
 */

type Props = {
  /** Number of currently selected bookmarks */
  selectedCount: number;
  /** Total number of bookmarks in the current view */
  totalCount: number;
  /** Name of the current book */
  currentBookName?: string;
  /** Whether all bookmarks in the current view are selected */
  allSelected: boolean;
  /** Callback to toggle select all bookmarks in current book */
  onToggleSelectAll: () => void;
  /** Callback to delete all selected bookmarks */
  onDeleteSelected: () => void;
  /** Callback to tag all selected bookmarks */
  onTagSelected: () => void;
  /** Callback to pin all selected bookmarks */
  onPinSelected: () => void;
  /** Callback to unpin all selected bookmarks */
  onUnpinSelected: () => void;
  /** Array of books for move operations */
  books: Book[];
  /** Callback to move selected bookmarks to a book */
  onMoveSelectedToBook: (bookId: string | null) => void;
};

/**
 * MultiSelectToolbar Component
 * ----------------------------
 * Raindrop.io style toolbar with book selection and bulk operations.
 *
 * @param props - The component props
 * @returns JSX element for the multi-select toolbar
 */
export default function MultiSelectToolbar({
  selectedCount,
  totalCount,
  currentBookName = "All Pages",
  allSelected,
  onToggleSelectAll,
  onDeleteSelected,
  onTagSelected,
  onPinSelected,
  onUnpinSelected,
  books,
  onMoveSelectedToBook
}: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const hasSelection = selectedCount > 0;

  /**
   * handleMoveChange
   * -----------------
   * Handles the book selection dropdown change.
   * Moves selected bookmarks to the chosen book and resets the dropdown.
   *
   * @param e - The change event from the select element
   */
  function handleMoveChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value === "") return; // Ignore placeholder option
    if (value === "none") {
      onMoveSelectedToBook(null); // Move to root (no book)
    } else {
      onMoveSelectedToBook(value); // Move to specific book
    }
    e.target.value = ""; // Reset dropdown to placeholder
  }

  // Determine selection status text
  const selectionText = allSelected
    ? "All pages in book"
    : `${selectedCount} pages in book`;

  return (
    <div className="flex items-center justify-between mb-3 text-sm">
      {/* Book selection header (Raindrop.io style) */}
      <div className="flex items-center gap-3">
        {/* Book icon with checkbox overlay on hover */}
        <div
          className="relative flex items-center gap-2 cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={onToggleSelectAll}
        >
          {/* Book icon */}
          <div className="w-5 h-5 text-emperor-muted">
            <BookOpenIcon />
          </div>

          {/* Checkbox overlay (visible on hover or when all selected) */}
          {(isHovered || allSelected) && (
            <div className="absolute left-0 w-5 h-5 bg-emperor-surface border border-emperor-border rounded flex items-center justify-center">
              {allSelected && <CheckIcon className="w-4 h-4 text-emperor-accent" />}
            </div>
          )}

          {/* Book name and selection status */}
          <div className="flex flex-col">
            <span className="font-medium text-emperor-text">{currentBookName}</span>
            {hasSelection && (
              <span className="text-xs text-emperor-muted">{selectionText}</span>
            )}
          </div>
        </div>
      </div>

      {/* Bulk action buttons - only shown when items are selected */}
      {hasSelection && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="danger" onClick={onDeleteSelected}>
            Delete
          </Button>
          <Button size="sm" variant="subtle" onClick={onTagSelected}>
            Tag
          </Button>
          <Button size="sm" variant="subtle" onClick={onPinSelected}>
            Pin
          </Button>
          <Button size="sm" variant="subtle" onClick={onUnpinSelected}>
            Unpin
          </Button>

          {/* Book move dropdown */}
          <select
            className="bg-emperor-surface border border-emperor-border rounded-card px-2 py-1 text-xs"
            defaultValue=""
            onChange={handleMoveChange}
          >
            <option value="" disabled>
              Move to book…
            </option>
            <option value="none">No Book</option>
            {/* Available books */}
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
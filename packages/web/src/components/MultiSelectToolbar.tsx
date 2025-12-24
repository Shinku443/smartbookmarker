import React from "react";
import { Button } from "./ui/Button";
import type { Book } from "../models/Book";

/**
 * MultiSelectToolbar.tsx
 * ----------------------
 * A toolbar that appears when bookmarks are selected, providing bulk operations.
 * Offers actions like delete, tag, pin/unpin, and move to book for multiple bookmarks.
 * Only renders when there is an active selection.
 */

/**
 * Props Interface
 * ---------------
 * Defines the properties for the MultiSelectToolbar component.
 */
type Props = {
  /** Number of currently selected bookmarks */
  selectedCount: number;
  /** Total number of bookmarks in the current view */
  totalCount: number;
  /** Callback to select all bookmarks */
  onSelectAll: () => void;
  /** Callback to clear all selections */
  onClearAll: () => void;
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
 * Renders a toolbar with bulk operations for selected bookmarks.
 * Conditionally shows action buttons only when bookmarks are selected.
 *
 * @param props - The component props
 * @returns JSX element for the multi-select toolbar
 */
export default function MultiSelectToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearAll,
  onDeleteSelected,
  onTagSelected,
  onPinSelected,
  onUnpinSelected,
  books,
  onMoveSelectedToBook
}: Props) {
  // Only show action buttons when there are selected items
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

  return (
    <div className="flex items-center justify-between mb-3 text-sm">
      {/* Selection status and basic controls */}
      <div className="flex items-center gap-2">
        <span className="text-emperor-muted">
          {selectedCount} selected of {totalCount}
        </span>
        <Button size="sm" variant="subtle" onClick={onSelectAll}>
          Select all
        </Button>
        <Button size="sm" variant="subtle" onClick={onClearAll}>
          Clear
        </Button>
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

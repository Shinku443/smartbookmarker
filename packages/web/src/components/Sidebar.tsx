import React from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import type { Book } from "../models/Book";

/**
 * Sidebar.tsx
 * ------------
 * The Sidebar component serves as the primary navigation and control panel for the Emperor Library application.
 * It provides:
 *   - Search functionality for filtering bookmarks
 *   - Book (group) management and selection
 *   - Tag filtering for bookmarks
 *   - Import/Export capabilities for data management
 *   - Access to settings and book manager modals
 *
 * The sidebar is designed to be collapsible and responsive, allowing users to efficiently navigate
 * and organize their bookmark collections. It integrates tightly with the main App component
 * through props that handle state changes and user interactions.
 */

/**
 * Props Interface
 * ---------------
 * Defines the properties required by the Sidebar component.
 * These props connect the sidebar to the application's state management and event handlers.
 */
type Props = {
  /** Callback to open the add bookmark modal */
  onAdd: () => void;

  /** Current search query string for filtering bookmarks */
  search: string;
  /** Function to update the search query */
  setSearch: (v: string) => void;

  /** Array of all available tag labels for filtering */
  tags: string[];
  /** Currently active tag filter (null means no tag filter) */
  activeTag: string | null;
  /** Function to set the active tag filter */
  setActiveTag: (tag: string | null) => void;

  /** Array of all books (groups) in the library */
  books: Book[];
  /** Currently active book ID for filtering (null means show all pages) */
  activeBookId: string | null;
  /** Function to set the active book filter */
  setActiveBookId: (id: string | null) => void;
  /** Function to create a new book with the given name */
  onCreateBook: (name: string) => void;

  /** Handler for importing HTML bookmark files */
  onImport: (e: any) => void;
  /** Handler for exporting the library as JSON */
  onExport: () => void;
  /** Callback to open the settings screen */
  onOpenSettings: () => void;
  /** Callback to open the book manager modal */
  onOpenBookManager: () => void;
};

/**
 * Sidebar Component
 * -----------------
 * Renders the sidebar with search, book navigation, tag filters, and utility actions.
 * The component is stateless and relies on props for all data and interactions.
 *
 * @param props - The properties object containing all necessary data and handlers
 * @returns JSX element representing the sidebar
 */
export default function Sidebar({
  onAdd,
  search,
  setSearch,
  tags,
  activeTag,
  setActiveTag,
  books,
  activeBookId,
  setActiveBookId,
  onCreateBook,
  onImport,
  onExport,
  onOpenSettings,
  onOpenBookManager
}: Props) {
  /**
   * handleNewBook
   * --------------
   * Prompts the user for a new book name and creates the book if a valid name is provided.
   * This function handles the creation of new book groups for organizing bookmarks.
   *
   * Uses the browser's native prompt() for simplicity, though in a production app
   * this might be replaced with a more sophisticated modal dialog.
   */
  function handleNewBook() {
    const name = prompt("New book name?");
    if (!name) return; // Exit if user cancels or provides empty input
    onCreateBook(name.trim()); // Trim whitespace and create the book
  }

  return (
    <div className="h-full flex flex-col bg-emperor-sidebar border-r border-emperor-border">
      {/* Header Section */}
      {/* Contains the title, add button, and search input */}
      <div className="p-4 border-b border-emperor-border">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-lg font-semibold">Library</h1>
          <Button size="sm" onClick={onAdd}>
            Add Page
          </Button>
        </div>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pages…"
        />
      </div>

      {/* Main Content Area */}
      {/* Scrollable section containing books, tags, and import/export */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        {/* Books Section */}
        {/* Displays all books with options to select, manage, or create new ones */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-emperor-muted text-xs uppercase tracking-wide">
              Books
            </h3>
            <button
              className="text-xs text-emperor-muted hover:text-emperor-text"
              onClick={onOpenBookManager}
            >
              Manage
            </button>
          </div>

          <div className="space-y-1">
            {/* "All Pages" button - shows bookmarks from all books */}
            <button
              className={`w-full text-left text-sm px-2 py-1 rounded-card ${
                activeBookId === null
                  ? "bg-emperor-surfaceStrong" // Highlighted when no book is selected
                  : "hover:bg-emperor-surface" // Hover effect for inactive state
              }`}
              onClick={() => setActiveBookId(null)}
            >
              All Pages
            </button>

            {/* Individual book buttons - one for each book in the library */}
            {books.map((b) => (
              <button
                key={b.id}
                className={`w-full text-left text-sm px-2 py-1 rounded-card ${
                  activeBookId === b.id
                    ? "bg-emperor-surfaceStrong" // Highlighted when this book is active
                    : "hover:bg-emperor-surface" // Hover effect for inactive state
                }`}
                onClick={() => setActiveBookId(b.id)}
              >
                {b.name}
              </button>
            ))}

            {/* "New Book" button - triggers creation of a new book group */}
            <button
              className="w-full text-left text-sm px-2 py-1 rounded-card text-emperor-muted hover:bg-emperor-surface"
              onClick={handleNewBook}
            >
              + New Book
            </button>
          </div>
        </div>

        {/* Tags Section */}
        {/* Displays tag chips for filtering bookmarks by tags */}
        <div className="px-4">
          <h3 className="text-emperor-muted text-xs uppercase tracking-wide mb-2">
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                className={`text-xs px-2 py-1 rounded-full border ${
                  activeTag === tag
                    ? "bg-emperor-surfaceStrong border-emperor-border" // Active tag styling
                    : "border-emperor-border hover:bg-emperor-surface" // Inactive tag styling with hover
                }`}
                onClick={() =>
                  setActiveTag(activeTag === tag ? null : tag) // Toggle tag filter
                }
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Import/Export Section */}
        {/* Provides tools for data import and export */}
        <div className="px-4">
          <h3 className="text-emperor-muted text-xs uppercase tracking-wide mb-2">
            Import / Export
          </h3>
          <div className="flex flex-col gap-2">
            {/* HTML Import - allows importing bookmarks from HTML files */}
            <label className="text-sm">
              <span className="mr-2">Import HTML</span>
              <input type="file" accept=".html" onChange={onImport} />
            </label>
            {/* JSON Export - exports the entire library as JSON */}
            <Button size="sm" variant="subtle" onClick={onExport}>
              Export JSON
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      {/* Contains the settings button */}
      <div className="p-4 border-t border-emperor-border">
        <Button size="sm" variant="subtle" onClick={onOpenSettings}>
          Settings
        </Button>
      </div>
    </div>
  );
}

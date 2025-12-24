/**
 * SearchBar.tsx
 * --------------
 * A simple search input component for filtering bookmarks.
 * Provides a text input that searches across title, URL, and tags.
 * Used in the sidebar for bookmark filtering.
 */

/**
 * SearchBar Component
 * -------------------
 * Renders a search input field for filtering bookmarks.
 * Accepts current search value and change handler as props.
 *
 * @param value - The current search query string
 * @param onChange - Callback function for search input changes
 * @returns JSX element for the search input
 */
export default function SearchBar({ value, onChange }: any) {
  return (
    <input
      placeholder="Search title, URL, tags…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: 6 }}
    />
  );
}
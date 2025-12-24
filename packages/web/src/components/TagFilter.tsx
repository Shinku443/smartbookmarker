/**
 * TagFilter.tsx
 * --------------
 * A component for filtering bookmarks by tags.
 * Displays an "All" button and individual tag buttons for selection.
 * Clicking a tag toggles filtering, clicking "All" shows all bookmarks.
 */

/**
 * TagFilter Component
 * -------------------
 * Renders a set of buttons for tag-based filtering of bookmarks.
 * Includes an "All" button to clear tag filters and individual tag buttons.
 *
 * @param tags - Array of available tag labels
 * @param activeTag - Currently active tag filter (null means no filter)
 * @param setActiveTag - Function to set the active tag filter
 * @returns JSX element for the tag filter buttons
 */
export default function TagFilter({ tags, activeTag, setActiveTag }: any) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* "All" button - clears tag filter */}
      <button
        onClick={() => setActiveTag(null)}
        className={`px-3 py-1 rounded-pill text-sm ${
          activeTag === null
            ? "bg-emperor-primary text-black" // Active state styling
            : "bg-emperor-surfaceStrong text-emperor-text" // Inactive state styling
        }`}
      >
        All
      </button>

      {/* Individual tag buttons */}
      {tags.map((tag: string) => (
        <button
          key={tag}
          onClick={() => setActiveTag(tag === activeTag ? null : tag)} // Toggle tag filter
          className={`px-3 py-1 rounded-pill text-sm ${
            activeTag === tag
              ? "bg-emperor-primary text-black" // Active tag styling
              : "bg-emperor-surfaceStrong text-emperor-text" // Inactive tag styling
          }`}
        >
          #{tag}
        </button>
      ))}
    </div>
  );
}
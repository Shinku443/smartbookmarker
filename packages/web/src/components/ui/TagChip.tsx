import React from "react";
import clsx from "clsx";

/**
 * TagChip.tsx
 * ------------
 * Small, clickable chip component for rendering a tag label.
 *
 * Used in:
 *   - BookmarkCard (to show a bookmark's tags)
 *   - Any tag‑based filtering UI where a "pill" is appropriate
 *
 * Supports:
 *   - Active state styling (when the tag is currently selected as a filter)
 *   - Click handler for toggling filters or triggering actions
 */

/**
 * TagChipProps Interface
 * ----------------------
 * Defines the properties accepted by TagChip.
 */
type TagChipProps = {
  /** Tag label to display (without hash prefix) */
  label: string;

  /** Whether this tag is currently active/selected */
  active?: boolean;

  /** Optional click handler for tag interactions */
  onClick?: () => void;
};

/**
 * TagChip Component
 * -----------------
 * Renders a small, rounded chip with a hash prefix in front of the label.
 * Applies different styles when active vs inactive.
 */
export function TagChip({ label, active = false, onClick }: TagChipProps) {
  return (
    <span
      onClick={onClick}
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs border cursor-pointer transition",
        active
          ? "bg-emperor-accent text-white border-emperor-accent"
          : "bg-emperor-surfaceStrong text-emperor-text border-emperor-border hover:bg-emperor-surface"
      )}
    >
      #{label}
    </span>
  );
}
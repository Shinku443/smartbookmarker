import React from "react";

/**
 * TagChip.tsx
 * ------------
 * A small, clickable chip component for displaying individual tags.
 * Shows tag labels with a hash prefix and provides hover interactions.
 * Used in bookmark cards and tag filter interfaces.
 */

/**
 * TagChipProps Interface
 * ----------------------
 * Defines the properties for the TagChip component.
 */
type TagChipProps = {
  /** The tag label to display */
  label: string;
  /** Optional click handler for tag interactions */
  onClick?: () => void;
};

/**
 * TagChip Component
 * -----------------
 * Renders a small, rounded chip displaying a tag with hash prefix.
 * Supports click interactions for filtering or other tag-related actions.
 *
 * @param props - The tag chip props
 * @returns JSX element for the tag chip
 */
export function TagChip({ label, onClick }: TagChipProps) {
  return (
    <span
      onClick={onClick}
      className="
        inline-flex items-center
        bg-emperor-surfaceStrong
        text-emperor-text
        border border-emperor-border
        px-2 py-0.5
        rounded-full
        text-xs
        cursor-pointer
        hover:bg-emperor-surface
        transition
      "
    >
      #{label}
    </span>
  );
}
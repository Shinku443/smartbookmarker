import React from "react";
import clsx from "clsx";

/**
 * TagChip.tsx
 * ------------
 * A small, clickable chip component for rendering a tag label.
 *
 * Now supports:
 *   - Ref forwarding
 *   - Automatic element type:
 *       • <button> when onClick is provided
 *       • <span> when not interactive
 *   - Better accessibility + keyboard support
 */

type TagChipProps = {
  /** Tag label to display (without hash prefix) */
  label: string;

  /** Whether this tag is currently active/selected */
  active?: boolean;

  /** Optional click handler for tag interactions */
  onClick?: () => void;

  /** Optional className passthrough */
  className?: string;
};

export const TagChip = React.forwardRef<
  HTMLSpanElement | HTMLButtonElement,
  TagChipProps
>(function TagChip({ label, active = false, onClick, className }, ref) {
  const isInteractive = typeof onClick === "function";

  const baseClasses = clsx(
    "inline-flex items-center px-2 py-0.5 rounded-full text-xs border transition",
    active
      ? "bg-emperor-accent text-white border-emperor-accent"
      : "bg-emperor-surfaceStrong text-emperor-text border-emperor-border hover:bg-emperor-surface",
    className
  );

  if (isInteractive) {
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        onClick={onClick}
        className={clsx(baseClasses, "cursor-pointer")}
        type="button"
      >
        #{label}
      </button>
    );
  }

  return (
    <span
      ref={ref as React.Ref<HTMLSpanElement>}
      className={clsx(baseClasses, "cursor-default")}
    >
      #{label}
    </span>
  );
});

TagChip.displayName = "TagChip";
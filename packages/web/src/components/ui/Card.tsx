import React from "react";
import clsx from "clsx";

/**
 * Card
 * ----
 * A simple container component used throughout Emperor.
 * 
 * This version forwards its ref to the underlying <div>,
 * which is required for @dnd-kit sortable items.
 *
 * No styling or API changes from your original version.
 */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          "bg-emperor-surface rounded-card p-4 shadow-sm border border-emperor-border",
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

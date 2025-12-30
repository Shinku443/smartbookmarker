import React from "react";
import clsx from "clsx";

/**
 * Button.tsx
 * -----------
 * A reusable button component with multiple variants and sizes.
 * Supports ref forwarding for dropdowns, menus, and focus management.
 */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Visual style variant for the button */
  variant?: "primary" | "secondary" | "subtle" | "danger";
  /** Size variant for the button */
  size?: "sm" | "md" | "lg";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, ...props }, ref) => {
    // Base styles applied to all buttons
    const base =
      "rounded-card font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emperor-primary";

    // Variant-specific styles
    const variants = {
      primary: "bg-emperor-primary text-black hover:bg-emperor-primaryStrong",
      secondary:
        "bg-emperor-surfaceStrong text-emperor-text hover:bg-emperor-surface",
      subtle: "bg-transparent text-emperor-text hover:bg-emperor-surface",
      danger: "bg-emperor-danger text-white hover:bg-red-600"
    };

    // Size-specific styles
    const sizes = {
      sm: "px-2 py-1 text-sm",
      md: "px-3 py-2",
      lg: "px-4 py-3 text-lg"
    };

    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
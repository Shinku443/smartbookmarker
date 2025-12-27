import React, { forwardRef } from "react";
import clsx from "clsx";

/**
 * Input.tsx
 * ----------
 * A styled input component for text entry.
 * Provides consistent styling with focus states and theme integration.
 * Used for text inputs, search fields, and form inputs throughout the app.
 *
 * Now supports ref forwarding for auto‑focus and imperative access.
 */

/**
 * Input Component
 * ---------------
 * Renders a styled text input with focus ring and theme-aware colors.
 * Accepts all standard input HTML attributes.
 *
 * @param props - HTML input attributes including className
 * @returns JSX element for the styled input
 */
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={clsx(
          "w-full bg-emperor-surfaceStrong text-emperor-text border border-emperor-border rounded-card px-3 py-2 focus:ring-2 focus:ring-emperor-primary focus:outline-none",
          className
        )}
        {...props}
      />
    );
  }
);
